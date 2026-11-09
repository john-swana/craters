# RigidBody Usage Guide

`RigidBody` adds 2D motion and impulse-based collision response on top of the `SAT` collision
functions. A body holds position, velocity and material properties. Shapes (`Polygon`, `Circle`)
do the collision detection, and your update loop connects the two every step.

**Units:** positions are in pixels, time in **seconds**, velocities in px/s, accelerations in
px/s², angles in radians. With `RenderLoop`, pass `loop.deltaSeconds` to `integrate()`. Do not
pass `loop.delta`, which is in milliseconds and would scale every velocity by 1000×.

**Imports:** physics classes live in the `SAT` namespace. They are not top-level exports of
`craters`:

```typescript
import { SAT } from "craters";
const { RigidBody, Vector } = SAT;

// In type positions use the namespace: SAT.RigidBody, SAT.Polygon, SAT.Vector, …
function step(body: SAT.RigidBody, dt: number): void {
    body.integrate(dt);
}
```

## Features

- **Linear motion**: forces, impulses and semi-implicit Euler integration
- **Collision response**: single-pass impulse resolution with restitution and friction, called by you for each colliding pair
- **Static bodies**: mass 0 bodies never move (walls, floors)
- **Damping**: frame-rate-independent velocity loss (air resistance)
- **Sleeping**: bodies that come to rest stop being integrated until something wakes them
- **Rotation is manual only**: `angle` advances from an `angularVelocity` you set yourself. Forces and collisions never rotate a body.

## Basic Usage

### Creating a RigidBody

```typescript
import { SAT } from "craters";
const { RigidBody, Vector } = SAT;

// Dynamic body at (100, 100)
const dynamicBody = new RigidBody(
    new Vector(100, 100),  // position in px (stored by reference, not copied)
    1,                     // mass (default 1)
    0.5,                   // restitution / bounciness, 0–1 (default 0.5)
    0.3                    // friction, 0–1 (default 0.3)
);

// Static body (immovable, like a wall): mass 0
const staticBody = new RigidBody(new Vector(0, 500), 0);
// or
const wall = new RigidBody(new Vector(0, 500), 1).setStatic(true);
```

### Forces vs Impulses

A **force** accumulates in `body.force` until the next `integrate()`. That call turns it into
acceleration (a = F / m) and then clears it, so apply continuous forces such as gravity every
step. An **impulse** changes velocity immediately (Δv = J / m). Static bodies ignore both.

Both methods take an optional last argument, `wake` (default `true`). By default the call
wakes the body and restarts its sleep timer. Pass `false` for forces you apply every step,
such as gravity. That lets a resting body fall asleep, and a sleeping body then ignores the
call.

```typescript
import { SAT } from "craters";
const { Vector } = SAT;

// Gravity: apply every step. Scaling by mass makes every body fall at 980 px/s².
// wake = false, so the body can still fall asleep once it comes to rest.
body.applyForce(new Vector(0, 980 * body.mass), false);

// Jump: an instant velocity change of 500 px/s upward for a mass-1 body.
// Wakes the body if it is asleep.
body.applyImpulse(new Vector(0, -500));
```

There is no force-at-a-point or torque API. Forces always act on the centre of mass.

### Integration

Call `integrate(dt)` once per physics step, then copy the body's position onto its shape:

```typescript
import { SAT, RenderLoop } from "craters";
const { Vector } = SAT;

new RenderLoop((loop) => {
    body.applyForce(new Vector(0, 980 * body.mass), false);
    body.integrate(loop.deltaSeconds); // seconds

    shape.pos.copy(body.position);
});
```

Each `integrate(dt)` call works as follows:
- A static body does nothing.
- Otherwise the sleep state is updated first, from the velocity the previous step left behind
  (see Sleep System).
- A sleeping body clears its accumulated forces and does not move.
- An awake body:
  1. adds `force / mass · dt` to its velocity
  2. applies damping
  3. adds `velocity · dt` to its position and `angularVelocity · dt` to its angle
  4. clears its forces

### Bodies and Shapes

The body owns position and velocity, and the shape owns geometry. `body.position` stands for
the same point as `shape.pos`. For `Box(...).toPolygon()` that point is the box's **top-left
corner**, and the polygon also rotates about that corner. To make the position the centre and
rotate about it, offset the polygon by half its size:

```typescript
import { SAT } from "craters";
const { RigidBody, Vector, Box } = SAT;

const w = 40, h = 40;
const body = new RigidBody(new Vector(100, 100), 1);
const shape = new Box(new Vector(100, 100), w, h).toPolygon()
    .setOffset(new Vector(-w / 2, -h / 2)); // pos is now the box centre

function syncShapeWithBody(body: SAT.RigidBody, shape: SAT.Polygon): void {
    shape.pos.copy(body.position);
    // setAngle() rebuilds the polygon, so only call it when the angle changed
    if (shape.angle !== body.angle) shape.setAngle(body.angle);
}
```

## Collision Response

Detect with a SAT test, then resolve with the body that owns the **first** shape:

```typescript
import { SAT } from "craters";
const { Response, testPolygonPolygon } = SAT;

const response = new Response(); // reuse it, but clear() before every test

response.clear();
if (testPolygonPolygon(shapeA, shapeB, response)) {
    bodyA.resolveCollision(bodyB, response);
    // resolveCollision moves the bodies apart, so re-sync the shapes
    shapeA.pos.copy(bodyA.position);
    shapeB.pos.copy(bodyB.position);
}
```

- **Argument order matters.** `response.overlapN` points from shape A toward shape B, so a
  response from `testX(shapeA, shapeB)` must be passed to `bodyA.resolveCollision(bodyB, …)`.
  Swapping the bodies pushes them into each other. `testCirclePolygon(circle, polygon)` always
  takes the circle first, so the circle's body is the one that calls `resolveCollision`.
- **Resting contacts vs impacts.** The threshold is the speed the bodies' forces add along the
  normal in one step, plus 2 px/s. With 980 px/s² gravity that is about 18 px/s at one step per
  frame, or about 6 px/s with 4 sub-steps.
  - An approach slower than that is a **resting contact**: a body held against a surface by
    gravity arrives with about that much speed every step. Resting contacts don't bounce and
    don't wake sleeping bodies.
  - Anything faster is an **impact**.
- **What `resolveCollision` does**, in order:
  1. Returns immediately if both bodies are static.
  2. Wakes a sleeping body only on an impact. Awake bodies keep their sleep timers.
  3. Treats a body that is still asleep as immovable for this contact. If neither body can
     move (static or asleep), it returns.
  4. Corrects penetration by moving the bodies apart along the normal. It moves them 40% of
     `(overlap − 0.5 px)`, split by inverse mass.
  5. Returns if the bodies are already moving apart.
  6. If the overlap is over 8 px, scales the approach speed down linearly, reaching zero at
     16 px. This stops deep piles from exploding.
  7. Applies a normal impulse with restitution `min(a.restitution, b.restitution)`. Resting
     contacts use 0, so they don't micro-bounce.
  8. Caps each dynamic body's speed at 4000 px/s.
  9. Applies a friction impulse along the contact tangent. It uses
     `μ = (a.friction + b.friction) / 2` and is clamped to `μ ×` the normal impulse (Coulomb).
- Resolution is a single pass per call, with no solver iterations and no rotation. Use
  sub-stepping (below) for stable stacks.

## Material Properties

```typescript
import { SAT } from "craters";
const { RigidBody, Vector } = SAT;

// Super bouncy ball
const bouncyBall = new RigidBody(new Vector(100, 100), 0.5, 0.95, 0.1);

// Heavy, low-friction object (ice block)
const iceBlock = new RigidBody(new Vector(200, 100), 10, 0.2, 0.05);

// Sticky, low-restitution object
const stickyBox = new RigidBody(new Vector(300, 100), 1, 0.1, 0.9);

// The surface matters too: restitution uses the LOWER of the two bodies
const trampoline = new RigidBody(new Vector(0, 500), 0, 1.0, 0.3);
```

How two bodies' values combine:
- **Restitution** is `min(a, b)`. The 0.95 ball bounces like 0.95 only on a surface of at
  least 0.95. On a default floor (0.5) it bounces like 0.5.
- **Friction** is the average `(a + b) / 2`. The 0.05 ice block on a default floor (0.3)
  slides with μ = 0.175.

## Damping (Air Resistance)

`linearDamping` and `angularDamping` are the fraction of velocity **kept per second**. They
are applied as `Math.pow(d, dt)`, so the result does not depend on the frame rate. A lower
value means more damping. The defaults are `linearDamping = 0.99` and `angularDamping = 0.98`.

```typescript
body.linearDamping = 0.5;   // keeps 50% of its speed each second (strong drag)
body.angularDamping = 0.9;  // keeps 90% of its spin each second

// No damping (space-like physics)
body.linearDamping = 1.0;
body.angularDamping = 1.0;
```

Before v0.3.0 the factor was applied once per step. A value tuned under the old behaviour
needs lowering: the old `0.98` at 60 fps corresponds to about `0.3` now (0.98⁶⁰ ≈ 0.30).

## Sleep System

At the start of each `integrate()` call, the body's squared speed and squared angular speed
are compared with `sleepThreshold`. This uses the velocity the previous step left behind, after
its collision response.
- If both are below the threshold, `sleepTimer` counts up.
- Once `sleepTimer` exceeds `sleepTimerMax`, the body sleeps.
- The default `sleepThreshold` is 20, meaning below about 4.5 px/s.
- `sleepTimerMax` counts `integrate()` calls (not frames) and defaults to 60.

Falling asleep zeroes the velocity, spin and forces. `integrate()` skips a sleeping body. For a
resting contact, a sleeping body acts as immovable, so a stack can sleep from the bottom up
while the bodies on top settle.

To let bodies sleep under gravity, apply gravity with `wake = false`:
`body.applyForce(gravity, false)`. A force applied with the default `wake = true` every step
keeps the body awake.

What wakes a body, and what doesn't:
- **Wakes:**
  - `wake()`, `setSleeping(false)` and `setVelocity()`
  - `applyForce()` and `applyImpulse()` with the default `wake = true`
  - `resolveCollision()`, but only on an impact (an approach faster than the resting-contact
    threshold)
- **Does not wake:**
  - `applyForce(…, false)` and `applyImpulse(…, false)`, which a sleeping body ignores
  - `setPosition()`
  - resting contacts

If you remove or move what a sleeping body rests on, call `wake()` on the body, or it stays
where it is.

```typescript
// Check if body is sleeping
if (body.isSleeping) {
    console.log("Body is at rest");
}

// Wake up a sleeping body
body.wake();

// Manually put body to sleep (zeroes velocity and forces)
body.setSleeping(true);

// Customize sleep behavior. The threshold is compared with SQUARED speeds.
body.sleepThreshold = 1;   // sleep only below 1 px/s (and 1 rad/s)
body.sleepTimerMax = 120;  // integrate() calls: 0.5 s with 4 sub-steps at 60 Hz
```

**Limitation:** bodies in a dense pile that keeps jittering, for example circles packed
between walls, may wake each other repeatedly and never all sleep at once. Sub-stepping
reduces the jitter.

## Velocity Control

```typescript
// Set velocity directly (px/s). Also wakes the body and returns it.
body.setVelocity(50, -100);

// Momentum: a new Vector, mass × velocity
const momentum = body.getMomentum();
console.log(`Momentum: ${momentum.x}, ${momentum.y}`);

// Kinetic energy: ½·m·|v|² (linear only; spin is not counted)
const energy = body.getKineticEnergy();
console.log(`Energy: ${energy}`);
```

## Complete Example: Bouncing Box

```typescript
import { SAT, RenderLoop, Canvas2DRenderer } from "craters";
const { RigidBody, Vector, Box, Response, testPolygonPolygon } = SAT;

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);

// Falling 40×40 box; its position is the top-left corner
const boxBody  = new RigidBody(new Vector(200, 100), 1, 0.7, 0.3);
const boxShape = new Box(new Vector(200, 100), 40, 40).toPolygon();

// Static floor (mass 0); its top edge is at y = 400
const floorBody  = new RigidBody(new Vector(0, 400), 0);
const floorShape = new Box(new Vector(0, 400), 800, 40).toPolygon();

const gravity  = new Vector(0, 980); // px/s²
const response = new Response();
const SUB_STEPS = 4;

function step(dt: number): void {
    // 1. Forces (wake = false lets the box fall asleep once it rests)
    boxBody.applyForce(gravity.clone().scale(boxBody.mass), false);

    // 2. Integrate
    boxBody.integrate(dt);
    boxShape.pos.copy(boxBody.position);

    // 3. Collide: test(A, B) → A.resolveCollision(B)
    response.clear();
    if (testPolygonPolygon(boxShape, floorShape, response)) {
        boxBody.resolveCollision(floorBody, response);
        boxShape.pos.copy(boxBody.position); // resolution moved the box
    }
}

new RenderLoop((loop) => {
    const subDt = loop.deltaSeconds / SUB_STEPS;
    for (let i = 0; i < SUB_STEPS; i++) step(subDt);

    renderer.clear("#101018");
    const color = boxBody.isSleeping ? "slategrey" : "orange";
    renderer.drawRect(boxBody.position.x, boxBody.position.y, 40, 40, color, true);
    renderer.drawRect(0, 400, 800, 40, "grey", true);
});
```

What happens:
1. The box falls for about 0.7 s and hits the floor at about 710 px/s.
2. It bounces with the combined restitution `min(0.7, 0.5) = 0.5`. Each bounce reaches roughly
   a quarter of the previous height: about 63, 15 and 3 px.
3. It is at rest within about 2 s, with its bottom edge about 0.5 px inside the floor. That is
   the penetration slop: `boxBody.position.y ≈ 360.5`.
4. After about 2.3 s it falls asleep and turns grey. It stays asleep until something wakes it.

## Physics Loop & Stability (Sub-stepping)

For stable physics, especially with gravity and stacking, run several smaller steps per frame
instead of one large one:

```typescript
import { RenderLoop } from "craters";

new RenderLoop((loop) => {
    const subSteps = 4;
    const subDt = loop.deltaSeconds / subSteps;

    for (let i = 0; i < subSteps; i++) {
        // 1. Apply forces (every sub-step: integrate() clears them)
        // 2. Integrate each body with subDt
        // 3. Collision detection & resolution
    }
});
```

This reduces tunneling (objects passing through walls) and improves the stability of stacks.
For example, run the complete example with one step per frame:
- The box is already about 9 px inside the floor when the hit is detected. That is past the
  8 px deep-overlap limit, so the bounce impulse is scaled down.
- The box leaves the floor at about 250 px/s instead of about 350 px/s.
- The first bounce peaks at about 24 px instead of about 63 px.
- The box comes to rest about 1 px inside the floor and falls asleep after about 2.5 s.

Sleep timing counts sub-steps: with 4 sub-steps, the default `sleepTimerMax` of 60 is reached
after 0.25 s rather than 1 s.

## Platformer Example

```typescript
import { SAT } from "craters";
const { RigidBody, Vector, Box, Response, testPolygonPolygon } = SAT;

interface Solid { body: SAT.RigidBody; shape: SAT.Polygon; }

class Player {
    body: SAT.RigidBody;
    shape: SAT.Polygon;
    grounded = false;
    private response = new Response();

    constructor(x: number, y: number) {
        this.body = new RigidBody(new Vector(x, y), 1, 0, 0.5);
        this.shape = new Box(new Vector(x, y), 32, 48).toPolygon();
    }

    jump(): void {
        if (this.grounded) {
            this.body.applyImpulse(new Vector(0, -600)); // 600 px/s upward (mass 1); wakes the body
            this.grounded = false;
        }
    }

    move(direction: -1 | 0 | 1): void {
        // setVelocity also wakes the body
        this.body.setVelocity(direction * 200, this.body.velocity.y);
    }

    update(dt: number, level: Solid[]): void {
        this.body.applyForce(new Vector(0, 980 * this.body.mass), false); // gravity
        this.body.integrate(dt);
        this.shape.pos.copy(this.body.position);

        this.grounded = false;
        for (const solid of level) {
            this.response.clear();
            if (testPolygonPolygon(this.shape, solid.shape, this.response)) {
                // overlapN points from the player (A) toward the solid (B):
                // a mostly-downward normal means the player is standing on it.
                if (this.response.overlapN.y > 0.7) this.grounded = true;
                this.body.resolveCollision(solid.body, this.response);
                this.shape.pos.copy(this.body.position);
            }
        }
    }
}
```

## Integration with ECS

Store the body and its shape in a component, and step them from a `System`:

```typescript
import { SAT, EntityComponentSystem as ECS, RenderLoop } from "craters";
const { RigidBody, Vector, Box, Response, testPolygonPolygon } = SAT;

class Physics extends ECS.Component {
    constructor(public body: SAT.RigidBody, public shape: SAT.Polygon) { super(); }
}

class PhysicsSystem extends ECS.System {
    private bodies!: ECS.Query;
    private gravity = new Vector(0, 980); // px/s²
    private response = new Response();

    initialize(): void {
        // Persistent query: create it once, here.
        this.bodies = this.world!.createQuery([Physics]);
    }

    execute(dt: number): void { // dt in seconds
        const items = Array.from(this.bodies.entities, (e) => e.getComponent(Physics)!);

        for (const { body, shape } of items) {
            // Ignored by static bodies; wake = false lets resting bodies sleep
            body.applyForce(this.gravity.clone().scale(body.mass), false);
            body.integrate(dt);
            shape.pos.copy(body.position);
        }

        // Test each pair once
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const a = items[i], b = items[j];
                this.response.clear();
                if (testPolygonPolygon(a.shape, b.shape, this.response)) {
                    a.body.resolveCollision(b.body, this.response); // no-op if both static
                    a.shape.pos.copy(a.body.position);
                    b.shape.pos.copy(b.body.position);
                }
            }
        }
    }
}

const world = new ECS.World();
world.registerSystem(new PhysicsSystem());

function spawn(x: number, y: number, w: number, h: number, mass: number): void {
    const e = new ECS.Entity();
    e.addComponent(new Physics(
        new RigidBody(new Vector(x, y), mass),
        new Box(new Vector(x, y), w, h).toPolygon()
    ));
    world.addEntity(e);
}

spawn(100, 100, 40, 40, 1); // falling box
spawn(0, 400, 800, 40, 0);  // static floor

new RenderLoop((loop) => world.execute(loop.deltaSeconds));
```

## Performance Tips

1. **Use static bodies** for immovable objects. `integrate()` skips them, and they ignore forces and impulses.
2. **Let resting bodies sleep.** Sleeping bodies skip integration. Apply per-step forces such as gravity with `wake = false` so bodies can fall asleep (see Sleep System).
3. **Adjust sleep thresholds** to your game's scale. `sleepThreshold` is a squared speed.
4. **Use damping wisely.** Lower damping values bleed speed faster and help bodies settle.
5. **Use a broad phase.** `QuadTree.retrieveUnique()` limits SAT tests to nearby pairs (see the SAT guide).
6. **Reuse one `Response`**, and call `clear()` before each test.

## Notes and Limitations

- **Mass:** change it with `setMass()`. Assigning `body.mass` directly does not update
  `inverseMass` or `isStatic`, so the body keeps behaving with its old mass.
- **`setStatic(false)`** only clears the flag. Mass and inverse mass stay 0, so the body still
  cannot move. To make a static body dynamic, use `setMass(m)` with `m > 0`, which also sets
  `isStatic = false`.
- **No rotational dynamics:** collisions and forces never change `angularVelocity`. `torque`
  and `angularAcceleration` are not used by the integrator.
- **`position` is stored by reference.** Passing the same `Vector` to two bodies makes them
  share a position.
- **Box polygons rotate about their top-left corner.** Use
  `setOffset(new Vector(-w / 2, -h / 2))` to rotate about the centre (see Bodies and Shapes).

## API Reference

### Constructor
- `new RigidBody(position: Vector = new Vector(), mass = 1, restitution = 0.5, friction = 0.3)`.
  A mass of 0 makes the body static.

### Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `position` | `Vector` | constructor arg | Position in px (the point matching `shape.pos`) |
| `angle` | `number` | `0` | Rotation in radians; changes only through `angularVelocity` |
| `velocity` | `Vector` | `(0, 0)` | Linear velocity, px/s |
| `acceleration` | `Vector` | `(0, 0)` | Last step's `force × inverseMass`, px/s² (overwritten by `integrate`) |
| `angularVelocity` | `number` | `0` | rad/s; set manually (never changed by collisions) |
| `angularAcceleration` | `number` | `0` | Not used by the integrator |
| `mass` | `number` | `1` | Change with `setMass()`, not by assignment |
| `inverseMass` | `number` | `1 / mass` (0 if static) | Used by all dynamics |
| `restitution` | `number` | `0.5` | Bounciness 0–1; pairs combine as `min` |
| `friction` | `number` | `0.3` | 0–1; pairs combine as the average |
| `force` | `Vector` | `(0, 0)` | Accumulated force; cleared by `integrate` |
| `torque` | `number` | `0` | Not used by the integrator |
| `isStatic` | `boolean` | `mass === 0` | Static bodies never move |
| `isSleeping` | `boolean` | `false` | Whether the body is asleep (skipped by `integrate`) |
| `sleepThreshold` | `number` | `20` | Compared with squared speed (px/s)² and squared angular speed (rad/s)² |
| `sleepTimer` | `number` | `0` | Consecutive slow `integrate()` calls; restarted by `wake()` |
| `sleepTimerMax` | `number` | `60` | Slow `integrate()` calls before sleeping (sleeps when `sleepTimer` exceeds it) |
| `linearDamping` | `number` | `0.99` | Fraction of velocity kept per second |
| `angularDamping` | `number` | `0.98` | Fraction of angular velocity kept per second |

### Methods

| Method | Returns | Description |
|---|---|---|
| `setStatic(isStatic: boolean)` | `RigidBody` | `true`: zero mass, inverse mass and velocities. `false`: clears the flag only |
| `applyForce(force: Vector, wake = true)` | `void` | Accumulates a force for the next `integrate()`. Ignored if static. `wake`: wake the body and restart its sleep timer; with `false` a sleeping body ignores the force |
| `applyImpulse(impulse: Vector, wake = true)` | `void` | `velocity += impulse × inverseMass`. Ignored if static. `wake` as for `applyForce` |
| `integrate(dt: number)` | `void` | Advances the body by `dt` **seconds** |
| `resolveCollision(other: RigidBody, response: Response)` | `void` | Separates and applies impulses; `response` must come from `test(thisShape, otherShape)`. Wakes a sleeping body only on an impact |
| `wake()` | `void` | Same as `setSleeping(false)`: awake, sleep timer restarted |
| `setSleeping(sleeping: boolean)` | `void` | `true` zeroes velocities and forces; `false` resets `sleepTimer` |
| `setVelocity(x: number, y: number)` | `RigidBody` | Sets velocity (px/s) and wakes the body |
| `setPosition(x: number, y: number)` | `RigidBody` | Sets position; doesn't wake or move shapes |
| `setMass(mass: number)` | `RigidBody` | Sets `mass` and `inverseMass`; `isStatic = (mass === 0)` |
| `getKineticEnergy()` | `number` | `0.5 × mass × speed²` (linear only) |
| `getMomentum()` | `Vector` | New vector `mass × velocity` |
