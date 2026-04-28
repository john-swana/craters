# RigidBody Usage Guide

The `RigidBody` class provides a complete 2D physics simulation system that works seamlessly with the existing SAT collision detection system in Craters.

## Features

- **Linear and Angular Motion**: Full support for velocity, acceleration, and rotation
- **Force and Impulse Application**: Apply forces over time or instant impulses
- **Collision Response**: Automatic impulse-based collision resolution with friction
- **Static Bodies**: Support for immovable objects (walls, floors, etc.)
- **Sleep Optimization**: Bodies automatically sleep when at rest to save performance
- **Material Properties**: Customizable friction and restitution (bounciness)
- **Damping**: Simulates air resistance for realistic motion

## Basic Usage

### Creating a RigidBody

```typescript
import { RigidBody, Vector } from 'craters';

// Create a dynamic body at position (100, 100) with mass 1
const dynamicBody = new RigidBody(
    new Vector(100, 100),  // position
    1,                      // mass
    0.5,                    // restitution (bounciness: 0-1)
    0.3                     // friction (0-1)
);

// Create a static body (immovable, like a wall)
const staticBody = new RigidBody(new Vector(0, 500), 0);
// or
const wall = new RigidBody(new Vector(0, 500), 1).setStatic(true);
```

### Applying Forces

Forces are accumulated and applied during the integration step:

```typescript
// Apply gravity
const gravity = new Vector(0, 9.8);
body.applyForce(gravity);

// Apply a force at a specific point (creates torque/rotation)
const force = new Vector(10, 0);
const point = new Vector(120, 100); // Application point
body.applyForceAtPoint(force, point);
```

### Applying Impulses

Impulses cause instant velocity changes (useful for jumps, explosions, etc.):

```typescript
// Make the body jump
const jumpImpulse = new Vector(0, -500);
body.applyImpulse(jumpImpulse);

// Apply impulse at a point
const explosionImpulse = new Vector(100, -50);
const explosionPoint = new Vector(110, 110);
body.applyImpulseAtPoint(explosionImpulse, explosionPoint);
```

### Physics Integration

Call `integrate()` every frame with your delta time:

```typescript
// In your game loop
const deltaTime = 1/60; // 60 FPS
body.integrate(deltaTime);

// Update the collision shape position to match the rigidbody
polygon.pos.copy(body.position);
polygon.setAngle(body.angle);
```

## Complete Example: Bouncing Box

```typescript
import { RigidBody, Vector, Polygon, Box, Response, testPolygonPolygon } from 'craters';

// Create a falling box
const boxBody = new RigidBody(new Vector(200, 100), 1, 0.7, 0.3);
const boxShape = new Box(new Vector(200, 100), 40, 40).toPolygon();

// Create a static floor
const floorBody = new RigidBody(new Vector(0, 400), 0);
const floorShape = new Box(new Vector(0, 400), 800, 40).toPolygon();

// Game loop
function update(dt) {
    // Apply gravity
    const gravity = new Vector(0, 980); // pixels/s²
    boxBody.applyForce(gravity.clone().scale(boxBody.mass));
    
    // Integrate physics
    boxBody.integrate(dt);
    
    // Update shape position
    boxShape.pos.copy(boxBody.position);
    boxShape.setAngle(boxBody.angle);
    
    // Check collision
    const response = new Response();
    if (testPolygonPolygon(boxShape, floorShape, response)) {
        // Resolve collision
        boxBody.resolveCollision(floorBody, response);
        
        // Update shape position after collision resolution
        boxShape.pos.copy(boxBody.position);
    }
}

// Run at 60 FPS
setInterval(() => update(1/60), 16.67);
```

## Advanced Usage

### Material Properties

```typescript
// Super bouncy ball
const bouncyBall = new RigidBody(new Vector(100, 100), 0.5, 0.95, 0.1);

// Heavy, low-friction object (ice block)
const iceBlock = new RigidBody(new Vector(200, 100), 10, 0.2, 0.05);

// Sticky, low-restitution object
const stickyBox = new RigidBody(new Vector(300, 100), 1, 0.1, 0.9);
```

### Damping (Air Resistance)

```typescript
body.linearDamping = 0.98;  // Less damping = slides farther
body.angularDamping = 0.95; // Less damping = spins longer

// No damping (space-like physics)
body.linearDamping = 1.0;
body.angularDamping = 1.0;
```

### Sleep System

```typescript
// Check if body is sleeping
if (body.isSleeping) {
    console.log("Body is at rest");
}

// Wake up a sleeping body
body.wake();

// Manually put body to sleep
body.setSleeping(true);

// Customize sleep behavior
body.sleepThreshold = 0.005;  // Lower = harder to sleep
body.sleepTimerMax = 120;     // Frames before sleeping
```

### Velocity Control

```typescript
// Set velocity directly
body.setVelocity(50, -100);

// Get current momentum
const momentum = body.getMomentum();
console.log(`Momentum: ${momentum.x}, ${momentum.y}`);

// Get kinetic energy
const energy = body.getKineticEnergy();
console.log(`Energy: ${energy}`);
```

### Working with Shapes

The RigidBody manages physics, while shapes (Polygon, Circle) handle collision detection:

```typescript
// Create body and shape separately
const body = new RigidBody(new Vector(100, 100), 1);
const shape = new Polygon(new Vector(100, 100), [
    new Vector(-20, -20),
    new Vector(20, -20),
    new Vector(20, 20),
    new Vector(-20, 20)
]);

// In update loop, sync shape with body
function syncShapeWithBody(body, shape) {
    shape.pos.copy(body.position);
    shape.setAngle(body.angle);
}
```

## Platformer Example

```typescript
class Player {
    body: RigidBody;
    shape: Polygon;
    grounded: boolean = false;
    
    constructor(x: number, y: number) {
        this.body = new RigidBody(new Vector(x, y), 1, 0, 0.5);
        this.shape = new Box(new Vector(x, y), 32, 48).toPolygon();
    }
    
    jump() {
        if (this.grounded) {
            this.body.applyImpulse(new Vector(0, -600));
            this.grounded = false;
        }
    }
    
    moveLeft() {
        this.body.applyForce(new Vector(-50, 0));
    }
    
    moveRight() {
        this.body.applyForce(new Vector(50, 0));
    }
    
    update(dt: number) {
        // Apply gravity
        this.body.applyForce(new Vector(0, 980 * this.body.mass));
        
        // Integrate
        this.body.integrate(dt);
        
        // Sync shape
        this.shape.pos.copy(this.body.position);
        
        // Check collisions with level geometry...
    }
}
```

## Integration with ECS

If you're using the Craters ECS system:

```typescript
import { World } from 'craters';

// Create components
const PositionComponent = { x: 0, y: 0 };
const RigidBodyComponent = { body: null };
const ShapeComponent = { shape: null };

// Create entity
const world = new World();
const entity = world.createEntity();
world.addComponent(entity, 'position', { x: 100, y: 100 });
world.addComponent(entity, 'rigidbody', {
    body: new RigidBody(new Vector(100, 100), 1)
});
world.addComponent(entity, 'shape', {
    shape: new Box(new Vector(100, 100), 40, 40).toPolygon()
});

// Physics system
function physicsSystem(world, dt) {
    const query = world.query(['rigidbody', 'shape']);
    
    for (const entity of query) {
        const rb = world.getComponent(entity, 'rigidbody').body;
        const shape = world.getComponent(entity, 'shape').shape;
        
        // Apply gravity
        rb.applyForce(new Vector(0, 980 * rb.mass));
        
        // Integrate
        rb.integrate(dt);
        
        // Sync shape with body
        shape.pos.copy(rb.position);
        shape.setAngle(rb.angle);
    }
}
```

## Performance Tips

1. **Use static bodies** for immovable objects to skip physics calculations
2. **Leverage sleep system** - sleeping bodies skip integration
3. **Adjust sleep thresholds** based on your game's scale
4. **Use damping wisely** - higher damping helps bodies settle faster
5. **Batch collision checks** - use QuadTree for spatial partitioning

### 6. Physics Loop & Stability (Sub-stepping)

For stable physics, especially with gravity and stacking, it is highly recommended to use **sub-stepping**. Instead of updating physics once per frame with a large `dt`, update it multiple times with a smaller `dt`.

```typescript
function update(dt: number) {
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let i = 0; i < subSteps; i++) {
        // 1. Apply Forces
        // 2. Integrate (with subDt)
        // 3. Collision Detection & Resolution
    }
}
```

This reduces tunneling (objects passing through walls) and improves the stability of stacks.

### 7. API Reference

### Constructor
- `new RigidBody(position?, mass?, restitution?, friction?)`

### Properties
- `position: Vector` - Current position
- `velocity: Vector` - Current velocity
- `mass: number` - Mass of the body
- `restitution: number` - Bounciness (0-1)
- `friction: number` - Surface friction (0-1)
- `isStatic: boolean` - Whether body is immovable
- `isSleeping: boolean` - Whether body is sleeping

### Methods
- `setStatic(isStatic: boolean): RigidBody`
- `applyForce(force: Vector): void`
- `applyForceAtPoint(force: Vector, point: Vector): void`
- `applyImpulse(impulse: Vector): void`
- `applyImpulseAtPoint(impulse: Vector, point: Vector): void`
- `integrate(dt: number): void`
- `resolveCollision(other: RigidBody, response: Response): void`
- `wake(): void`
- `setSleeping(sleeping: boolean): void`
- `setVelocity(x: number, y: number): RigidBody`
- `setPosition(x: number, y: number): RigidBody`
- `setMass(mass: number): RigidBody`
- `getKineticEnergy(): number`
- `getMomentum(): Vector`
