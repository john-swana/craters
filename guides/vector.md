# Vector Usage Guide

`Vector` is the shared 2D math primitive used throughout Craters — physics, collision, rendering
offsets, and input positions all use it. Every method mutates the vector in place and returns
`this`, enabling method chaining.

## Creating Vectors

```typescript
import { SAT } from "craters";
const { Vector } = SAT;

const zero = new Vector();          // (0, 0)
const pos  = new Vector(100, 200);  // (100, 200)
const copy = pos.clone();           // independent copy
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

v.rotate(Math.PI / 2);  // v → (0, 1)  — rotates by angle in radians

const axis = new Vector(1, 0);
v.reflect(axis);   // reflects against axis using projection
v.reflectN(axis);  // reflects against normalised axis (skips len division)

v.perp();          // rotates 90° CCW in place
```

## Projection

```typescript
const v    = new Vector(3, 4);
const axis = new Vector(1, 0);

v.project(axis);   // projects onto axis (axis need not be normalised)
v.projectN(axis);  // projects onto normalised axis
```

## Copy and Clone

```typescript
const a = new Vector(1, 2);
const b = new Vector();

b.copy(a);   // b → (1, 2), same object as b
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
const gravity = new Vector(0, 9.8);
velocity.add(gravity.clone().scale(dt));
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

| Method | Returns | Description |
|---|---|---|
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
| `perp()` | `this` | Rotates 90° CCW |
| `rotate(angle)` | `this` | Rotates by `angle` radians |
| `project(axis)` | `this` | Projects onto `axis` |
| `projectN(axis)` | `this` | Projects onto normalised `axis` |
| `reflect(axis)` | `this` | Reflects about `axis` |
| `reflectN(axis)` | `this` | Reflects about normalised `axis` |
