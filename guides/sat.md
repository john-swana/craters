# SAT Collision Usage Guide

The `SAT` namespace provides narrow-phase collision detection using the **Separating Axis
Theorem**. It supports three shape combinations: polygon–polygon, circle–polygon, and
circle–circle. It is designed to pair with `RigidBody` for physics resolution, and with
`QuadTree` for broad-phase filtering.

## Shapes

All shapes are in the `SAT` namespace:

```typescript
import { SAT } from "craters";
const { Vector, Box, Polygon, Circle, Response,
        testPolygonPolygon, testCirclePolygon, testCircleCircle } = SAT;
```

### Box

An axis-aligned bounding box. Convert to `Polygon` before testing.

```typescript
const box = new Box(new Vector(100, 50), 40, 30); // pos, width, height
const poly = box.toPolygon(); // Polygon centred at (100, 50)
```

### Polygon

A convex polygon defined by a position and a list of local-space vertices.

```typescript
const triangle = new Polygon(
  new Vector(200, 200), // world position
  [new Vector(0, -20), new Vector(20, 20), new Vector(-20, 20)]
);
```

Key methods:
```typescript
polygon.setAngle(Math.PI / 4);        // rotate (recalcs normals/edges)
polygon.setOffset(new Vector(0, -8)); // local offset from pos
polygon.rotate(Math.PI / 6);          // rotate points in place
polygon.translate(5, 0);              // translate points in place
polygon.getAABBAsBox();               // Box — cheap AABB for broad-phase
polygon.getCentroid();                // Vector — centre of mass
```

### Circle

```typescript
const circle = new Circle(new Vector(150, 150), 20); // pos, radius
circle.setOffset(new Vector(0, 0));  // optional local offset
circle.getAABBAsBox();               // Box AABB
```

## Running a Collision Test

Pass a `Response` object to get overlap information. Reuse a single `Response` instance
and call `response.clear()` between tests to avoid allocations.

```typescript
const response = new Response();

// Polygon vs Polygon
if (testPolygonPolygon(shapeA, shapeB, response)) {
  console.log("Overlap:", response.overlap);
  console.log("Normal:", response.overlapN);
  console.log("Vector:", response.overlapV);
}

// Circle vs Polygon
if (testCirclePolygon(circle, polygon, response)) { ... }

// Circle vs Circle
if (testCircleCircle(circleA, circleB, response)) { ... }
```

Pass `null` instead of a `Response` for a boolean-only existence test (faster):

```typescript
if (testPolygonPolygon(shapeA, shapeB, null)) {
  // collision occurred
}
```

## Response Object

| Field | Type | Description |
|---|---|---|
| `overlap` | `number` | Penetration depth |
| `overlapN` | `Vector` | Collision normal (unit vector, points from B toward A) |
| `overlapV` | `Vector` | `overlapN × overlap` — minimum separation vector |
| `aInB` | `boolean` | Whether shape A is fully inside B |
| `bInA` | `boolean` | Whether shape B is fully inside A |
| `contactPoint` | `Vector` | Approximate world-space contact point |

## Syncing Shapes with RigidBody

`RigidBody` owns position and velocity; shapes track geometry. After integrating physics,
copy the body position to the shape's `pos`:

```typescript
body.integrate(dt);
shape.pos.copy(body.position);
shape.setAngle(body.angle);
```

## Complete Example: Bouncing Ball

```typescript
import { SAT, RenderLoop, Canvas2DRenderer } from "craters";
const { Vector, Circle, Box, testCirclePolygon, Response } = SAT;

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);

const ballPos = new Vector(400, 100);
const ballVel = new Vector(3, 0);
const ball    = new Circle(ballPos, 16);

const floor   = new Box(new Vector(0, 560), 800, 40).toPolygon();
const response = new Response();

new RenderLoop((loop) => {
  // Physics
  ballVel.y += 0.3; // gravity
  ballPos.x += ballVel.x;
  ballPos.y += ballVel.y;

  // Collision
  response.clear();
  if (testCirclePolygon(ball, floor, response)) {
    ballPos.sub(response.overlapV);
    ballVel.y *= -0.7; // bounce
  }

  // Render
  renderer.clear("rgba(10,10,20,1)");
  renderer.drawCircle(ballPos.x, ballPos.y, 16, "cyan", true);
  renderer.drawRect(0, 560, 800, 40, "grey", true);
});
```

## Integration with QuadTree (Broad-Phase)

Use `QuadTree` to avoid testing every pair. Only shapes returned by `retrieve()` need a SAT test.

```typescript
import { QuadTree, SAT } from "craters";
const { Box, Vector, testPolygonPolygon, Response } = SAT;

const qt = new QuadTree.QuadTree(new Box(new Vector(0, 0), 800, 600));
const response = new Response();

// Each frame
qt.clear();
entities.forEach(e => qt.insert(e));

entities.forEach(a => {
  const candidates = qt.retrieve([], a);
  candidates.forEach(b => {
    if (a === b) return;
    response.clear();
    if (testPolygonPolygon(a.shape, b.shape, response)) {
      a.body.resolveCollision(b.body, response);
    }
  });
});
```

## API Reference

### Shapes
- `new Box(pos, w, h)` → `toPolygon()`
- `new Polygon(pos, points[])` → `setAngle()`, `setOffset()`, `rotate()`, `translate()`, `getAABBAsBox()`, `getCentroid()`
- `new Circle(pos, r)` → `setOffset()`, `getAABBAsBox()`

### Test Functions
- `testPolygonPolygon(a, b, response?): boolean`
- `testCirclePolygon(circle, polygon, response?): boolean`
- `testCircleCircle(a, b, response?): boolean`

### `Response`
- `clear()` — reset for reuse
- `overlap`, `overlapN`, `overlapV`, `aInB`, `bInA`, `contactPoint`
