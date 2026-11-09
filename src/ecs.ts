/** Base class for component data. Extend it with plain data fields. */
export abstract class Component {}

/** Constructor type of a component class, used as the lookup key by {@link Entity.getComponent}. */
export type ComponentClass<T extends Component> = new(...args: any[]) => T;

/**
 * A container of components, keyed by each component's exact class
 * (`component.constructor`). A subclass instance is not found by its base class.
 *
 * Adding or removing components does not notify any {@link World}: if the entity
 * is already in a world, call {@link World.updateEntity} afterwards so queries
 * see the change.
 */
export class Entity {
  /** Components keyed by their constructor. */
  public components: Map < Function, Component > = new Map();

  /** Adds a component, replacing any existing component of the same class. Does not update queries. */
  public addComponent<T extends Component>(component: T): void {
    this.components.set(component.constructor, component);
  }

  /** Returns the component of the given class, or `undefined` if the entity has none. */
  public getComponent<T extends Component>(componentClass: ComponentClass<T>): T | undefined {
    return this.components.get(componentClass) as T | undefined;
  }

  /** Whether the entity has a component of the given class. Does not narrow {@link getComponent}'s type. */
  public hasComponent(componentClass: Function): boolean {
    return this.components.has(componentClass);
  }

  /** Removes the component of the given class, if present. Does not update queries. */
  public removeComponent(componentClass: Function): void {
    this.components.delete(componentClass);
  }
}

/**
 * The set of entities that have all of the required component classes.
 * Usually created through {@link World.createQuery}, which keeps `entities` up to date.
 */
export class Query {
  /** Matched entities. Kept up to date by the world while the query is registered. */
  public entities: Set < Entity > = new Set();
  private requiredComponents: Set < Function > ;

  constructor(requiredComponents: Function[]) {
    this.requiredComponents = new Set(requiredComponents);
  }

  /** Whether the entity has every required component. */
  public matches(entity: Entity): boolean {
    for (const required of this.requiredComponents) {
      if (!entity.hasComponent(required)) {
        return false;
      }
    }
    return true;
  }

  /** Adds the entity to `entities` if it {@link matches}. */
  public addEntityIfMatches(entity: Entity): void {
    if (this.matches(entity)) {
      this.entities.add(entity);
    }
  }

  /** Removes the entity from `entities`. */
  public removeEntity(entity: Entity): void {
    this.entities.delete(entity);
  }
}

/** Base class for game logic. Register it with {@link World.registerSystem}. */
export abstract class System {
  /** The world this system is registered with; `null` until {@link World.registerSystem} sets it. */
  public world: World | null = null;
  /** Called once by {@link World.registerSystem}, after `world` is set. Override to create queries. */
  public initialize(): void {}
  /**
   * Called by {@link World.execute} with the value passed to it. With `RenderLoop`,
   * pass `loop.deltaSeconds`, so `delta` is the fixed step in seconds.
   */
  public abstract execute(delta: number): void;
}

/** Owns entities, systems and persistent queries. */
export class World {
  /** Every entity in the world. */
  public entities: Set < Entity > = new Set();
  /** Registered systems, in execution order. */
  public systems: System[] = [];
  /** Registered persistent queries. */
  public queries: Set < Query > = new Set();

  /**
   * Creates an entity and adds it to the world. It is matched against queries
   * immediately, while it still has no components: call {@link updateEntity}
   * after adding components, or build an `Entity` first and use {@link addEntity}.
   */
  public createEntity(): Entity {
    const entity = new Entity();
    this.addEntity(entity);
    return entity;
  }

  /** Adds an entity and matches it against every registered query. */
  public addEntity(entity: Entity): void {
    this.entities.add(entity);
    this.queries.forEach(query => query.addEntityIfMatches(entity));
  }

  /** Removes an entity from the world and from every registered query. */
  public removeEntity(entity: Entity): void {
    this.entities.delete(entity);
    this.queries.forEach(query => query.removeEntity(entity));
  }

  /**
   * Re-evaluates an entity against all queries. Call after changing its components.
   * Does nothing for an entity that is not in the world (never added, or removed).
   */
  public updateEntity(entity: Entity): void {
    if (!this.entities.has(entity)) return;
    this.queries.forEach(query => {
        query.removeEntity(entity);
        query.addEntityIfMatches(entity);
    });
  }

  /** Sets `system.world`, calls `system.initialize()`, then appends it. Systems run in registration order. */
  public registerSystem(system: System): void {
    system.world = this;
    system.initialize();
    this.systems.push(system);
  }

  /**
   * Registers a persistent query and matches it against existing entities.
   *
   * The query is kept in `queries` and updated on every entity add, remove and
   * update, so create these once (e.g. in {@link System.initialize}) and reuse
   * them, never per frame. For a one-off count or filter use {@link queryOnce};
   * dispose a query with {@link removeQuery}.
   */
  public createQuery(requiredComponents: Function[]): Query {
      const query = new Query(requiredComponents);
      this.queries.add(query);
      // Match existing entities
      this.entities.forEach(entity => query.addEntityIfMatches(entity));
      return query;
  }

  /**
   * Disposes a query created by {@link createQuery} so it is no longer tracked or updated.
   * Without this, a persistent query lives forever: a query accidentally created
   * per frame leaks and progressively slows every entity add/remove. The query's
   * `entities` set is left as it was.
   *
   * @returns whether the query was registered.
   */
  public removeQuery(query: Query): boolean {
      return this.queries.delete(query);
  }

  /**
   * One-off match: returns a new set of the entities that have all of
   * `requiredComponents`, WITHOUT registering a persistent query. Use for
   * per-frame counts/filters (e.g. "how many collectibles remain?") where
   * {@link createQuery} would leak. O(entities) per call; for hot repeated use,
   * cache a {@link createQuery} result in a System instead.
   */
  public queryOnce(requiredComponents: Function[]): Set<Entity> {
      const query = new Query(requiredComponents);
      this.entities.forEach(entity => query.addEntityIfMatches(entity));
      return query.entities;
  }

  /** Calls `execute(delta)` on every system, in registration order. */
  public execute(delta: number): void {
    this.systems.forEach(system => system.execute(delta));
  }
}