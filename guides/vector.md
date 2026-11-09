# Vector Usage Guide

`Vector` is the shared 2D math primitive used throughout Craters — physics, collision, rendering
offsets, and input positions all use it. Every mutating method changes the vector in place and
returns `this`, enabling method chaining. `clone()` returns a new vector, and `dot()`, `len()`
and `len2()` return numbers.

Craters draws in canvas coordinates (x grows right, **y grows down**). The rotation notes below
assume that convention.

## Creating Vectors

```typescript
import { SAT } from "craters";
const { Vector } = SAT;

const zero = new Vector();          // (0, 0): x and y default to 0
const pos  = new Vector(100, 200);  // (100, 200)
const copy = pos.clone();           // independent copy

// In type annotations, use the namespace: SAT.Vector
function midpoint(a: SAT.Vector, b: SAT.Vector): SAT.Vector {
  return a.clone().add(b).scale(0.5);
}
```

## Arithmetic

```typescript
const a = new Vector(3, 4);
const b = new Vector(1, 2);

a.add(b);           // a → (4, 6)   mutates in place
a.sub(b);           // a → (3, 4)
a.scale(2);         // a → (6, 8)
a.scale(2, 0.5);    // a → (12, 4)  different x / y scale
a.reverse();        // a → (-12, -4)
```

## Length and Normalisation

```typescript
const v = new Vector(3, 4);

v.len();    // 5
v.len2();   // 25  (squared — cheaper, avoids sqrt)
v.dot(new Vector(1, 0));  // 3

v.normalize();  // v → (0.6, 0.8) — unit vector in place
```

## Rotation and Reflection

```typescript
const v = new Vector(1, 0);

v.rotate(Math.PI / 2);  // v → (0, 1)  — radians; positive turns clockwise on a y-down screen

const axis = new Vector(1, 0);
v.reflect(axis);   // mirrors v across the line through axis: (0, 1) → (0, -1)
v.reflectN(axis);  // same, for a unit-length axis (skips the division by axis.len2())

v.perp();          // (x, y) → (y, -x): same as rotate(-Math.PI / 2), counter-clockwise on screen
```

`reflect`/`reflectN` keep the component along `axis` and negate the perpendicular one. To
bounce a velocity off a surface, pass the surface direction (tangent), not its normal. With a
unit normal `n`, use `v.reflectN(n).reverse()`:

```typescript
const vel = new Vector(10, 10);         // moving right and down
const floorNormal = new Vector(0, -1);  // unit normal of a floor
vel.reflectN(floorNormal).reverse();    // vel → (10, -10), bounced up
```

## Projection

```typescript
const v    = new Vector(3, 4);
const axis = new Vector(1, 0);

v.project(axis);   // projects onto axis (any non-zero length; a zero axis gives NaN)
v.projectN(axis);  // projects onto axis, which must be unit length
```

## Copy and Clone

```typescript
const a = new Vector(1, 2);
const b = new Vector();

b.copy(a);   // b → (1, 2); returns b itself
const c = a.clone();  // new Vector(1, 2), independent
```

## Chaining

Because every mutating method returns `this`, calls can be chained:

```typescript
const velocity = new Vector(5, 0)
  .rotate(Math.PI / 4)   // 45°
  .scale(2)              // double magnitude
  .add(new Vector(0, 1)); // add gravity offset
```

## Common Patterns

### Applying gravity in a physics step

```typescript
const gravity = new Vector(0, 980);           // px/s²
velocity.add(gravity.clone().scale(dt));      // dt in seconds
position.add(velocity.clone().scale(dt));
```

### Direction from A to B, normalised

```typescript
const dir = b.clone().sub(a).normalize();
```

### Distance between two points

```typescript
const dist = b.clone().sub(a).len();
```

## API Reference

| Member | Returns | Description |
|---|---|---|
| `new Vector(x = 0, y = 0)` | `Vector` | Creates a vector |
| `x`, `y` | `number` | Components (public, writable) |
| `clone()` | `Vector` | Returns a new independent copy |
| `copy(other)` | `this` | Copies `other` into this vector |
| `add(other)` | `this` | Adds `other` component-wise |
| `sub(other)` | `this` | Subtracts `other` component-wise |
| `scale(x, y?)` | `this` | Multiplies components (`y` defaults to `x`) |
| `reverse()` | `this` | Negates both components |
| `normalize()` | `this` | Scales to unit length (no-op if zero) |
| `dot(other)` | `number` | Dot product |
| `len()` | `number` | Euclidean length |
| `len2()` | `number` | Squared length |
| `perp()` | `this` | `(x, y) → (y, -x)`, i.e. `rotate(-π/2)` |
| `rotate(angle)` | `this` | Rotates by `angle` radians (standard rotation matrix; clockwise on a y-down screen) |
| `project(axis)` | `this` | Projects onto `axis` (any non-zero length) |
| `projectN(axis)` | `this` | Projects onto unit-length `axis` |
| `reflect(axis)` | `this` | Mirrors across the line through `axis` |
| `reflectN(axis)` | `this` | Mirrors across the line through unit-length `axis` |
