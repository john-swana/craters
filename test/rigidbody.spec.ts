import { expect } from 'chai';
import { RigidBody, Vector, Response, Box, testPolygonPolygon } from '../src/sat';

describe('RigidBody', () => {
    it('should initialize with default values', () => {
        const body = new RigidBody();
        expect(body.mass).to.equal(1);
        expect(body.position.x).to.equal(0);
        expect(body.position.y).to.equal(0);
        expect(body.velocity.x).to.equal(0);
        expect(body.velocity.y).to.equal(0);
        expect(body.isStatic).to.be.false;
    });

    it('should integrate velocity and position', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.velocity = new Vector(10, 0);

        // Integrate for 1 second
        body.integrate(1);

        // Position should be 10 (approx, considering damping)
        expect(body.position.x).to.be.closeTo(9.9, 0.1);
    });

    it('should apply forces', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.applyForce(new Vector(10, 0));

        // F = ma -> a = F/m = 10/1 = 10
        body.integrate(1);

        expect(body.velocity.x).to.be.closeTo(9.9, 0.1); // Damping applied
    });

    it('should resolve collisions between two dynamic bodies', () => {
        const b1 = new RigidBody(new Vector(0, 0), 1); // Moving right
        b1.velocity = new Vector(10, 0);
        const s1 = new Box(new Vector(0, 0), 10, 10).toPolygon();

        const b2 = new RigidBody(new Vector(8, 0), 1); // Stationary
        const s2 = new Box(new Vector(8, 0), 10, 10).toPolygon();

        // Sync shapes
        s1.pos.copy(b1.position);
        s2.pos.copy(b2.position);

        const response = new Response();
        const collided = testPolygonPolygon(s1, s2, response);

        expect(collided).to.be.true;

        b1.resolveCollision(b2, response);

        // b1 should slow down or bounce back, b2 should move right
        expect(b1.velocity.x).to.be.lessThan(10);
        expect(b2.velocity.x).to.be.greaterThan(0);
    });

    it('should resolve collision with static body', () => {
        // Body centered at (10, 15) (Center of 20x20 box at 0,5)
        const body = new RigidBody(new Vector(10, 15), 1);
        body.velocity = new Vector(0, 10); // Moving down

        // Box shape relative to body center
        const shape = new Box(new Vector(0, 0), 20, 20).toPolygon();
        shape.setOffset(new Vector(-10, -10)); // Center the shape on the body

        body.position.x = 10;
        body.position.y = 10;
        body.velocity.x = 0;
        body.velocity.y = 10;

        const floorBody = new RigidBody(new Vector(50, 30), 0); // Static
        const floorShape = new Box(new Vector(0, 0), 100, 20).toPolygon();
        floorShape.setOffset(new Vector(-50, -10));

        // Sync
        shape.pos.copy(body.position);
        floorShape.pos.copy(floorBody.position);

        // Move body to (10, 11) -> Bottom Y=21. Top Floor Y=20. Overlap 1.
        body.position.y = 11;
        shape.pos.copy(body.position);

        const response = new Response();
        const collided = testPolygonPolygon(shape, floorShape, response);

        expect(collided).to.be.true;

        // Debug
        // console.log('Overlap:', response.overlap);
        // console.log('OverlapN:', response.overlapN);

        body.resolveCollision(floorBody, response);

        // Should bounce up
        // v_new = -e * v_old = -0.5 * 10 = -5.
        // With mass 1, impulse should be 15.
        expect(body.velocity.y).to.be.below(0);
        expect(body.velocity.y).to.be.closeTo(-5, 0.5);
    });

    it('should sleep when moving slowly', () => {
        const body = new RigidBody();
        body.velocity = new Vector(0.001, 0.001);
        body.sleepThreshold = 0.1;
        body.sleepTimerMax = 0; // Sleep immediately

        body.integrate(1);

        expect(body.isSleeping).to.be.true;
        expect(body.velocity.x).to.equal(0);
    });

    it('should wake up when force is applied', () => {
        const body = new RigidBody();
        body.setSleeping(true);
        expect(body.isSleeping).to.be.true;

        body.applyForce(new Vector(10, 0));
        body.wake();
        expect(body.isSleeping).to.be.false;
    });

    it('should apply friction', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.velocity = new Vector(10, 10); // Moving right and down (into floor)
        body.friction = 0.5;

        const floor = new RigidBody(new Vector(0, 10), 0); // Static
        floor.friction = 0.5;

        // Mock response for collision
        const response = new Response();
        response.overlap = 0;
        response.overlapN = new Vector(0, 1); // Normal pointing up (Floor -> Body)

        // Resolve collision
        body.resolveCollision(floor, response);

        // Friction should reduce X velocity
        expect(body.velocity.x).to.be.lessThan(10);
    });

    it('should apply restitution (bounce)', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.velocity = new Vector(0, 10); // Down
        body.restitution = 0.8;

        const floor = new RigidBody(new Vector(0, 10), 0);
        floor.restitution = 0.8;

        const response = new Response();
        response.overlap = 0;
        response.overlapN = new Vector(0, 1);

        body.resolveCollision(floor, response);

        // Should bounce up
        // v_new = -e * v_old = -0.8 * 10 = -8.
        expect(body.velocity.y).to.be.closeTo(-8, 0.1);
    });
});
