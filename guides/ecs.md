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
  constructor(public dx: number, public dy: number) { super(); }
}

// 2. Define a system
class MovementSystem extends ECS.System {
  private query: ECS.Query;

  initialize() {
    this.query = this.world.createQuery([Position, Velocity]);
  }

  execute(delta: number) {
    this.query.entities.forEach((entity) => {
      const pos = entity.getComponent(Position);
      const vel = entity.getComponent(Velocity);
      pos.x += vel.dx * delta;
      pos.y += vel.dy * delta;
    });
  }
}

// 3. Create a world and register systems
const world = new ECS.World();
world.registerSystem(new MovementSystem());

// 4. Create entities
const player = world.createEntity();
player.addComponent(new Position(100, 200));
player.addComponent(new Velocity(2, 0));

// 5. Run via RenderLoop
new RenderLoop((loop) => {
  world.execute(loop.delta);
});
```

## World

```typescript
const world = new ECS.World();

// Create an entity and add it to the world in one step
const entity = world.createEntity();

// Add a pre-created entity
const existing = new ECS.Entity();
world.addEntity(existing);

// Remove an entity (also removes it from all queries)
world.removeEntity(entity);

// Re-evaluate an entity against all queries after changing its components
world.updateEntity(entity);

// Run all registered systems
world.execute(delta);
```

## Entity

```typescript
const entity = world.createEntity();

// Add a component (replaces any existing component of the same class)
entity.addComponent(new Position(0, 0));

// Read a component (returns typed instance)
const pos = entity.getComponent(Position); // type: Position

// Check presence before accessing
if (entity.hasComponent(Velocity)) {
  const vel = entity.getComponent(Velocity);
}

// Remove a component (call world.updateEntity() to update queries)
entity.removeComponent(Velocity);
world.updateEntity(entity);
```

## System

Systems must extend `ECS.System` and implement `execute(delta)`. The `world` reference is
injected when the system is registered via `world.registerSystem()`.

```typescript
class RenderSystem extends ECS.System {
  constructor(private renderer: Canvas2DRenderer) { super(); }

  initialize() {
    // Called once after world is assigned — good place to create queries
    this.query = this.world.createQuery([Position, Sprite]);
  }

  execute(delta: number) {
    this.query.entities.forEach((entity) => {
      const pos = entity.getComponent(Position);
      // ... draw sprite at pos.x, pos.y
    });
  }
}
```

## Query

Queries are live sets maintained by the world. When an entity is added/removed or its
components change (via `world.updateEntity()`), the query is automatically updated.

```typescript
// Create a query for entities that have both Position and Health
const query = world.createQuery([Position, Health]);

// Iterate matched entities
query.entities.forEach((entity) => {
  const hp = entity.getComponent(Health);
  if (hp.current <= 0) world.removeEntity(entity);
});
```

Queries are best created inside `System.initialize()` so they are scoped to the world.

## Removing Components at Runtime

```typescript
const entity = world.createEntity();
entity.addComponent(new Velocity(5, 0));
entity.addComponent(new Position(0, 0));

// Stop the entity from moving
entity.removeComponent(Velocity);
world.updateEntity(entity); // updates all queries to reflect the change
```

## Multiple Systems

Systems execute in registration order.

```typescript
world.registerSystem(new InputSystem(input));
world.registerSystem(new PhysicsSystem());
world.registerSystem(new CollisionSystem());
world.registerSystem(new RenderSystem(renderer));
```

## API Reference

### `World`
- `createEntity(): Entity`
- `addEntity(entity): void`
- `removeEntity(entity): void`
- `updateEntity(entity): void` — re-evaluates against all queries
- `registerSystem(system): void`
- `createQuery(componentClasses[]): Query`
- `execute(delta): void`

### `Entity`
- `addComponent(component): void`
- `getComponent<T>(class): T`
- `hasComponent(class): boolean`
- `removeComponent(class): void`

### `System` (abstract)
- `world: World` — injected on registration
- `initialize(): void` — override to set up queries
- `execute(delta: number): void` — implement game logic here

### `Query`
- `entities: Set<Entity>` — live set of matched entities
