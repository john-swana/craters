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

    it('should apply damping independent of step size', () => {
        // One 1-second step vs. 100 steps of 0.01s must yield the same result,
        // proving damping no longer depends on frame rate.
        const big = new RigidBody(new Vector(0, 0), 1);
        big.velocity = new Vector(100, 0);
        big.integrate(1);

        const small = new RigidBody(new Vector(0, 0), 1);
        small.velocity = new Vector(100, 0);
        for (let i = 0; i < 100; i++) small.integrate(0.01);

        expect(small.velocity.x).to.be.closeTo(big.velocity.x, 0.5);
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

describe('RigidBody sleeping and waking', () => {
    const gravity = new Vector(0, 980); // px/s²

    // A 40×40 box dropped onto a static floor (top edge at y = 400), stepping at
    // 60 Hz with the given number of sub-steps. Gravity is applied with wake = false.
    function dropBoxOnFloor(subSteps: number, seconds: number) {
        const body = new RigidBody(new Vector(200, 100), 1, 0.7, 0.3);
        const shape = new Box(new Vector(200, 100), 40, 40).toPolygon();
        const floor = new RigidBody(new Vector(0, 400), 0);
        const floorShape = new Box(new Vector(0, 400), 800, 40).toPolygon();
        const response = new Response();
        let firstAsleep = -1;
        let wokeAgain = false;
        for (let frame = 0; frame < seconds * 60; frame++) {
            for (let s = 0; s < subSteps; s++) {
                body.applyForce(gravity.clone().scale(body.mass), false);
                body.integrate(1 / 60 / subSteps);
                shape.pos.copy(body.position);
                response.clear();
                if (testPolygonPolygon(shape, floorShape, response)) {
                    body.resolveCollision(floor, response);
                    shape.pos.copy(body.position);
                }
            }
            if (body.isSleeping && firstAsleep < 0) firstAsleep = frame;
            if (firstAsleep >= 0 && !body.isSleeping) wokeAgain = true;
        }
        return { body, firstAsleepSeconds: firstAsleep / 60, wokeAgain };
    }

    it('should wake a sleeping body when an impulse is applied', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.setSleeping(true);
        body.applyImpulse(new Vector(0, -600));
        expect(body.isSleeping).to.be.false;
        body.integrate(1 / 60);
        expect(body.position.y).to.be.lessThan(0);
    });

    it('should apply a force to a sleeping body by waking it', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.setSleeping(true);
        body.applyForce(new Vector(600, 0));
        body.integrate(1);
        expect(body.velocity.x).to.be.closeTo(594, 1); // 600 px/s, minus 1% damping
    });

    it('should leave a sleeping body asleep with wake = false', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.setSleeping(true);
        body.applyForce(new Vector(600, 0), false);
        body.applyImpulse(new Vector(600, 0), false);
        body.integrate(1);
        expect(body.isSleeping).to.be.true;
        expect(body.velocity.x).to.equal(0);
        expect(body.position.x).to.equal(0);
    });

    it('should still apply forces and impulses to an awake body with wake = false', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.applyImpulse(new Vector(10, 0), false);
        expect(body.velocity.x).to.equal(10);
        body.applyForce(new Vector(100, 0), false);
        body.integrate(1);
        expect(body.velocity.x).to.be.closeTo(108.9, 0.1); // (10 + 100) × 0.99
    });

    it('should let a box resting on a static floor fall asleep (one step per frame)', () => {
        const { body, firstAsleepSeconds, wokeAgain } = dropBoxOnFloor(1, 5);
        expect(firstAsleepSeconds).to.be.within(0, 3);
        expect(wokeAgain).to.be.false;
        expect(body.isSleeping).to.be.true;
        expect(body.position.y).to.be.closeTo(360, 1.5);
    });

    it('should let a box resting on a static floor fall asleep (4 sub-steps)', () => {
        const { body, firstAsleepSeconds, wokeAgain } = dropBoxOnFloor(4, 5);
        expect(firstAsleepSeconds).to.be.within(0, 3);
        expect(wokeAgain).to.be.false;
        expect(body.isSleeping).to.be.true;
        expect(body.position.y).to.be.closeTo(360, 1.5);
    });

    it('should keep a body awake while a waking force is applied every step', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        for (let i = 0; i < 200; i++) {
            body.applyForce(new Vector(0, 0)); // default wake = true restarts the sleep timer
            body.integrate(1 / 60);
        }
        expect(body.isSleeping).to.be.false;
    });

    it('should not wake a sleeping body resting on a static floor', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.setSleeping(true);
        const floor = new RigidBody(new Vector(0, 10), 0);
        const response = new Response();
        response.overlap = 1;
        response.overlapN = new Vector(0, 1);
        body.resolveCollision(floor, response);
        expect(body.isSleeping).to.be.true;
        expect(body.position.y).to.equal(0);
    });

    it('should not reset the sleep timer of an awake body on contact', () => {
        const body = new RigidBody(new Vector(0, 0), 1);
        body.sleepTimer = 10;
        const floor = new RigidBody(new Vector(0, 10), 0);
        const response = new Response();
        response.overlap = 0;
        response.overlapN = new Vector(0, 1);
        body.resolveCollision(floor, response);
        expect(body.sleepTimer).to.equal(10);
    });

    it('should wake a sleeping body hit by a moving body', () => {
        const mover = new RigidBody(new Vector(0, 0), 1, 0.5, 0);
        mover.velocity = new Vector(200, 0);
        const sleeper = new RigidBody(new Vector(10, 0), 1, 0.5, 0);
        sleeper.setSleeping(true);
        const response = new Response();
        response.overlap = 1;
        response.overlapN = new Vector(1, 0); // from mover toward sleeper
        mover.resolveCollision(sleeper, response);
        expect(sleeper.isSleeping).to.be.false;
        expect(sleeper.velocity.x).to.be.closeTo(150, 0.001); // (1 + 0.5) × 200 / 2
        expect(mover.velocity.x).to.be.closeTo(50, 0.001);
    });

    it('should treat a body pressed down by one step of gravity as a resting contact', () => {
        const body = new RigidBody(new Vector(0, 0), 1, 1, 0);
        body.applyForce(gravity.clone().scale(body.mass), false);
        body.integrate(1 / 60); // gains 980 / 60 ≈ 16.3 px/s
        const floor = new RigidBody(new Vector(0, 10), 0, 1, 0);
        const response = new Response();
        response.overlap = 0;
        response.overlapN = new Vector(0, 1);
        body.resolveCollision(floor, response);
        expect(body.velocity.y).to.be.closeTo(0, 0.001); // no bounce despite restitution 1
    });

    it('should still bounce on a real impact', () => {
        const body = new RigidBody(new Vector(0, 0), 1, 1, 0);
        body.applyForce(gravity.clone().scale(body.mass), false);
        body.integrate(1 / 60);
        body.velocity.y = 100;
        const floor = new RigidBody(new Vector(0, 10), 0, 1, 0);
        const response = new Response();
        response.overlap = 0;
        response.overlapN = new Vector(0, 1);
        body.resolveCollision(floor, response);
        expect(body.velocity.y).to.be.closeTo(-100, 0.001);
    });

    it('should settle a stack of boxes without exploding, then sleep', () => {
        // 3-2-1 pyramid of 40×40 boxes on a static floor, 4 sub-steps at 60 Hz
        const bodies: RigidBody[] = [new RigidBody(new Vector(0, 400), 0)];
        const shapes = [new Box(new Vector(0, 400), 800, 40).toPolygon()];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3 - row; col++) {
                const x = 340 + row * 21 + col * 42;
                const y = 360 - row * 41;
                bodies.push(new RigidBody(new Vector(x, y), 1, 0.3, 0.5));
                shapes.push(new Box(new Vector(x, y), 40, 40).toPolygon());
            }
        }
        const start = bodies.map(b => b.position.clone());
        const response = new Response();
        let maxSpeed = 0;
        for (let frame = 0; frame < 3 * 60; frame++) {
            for (let s = 0; s < 4; s++) {
                for (const b of bodies) {
                    b.applyForce(gravity.clone().scale(b.mass), false);
                    b.integrate(1 / 240);
                }
                bodies.forEach((b, i) => shapes[i].pos.copy(b.position));
                for (let i = 0; i < bodies.length; i++) {
                    for (let j = i + 1; j < bodies.length; j++) {
                        response.clear();
                        if (testPolygonPolygon(shapes[i], shapes[j], response)) {
                            bodies[i].resolveCollision(bodies[j], response);
                            shapes[i].pos.copy(bodies[i].position);
                            shapes[j].pos.copy(bodies[j].position);
                        }
                    }
                }
            }
            for (const b of bodies) maxSpeed = Math.max(maxSpeed, b.velocity.len());
        }
        expect(maxSpeed).to.be.lessThan(200);
        for (let i = 1; i < bodies.length; i++) {
            expect(bodies[i].position.clone().sub(start[i]).len()).to.be.lessThan(5);
            expect(bodies[i].isSleeping).to.be.true;
        }
    });
});
