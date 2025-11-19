export abstract class Component {}

export type ComponentClass<T extends Component> = new(...args: any[]) => T;

export class Entity {
  public components: Map < Function, Component > = new Map();

  public addComponent<T extends Component>(component: T): void {
    this.components.set(component.constructor, component);
  }

  public getComponent<T extends Component>(componentClass: ComponentClass<T>): T {
    return this.components.get(componentClass) as T;
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
  
  public createQuery(requiredComponents: Function[]): Query {
      const query = new Query(requiredComponents);
      this.queries.add(query);
      // Match existing entities
      this.entities.forEach(entity => query.addEntityIfMatches(entity));
      return query;
  }

  public execute(delta: number): void {
    this.systems.forEach(system => system.execute(delta));
  }
}

// Maintain compatibility exports if needed, or defining them as aliases/helpers
export class ComponentManager {
    // Deprecated but kept for export structure if needed, 
    // though in this new design Entity manages its own components.
}
export class EntityManager {
    // Deprecated, World handles this.
}
export class SystemManager {
    // Deprecated, World handles this.
}
export class QueryManager {
   // Deprecated, World handles this.
}