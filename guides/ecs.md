# ECS Usage Guide

The Entity Component System (`EntityComponentSystem`) drives all game logic in Craters. It
separates **data** (`Component`) from **behaviour** (`System`), keeping code modular and
composable. Import the namespace as `ECS` for concise usage.

## Core Concepts

| Class | Role |
|---|---|
| `Component` | Plain data container attached to an entity |
| `Entity` | Container that holds a map of components |
| `System` | Logic that runs every tick over a set of entities |
| `Query` | A filtered view of entities that have required components |
| `World` | The root object — owns entities, systems, and queries |

## Minimal Setup

```typescript
import { EntityComponentSystem as ECS, RenderLoop } from "craters";

// 1. Define components
class Position extends ECS.Component {
  constructor(public x: number, public y: number) { super(); }
}
class Velocity extends ECS.Component {
  constructor(public dx: number, public dy: number) { super(); } // px/s
}

// 2. Define a system
class MovementSystem extends ECS.System {
  private query!: ECS.Query; // assigned in initialize()

  initialize() {
    this.query = this.world!.createQuery([Position, Velocity]);
  }

  execute(dt: number) { // dt in seconds
    this.query.entities.forEach((entity) => {
      // The query guarantees both components are present
      const pos = entity.getComponent(Position)!;
      const vel = entity.getComponent(Velocity)!;
      pos.x += vel.dx * dt;
      pos.y += vel.dy * dt;
    });
  }
}

// 3. Create a world and register systems
const world = new ECS.World();
world.registerSystem(new MovementSystem());

// 4. Create entities: add components first, then add the entity to the world
const player = new ECS.Entity();
player.addComponent(new Position(100, 200));
player.addComponent(new Velocity(120, 0)); // 120 px/s
world.addEntity(player); // matched against queries here

// 5. Run via RenderLoop (the callback runs once per fixed step)
new RenderLoop((loop) => {
  world.execute(loop.deltaSeconds);
});
```

Queries are only re-evaluated by `world.addEntity()` (and `createEntity()`), `world.removeEntity()`
and `world.updateEntity()`. `addComponent()` and `removeComponent()` don't notify the world, which
is why the example adds components before calling `world.addEntity()`.

## World

```typescript
const world = new ECS.World();

// Build an entity, then add it; it is matched against queries here
const entity = new ECS.Entity();
entity.addComponent(new Position(0, 0));
world.addEntity(entity);

// createEntity() creates and adds in one step, but matches the entity while it is
// still empty, so call updateEntity() once its components are added
const other = world.createEntity();
other.addComponent(new Position(10, 10));
world.updateEntity(other);

// Re-evaluate an entity against all queries after changing its components
world.updateEntity(entity);

// Remove an entity (also removes it from all queries)
world.removeEntity(entity);

// Run all registered systems, in registration order
world.execute(dt);
```

## Entity

```typescript
const entity = new ECS.Entity();

// Add a component (replaces any existing component of the same class)
entity.addComponent(new Position(0, 0));
entity.addComponent(new Velocity(0, 0));
world.addEntity(entity);

// Read a component: returns Position | undefined
const pos = entity.getComponent(Position);
if (pos) pos.x += 1;

// hasComponent() checks presence but doesn't narrow getComponent()'s type
if (entity.hasComponent(Velocity)) {
  const vel = entity.getComponent(Velocity)!;
}

// Remove a component, then update queries (the entity is in the world)
entity.removeComponent(Velocity);
world.updateEntity(entity);
```

Components are keyed by their exact class (`component.constructor`), so an instance of a subclass is
not found by `getComponent(BaseClass)`.

## System

Systems must extend `ECS.System` and implement `execute(delta)`. The `world` reference is
injected when the system is registered via `world.registerSystem()`. Until then it is `null`
(typed `World | null`), so use `this.world!` inside `initialize()` and `execute()`.

```typescript
import { EntityComponentSystem as ECS, Canvas2DRenderer } from "craters";

class Renderable extends ECS.Component {
  constructor(public w: number, public h: number, public color: string) { super(); }
}

class RenderSystem extends ECS.System {
  private query!: ECS.Query;

  constructor(private renderer: Canvas2DRenderer) { super(); }

  initialize() {
    // Called once, right after world is assigned — good place to create queries
    this.query = this.world!.createQuery([Position, Renderable]);
  }

  execute(dt: number) {
    this.query.entities.forEach((entity) => {
      const pos = entity.getComponent(Position)!;
      const r = entity.getComponent(Renderable)!;
      this.renderer.drawRect(pos.x, pos.y, r.w, r.h, r.color, true);
    });
  }
}
```

## Query

A query's `entities` set is maintained by the world. It is updated when an entity is added or
removed, and when you call `world.updateEntity()` after changing an entity's components.

```typescript
// Create a query for entities that have both Position and Health
const query = world.createQuery([Position, Health]);

// Iterate matched entities (removing the current entity while iterating is safe)
query.entities.forEach((entity) => {
  const hp = entity.getComponent(Health)!;
  if (hp.current <= 0) world.removeEntity(entity);
});

// One-off filter: returns a new Set<Entity> and registers nothing
const remaining = world.queryOnce([Collectible]).size;

// Stop tracking a persistent query you no longer need
world.removeQuery(query); // true if it was registered
```

`createQuery()` registers a **persistent** query: the world keeps it and checks it on every entity
add, remove and update. Create these once, in `System.initialize()`, and reuse them. A query created
every frame is never released and slows every add/remove. Use `world.queryOnce()` for one-off counts
and filters. `removeQuery()` stops a query from being tracked. Its `entities` set keeps its last
contents and is no longer updated.

## Removing Components at Runtime

```typescript
const entity = new ECS.Entity();
entity.addComponent(new Velocity(5, 0));
entity.addComponent(new Position(0, 0));
world.addEntity(entity); // matched by MovementSystem's [Position, Velocity] query

// Stop the entity from moving
entity.removeComponent(Velocity);
world.updateEntity(entity); // drops it from the [Position, Velocity] query
```

## Multiple Systems

Systems execute in registration order. There is no priority setting and no way to unregister a
system.

```typescript
world.registerSystem(new InputSystem(input));
world.registerSystem(new PhysicsSystem());
world.registerSystem(new CollisionSystem());
world.registerSystem(new RenderSystem(renderer));
```

## Notes

- `world.execute(delta)` passes `delta` unchanged to every system. With `RenderLoop`, pass
  `loop.deltaSeconds` (seconds), which is also what `RigidBody.integrate()` expects. `loop.delta` is
  in milliseconds.
- `updateEntity()` does nothing for an entity that isn't in the world (never added, or removed).
  To bring a removed entity back, call `world.addEntity()` again.

## API Reference

### `World`
- `entities: Set<Entity>` — every entity in the world
- `systems: System[]` — registered systems, in execution order
- `queries: Set<Query>` — registered persistent queries
- `createEntity(): Entity` — creates an entity and adds it (matched while still empty)
- `addEntity(entity: Entity): void` — adds and matches against all queries
- `removeEntity(entity: Entity): void` — removes from the world and all queries
- `updateEntity(entity: Entity): void` — re-evaluates against all queries; no-op if the entity isn't in the world
- `registerSystem(system: System): void` — sets `system.world`, calls `initialize()`, appends
- `createQuery(requiredComponents: Function[]): Query` — registers a persistent query and matches existing entities
- `removeQuery(query: Query): boolean` — stops tracking a query; `true` if it was registered
- `queryOnce(requiredComponents: Function[]): Set<Entity>` — one-off match, registers nothing
- `execute(delta: number): void` — calls each system's `execute(delta)` in registration order

### `Entity`
- `components: Map<Function, Component>` — components keyed by class
- `addComponent(component: Component): void` — replaces a component of the same class
- `getComponent<T>(componentClass: ComponentClass<T>): T | undefined`
- `hasComponent(componentClass: Function): boolean`
- `removeComponent(componentClass: Function): void`

### `System` (abstract)
- `world: World | null` — `null` until set by `world.registerSystem()`
- `initialize(): void` — called once on registration, after `world` is set; override to set up queries
- `execute(delta: number): void` — abstract; implement game logic here

### `Query`
- `new Query(requiredComponents: Function[])` — normally created via `world.createQuery()`
- `entities: Set<Entity>` — matched entities, kept up to date while the query is registered
- `matches(entity: Entity): boolean`
- `addEntityIfMatches(entity: Entity): void`
- `removeEntity(entity: Entity): void`

### `ComponentClass<T>`
- `type ComponentClass<T extends Component> = new (...args: any[]) => T`
