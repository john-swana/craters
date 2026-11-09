# SAT Collision Usage Guide

The `SAT` namespace provides narrow-phase collision detection using the **Separating Axis
Theorem**. It supports three shape combinations: polygon–polygon, circle–polygon, and
circle–circle. It is designed to pair with `RigidBody` for physics resolution, and with
`QuadTree` for broad-phase filtering.

## Shapes

All shapes are in the `SAT` namespace. They are not top-level exports of `craters`:

```typescript
import { SAT } from "craters";
const { Vector, Box, Polygon, Circle, Response,
        testPolygonPolygon, testCirclePolygon, testCircleCircle } = SAT;

// In type annotations, use the namespace: SAT.Polygon, SAT.Circle, SAT.Response
```

### Box

An axis-aligned box described by its top-left corner and size. Convert it to a `Polygon`
before testing.

```typescript
const box = new Box(new Vector(100, 50), 40, 30); // top-left pos, width, height
const poly = box.toPolygon(); // pos (100, 50), points (0,0) (40,0) (40,30) (0,30)
                              // so the polygon covers (100, 50)–(140, 80), centre (120, 65)
```

The polygon's `pos` is the box's top-left corner, and `setAngle()` rotates about that corner.
To make `pos` the centre, and rotate about it, offset the polygon by half its size:
`box.toPolygon().setOffset(new Vector(-20, -15))`. The polygon then extends 20 px and 15 px
on each side of `pos`.

### Polygon

A convex polygon defined by a position and a list of local-space vertices.

```typescript
const triangle = new Polygon(
  new Vector(200, 200), // world position
  [new Vector(0, -20), new Vector(20, 20), new Vector(-20, 20)]
);
```

Key methods. Each setter or transform rebuilds the polygon's world-ready points, edges and
normals:
```typescript
polygon.setAngle(Math.PI / 4);        // rotate about the local origin (pos); offset rotates too
polygon.setOffset(new Vector(0, -8)); // local offset from pos, applied before rotation
polygon.rotate(Math.PI / 6);          // rotate the points themselves (mutates the point Vectors)
polygon.translate(5, 0);              // translate the points themselves
polygon.setPoints([new Vector(0, 0), new Vector(10, 0), new Vector(0, 10)]); // replace points
polygon.getAABBAsBox();               // Box: cheap world-space AABB for broad-phase
polygon.getAABB();                    // the same AABB as a Polygon
polygon.getCentroid();                // Vector: world-space centre of mass
```

If you edit `polygon.points` directly, call `polygon.setPoints(polygon.points)` afterwards so
the collision data is rebuilt.

### Circle

```typescript
const circle = new Circle(new Vector(150, 150), 20); // centre pos, radius
circle.setOffset(new Vector(0, 0));  // optional local offset of the centre
circle.getAABBAsBox();               // Box AABB
circle.getAABB();                    // the same AABB as a Polygon
```

## Running a Collision Test

Pass a `Response` object to get overlap information. Reuse a single `Response` instance and
call `response.clear()` **before every test**. Clearing is needed for correct results, not just
to save allocations: `testPolygonPolygon` only overwrites the stored overlap when it finds a
smaller one, so an uncleared response keeps the previous pair's overlap and normal.

```typescript
const response = new Response();

// Polygon vs Polygon
response.clear();
if (testPolygonPolygon(shapeA, shapeB, response)) {
  console.log("Overlap:", response.overlap);
  console.log("Normal:", response.overlapN);
  console.log("Vector:", response.overlapV);
}

// Circle vs Polygon (the circle is always the first argument)
response.clear();
if (testCirclePolygon(circle, polygon, response)) { /* ... */ }

// Circle vs Circle
response.clear();
if (testCircleCircle(circleA, circleB, response)) { /* ... */ }
```

There is no polygon-vs-circle function. Call `testCirclePolygon(circle, polygon)` and treat the
circle as shape A.

Pass `null`, or omit the argument, for a boolean-only existence test (faster):

```typescript
if (testPolygonPolygon(shapeA, shapeB, null)) {
  // collision occurred
}
```

Contact points are opt-in. Pass `true` as the fourth argument to fill `response.contactPoint`:

```typescript
response.clear();
if (testPolygonPolygon(shapeA, shapeB, response, true)) {
  console.log("Contact:", response.contactPoint);
}
```

## Response Object

| Field | Type | Description |
|---|---|---|
| `a`, `b` | `Polygon \| Circle \| null` | The two shapes tested, in argument order |
| `overlap` | `number` | Penetration depth (`Number.MAX_VALUE` after `clear()`) |
| `overlapN` | `Vector` | Collision normal: unit vector pointing **from A toward B** |
| `overlapV` | `Vector` | `overlapN × overlap`: subtract it from A's position (or add it to B's) to separate them |
| `aInB` | `boolean` | Whether shape A is fully inside B |
| `bInA` | `boolean` | Whether shape B is fully inside A |
| `contactPoint` | `Vector` | Approximate world-space contact point, written only when `computeContactPoint` is `true` |

Notes:
- For `testCirclePolygon`, A is the circle: `aInB` means the circle is fully inside the
  polygon, and `bInA` means the polygon is fully inside the circle.
- `testCirclePolygon` replaces `response.overlapN` and `response.overlapV` with new `Vector`
  objects. Read them from the response after each test rather than keeping references.
- With `computeContactPoint` on, the contact point is computed as follows:
  - **Polygon–polygon:** the average of A's deepest vertices along the normal.
  - **Circle–polygon:** the polygon vertex closest to the circle's centre.
  - **Circle–circle:** the point on B's edge facing A.

  Without the flag, `contactPoint` is left untouched, which is `(0, 0)` after `clear()`.

## Syncing Shapes with RigidBody

`RigidBody` owns position and velocity, and shapes track geometry. After integrating physics,
copy the body position to the shape's `pos`:

```typescript
body.integrate(dt); // dt in seconds (loop.deltaSeconds)
shape.pos.copy(body.position);
shape.setAngle(body.angle);
```

To resolve a collision, call `resolveCollision` on the body that owns shape **A**:
`bodyA.resolveCollision(bodyB, response)`, where `response` came from
`testPolygonPolygon(shapeA, shapeB, response)`. See the RigidBody guide for what it does.

## Complete Example: Bouncing Ball

```typescript
import { SAT, RenderLoop, Canvas2DRenderer } from "craters";
const { Vector, Circle, Box, testCirclePolygon, Response } = SAT;

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);

const ballPos = new Vector(400, 100);
const ballVel = new Vector(180, 0);       // px/s
const ball    = new Circle(ballPos, 16);  // shares ballPos, so moving ballPos moves the circle
const gravity = 980;                      // px/s²

const floor   = new Box(new Vector(0, 560), 800, 40).toPolygon();
const response = new Response();

new RenderLoop((loop) => {
  const dt = loop.deltaSeconds;

  // Physics
  ballVel.y += gravity * dt;
  ballPos.x += ballVel.x * dt;
  ballPos.y += ballVel.y * dt;
  if (ballPos.x < 16 || ballPos.x > 784) ballVel.x *= -1; // side walls

  // Collision: overlapN points from the ball (A) toward the floor (B)
  response.clear();
  if (testCirclePolygon(ball, floor, response)) {
    ballPos.sub(response.overlapV);         // push the ball out of the floor
    if (ballVel.y > 0) ballVel.y *= -0.7;   // bounce only while moving into it
  }

  // Render
  renderer.clear("rgba(10,10,20,1)");
  renderer.drawCircle(ballPos.x, ballPos.y, 16, "cyan", true);
  renderer.drawRect(0, 560, 800, 40, "grey", true);
});
```

## Integration with QuadTree (Broad-Phase)

Use `QuadTree` to avoid testing every pair. Objects inserted into the tree must implement
`getAABBAsBox()`, and the tree should cover the whole world: objects entirely outside its
bounds are not stored. `retrieve()` can return the same object more than once when it straddles
a node boundary. `retrieveUnique()` removes those duplicates.

```typescript
import { QuadTree, SAT } from "craters";
const { Box, Vector, testPolygonPolygon, Response } = SAT;

interface PhysicsEntity extends QuadTree.QuadTreeObject {
  id: number;
  shape: SAT.Polygon;
  body: SAT.RigidBody;
}

const entities: PhysicsEntity[] = [];
function addEntity(shape: SAT.Polygon, body: SAT.RigidBody): void {
  entities.push({ id: entities.length, shape, body, getAABBAsBox: () => shape.getAABBAsBox() });
}

const qt = new QuadTree.QuadTree(new Box(new Vector(0, 0), 800, 600));
const response = new Response();

// Each step, after integrating and syncing shapes
qt.clear();
entities.forEach(e => qt.insert(e));

entities.forEach(a => {
  qt.retrieveUnique(a).forEach(obj => {
    const b = obj as PhysicsEntity;
    if (b.id <= a.id) return; // skips a itself, and handles each pair only once
    response.clear();
    if (testPolygonPolygon(a.shape, b.shape, response)) {
      a.body.resolveCollision(b.body, response);
      a.shape.pos.copy(a.body.position);
      b.shape.pos.copy(b.body.position);
    }
  });
});
```

## API Reference

### Shapes
- `new Box(pos = new Vector(), w = 0, h = 0)`: `pos` is the top-left corner
  - `toPolygon(): Polygon`
  - fields `pos`, `w`, `h`
- `new Polygon(pos = new Vector(), points: Vector[] = [])`
  - `setPoints(points)`, `setAngle(angle)`, `setOffset(offset)`, `rotate(angle)`, `translate(x, y)`: each returns the polygon
  - `getAABB(): Polygon`, `getAABBAsBox(): Box`, `getCentroid(): Vector`
  - fields `pos`, `angle`, `offset`, `points`
  - derived fields `calcPoints`, `edges`, `normals`: rebuilt by the methods above
- `new Circle(pos = new Vector(), r = 0)`: `pos` is the centre
  - `setOffset(offset): Circle`, `getAABB(): Polygon`, `getAABBAsBox(): Box`
  - fields `pos`, `r`, `offset`

### Test Functions
All return `true` on overlap and fill `response` if one is given.
- `testPolygonPolygon(a: Polygon, b: Polygon, response: Response | null = null, computeContactPoint = false): boolean`
- `testCirclePolygon(circle: Circle, polygon: Polygon, response: Response | null = null, computeContactPoint = false): boolean`
- `testCircleCircle(a: Circle, b: Circle, response: Response | null = null, computeContactPoint = false): boolean`

### `Response`
- `new Response()`
- `clear()`: reset before each reuse
- `a`, `b`, `overlap`, `overlapN`, `overlapV`, `aInB`, `bInA`, `contactPoint`
