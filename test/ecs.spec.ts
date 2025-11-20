import chai from "chai";
import { World, Entity, Component, System } from "../src/ecs";

var expect = chai.expect;

class Position extends Component {
  public x: number = 0;
  public y: number = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }
}

class Velocity extends Component {
  public vx: number = 0;
  public vy: number = 0;
  constructor(vx: number, vy: number) {
    super();
    this.vx = vx;
    this.vy = vy;
  }
}

class MovementSystem extends System {
  public execute(delta: number): void {
    const query = this.world?.queries.values().next().value; // Hacky access for simple test
    if (!query) return;

    query.entities.forEach((entity: Entity) => {
      const pos = entity.getComponent(Position);
      const vel = entity.getComponent(Velocity);
      pos.x += vel.vx * delta;
      pos.y += vel.vy * delta;
    });
  }
}

describe("ECS", function () {
  var world: World;

  beforeEach(function () {
    world = new World();
  });

  it("should create and register entities", function () {
    const entity = world.createEntity();
    expect(world.entities.has(entity)).to.be.true;
  });

  it("should add and retrieve components", function () {
    const entity = new Entity();
    entity.addComponent(new Position(10, 20));

    expect(entity.hasComponent(Position)).to.be.true;
    const pos = entity.getComponent(Position);
    expect(pos.x).to.equal(10);
    expect(pos.y).to.equal(20);
  });

  it("should remove components", function () {
    const entity = new Entity();
    entity.addComponent(new Position(0, 0));
    expect(entity.hasComponent(Position)).to.be.true;

    entity.removeComponent(Position);
    expect(entity.hasComponent(Position)).to.be.false;
  });

  it("should match queries", function () {
    const query = world.createQuery([Position, Velocity]);

    const entity1 = world.createEntity();
    entity1.addComponent(new Position(0, 0));
    world.updateEntity(entity1); // Should not match yet

    const entity2 = world.createEntity();
    entity2.addComponent(new Position(0, 0));
    entity2.addComponent(new Velocity(1, 1));
    world.updateEntity(entity2); // Should match

    expect(query.entities.has(entity1)).to.be.false;
    expect(query.entities.has(entity2)).to.be.true;
  });

  it("should run systems", function () {
    const system = new MovementSystem();
    world.registerSystem(system);

    // Create query that the system will use (implicitly managed by world in a real app, but here manual)
    world.createQuery([Position, Velocity]);

    const entity = world.createEntity();
    entity.addComponent(new Position(0, 0));
    entity.addComponent(new Velocity(10, 0));
    world.updateEntity(entity);

    world.execute(1); // Delta = 1

    const pos = entity.getComponent(Position);
    expect(pos.x).to.equal(10);
  });
  it("should remove entity from world and queries", function () {
    const query = world.createQuery([Position]);
    const entity = world.createEntity();
    entity.addComponent(new Position(0, 0));
    world.updateEntity(entity);

    expect(query.entities.has(entity)).to.be.true;
    expect(world.entities.has(entity)).to.be.true;

    world.removeEntity(entity);

    expect(query.entities.has(entity)).to.be.false;
    expect(world.entities.has(entity)).to.be.false;
  });

  it("should update entity in queries when components change", function () {
    const query = world.createQuery([Position, Velocity]);
    const entity = world.createEntity();
    entity.addComponent(new Position(0, 0));
    world.updateEntity(entity);

    expect(query.entities.has(entity)).to.be.false; // Missing Velocity

    entity.addComponent(new Velocity(1, 1));
    world.updateEntity(entity);

    expect(query.entities.has(entity)).to.be.true; // Now matches

    entity.removeComponent(Velocity);
    world.updateEntity(entity);

    expect(query.entities.has(entity)).to.be.false; // No longer matches
  });

  it("should handle multiple queries", function () {
    const queryPos = world.createQuery([Position]);
    const queryVel = world.createQuery([Velocity]);
    const queryBoth = world.createQuery([Position, Velocity]);

    const entity = world.createEntity();
    entity.addComponent(new Position(0, 0));
    world.updateEntity(entity);

    expect(queryPos.entities.has(entity)).to.be.true;
    expect(queryVel.entities.has(entity)).to.be.false;
    expect(queryBoth.entities.has(entity)).to.be.false;

    entity.addComponent(new Velocity(1, 1));
    world.updateEntity(entity);

    expect(queryPos.entities.has(entity)).to.be.true;
    expect(queryVel.entities.has(entity)).to.be.true;
    expect(queryBoth.entities.has(entity)).to.be.true;
  });
});