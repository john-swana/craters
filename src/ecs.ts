export abstract class Component {}

export type ComponentClass<T extends Component> = new(...args: any[]) => T;

export class Entity {
  public components: Map < Function, Component > = new Map();

  public addComponent<T extends Component>(component: T): void {
    this.components.set(component.constructor, component);
  }

  public getComponent<T extends Component>(componentClass: ComponentClass<T>): T | undefined {
    return this.components.get(componentClass) as T | undefined;
  }

  public hasComponent(componentClass: Function): boolean {
    return this.components.has(componentClass);
  }
  
  public removeComponent(componentClass: Function): void {
    this.components.delete(componentClass);
  }
}

export class Query {
  public entities: Set < Entity > = new Set();
  private requiredComponents: Set < Function > ;

  constructor(requiredComponents: Function[]) {
    this.requiredComponents = new Set(requiredComponents);
  }

  public matches(entity: Entity): boolean {
    for (const required of this.requiredComponents) {
      if (!entity.hasComponent(required)) {
        return false;
      }
    }
    return true;
  }

  public addEntityIfMatches(entity: Entity): void {
    if (this.matches(entity)) {
      this.entities.add(entity);
    }
  }

  public removeEntity(entity: Entity): void {
    this.entities.delete(entity);
  }
}

export abstract class System {
  public world: World | null = null;
  public initialize(): void {}
  public abstract execute(delta: number): void;
}

export class World {
  public entities: Set < Entity > = new Set();
  public systems: System[] = [];
  public queries: Set < Query > = new Set();

  public createEntity(): Entity {
    const entity = new Entity();
    this.addEntity(entity);
    return entity;
  }

  public addEntity(entity: Entity): void {
    this.entities.add(entity);
    this.queries.forEach(query => query.addEntityIfMatches(entity));
  }

  public removeEntity(entity: Entity): void {
    this.entities.delete(entity);
    this.queries.forEach(query => query.removeEntity(entity));
  }

  // Re-evaluates an entity against all queries (call after changing components)
  public updateEntity(entity: Entity): void {
    this.queries.forEach(query => {
        query.removeEntity(entity);
        query.addEntityIfMatches(entity);
    });
  }

  public registerSystem(system: System): void {
    system.world = this;
    system.initialize();
    this.systems.push(system);
  }
  
  // Register a persistent query. It is kept in `queries` and re-evaluated on
  // every entity add/remove, so create these ONCE (e.g. in System.initialize)
  // and reuse them — never per frame. For a one-off count/filter use queryOnce().
  public createQuery(requiredComponents: Function[]): Query {
      const query = new Query(requiredComponents);
      this.queries.add(query);
      // Match existing entities
      this.entities.forEach(entity => query.addEntityIfMatches(entity));
      return query;
  }

  // Dispose a query created by createQuery so it is no longer tracked or updated.
  // Without this, a persistent query lives forever — a query accidentally created
  // per frame leaks and progressively slows every entity add/remove. Returns
  // whether the query was registered.
  public removeQuery(query: Query): boolean {
      return this.queries.delete(query);
  }

  // One-off match: return the entities matching `requiredComponents` WITHOUT
  // registering a persistent query. Use for per-frame counts/filters (e.g. "how
  // many collectibles remain?") where createQuery would leak. O(entities) per
  // call; for hot repeated use, cache a createQuery in a System instead.
  public queryOnce(requiredComponents: Function[]): Set<Entity> {
      const query = new Query(requiredComponents);
      this.entities.forEach(entity => query.addEntityIfMatches(entity));
      return query.entities;
  }

  public execute(delta: number): void {
    this.systems.forEach(system => system.execute(delta));
  }
}