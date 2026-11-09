# QuadTree Usage Guide

`QuadTree` partitions 2D space recursively to accelerate broad-phase collision detection.
Instead of testing every entity pair (O(n²)), objects are inserted into a spatial index
and only nearby candidates are retrieved for expensive narrow-phase tests.

## How It Works

The tree subdivides a rectangular region into four quadrants whenever a node exceeds its
`capacity`, until nodes reach `maxLevels` depth. Objects can span multiple quadrants and are stored
in all of them. `retrieve()` returns all objects that share at least one quadrant with the query
object — these are the only candidates that need SAT testing. Because an object that straddles a
boundary is stored in several quadrants, `retrieve()` can return it more than once;
`retrieveUnique()` removes the duplicates. A box with zero width or height lying exactly on a split
line counts as touching both sides of it.

## Setup

```typescript
import { QuadTree, SAT, RenderLoop, Canvas2DRenderer } from "craters";
const { Box, Vector } = SAT;

// Define the world bounds (should cover the entire gameplay area)
const worldBounds = new Box(new Vector(0, 0), 1600, 1200);
const qt = new QuadTree.QuadTree(worldBounds);
```

Constructor options:
```typescript
new QuadTree.QuadTree(
  bounds,       // Box — world AABB
  capacity,     // objects per node before splitting (default 4)
  level,        // starting depth — always 0 for root (default 0)
  maxLevels     // maximum recursion depth (default 5)
);
```

Bounds are not enforced. An object outside them is still stored, but it is routed into the node on
the nearest edge or corner, so such objects pile up there and get little benefit from partitioning.

## The QuadTreeObject Interface

Any object inserted into the tree must implement `QuadTreeObject`:

```typescript
interface QuadTreeObject {
  getAABBAsBox(): Box;
}
```

`Polygon` and `Circle` both implement this via their `getAABBAsBox()` method. Wrap your
entity if needed:

```typescript
class Entity implements QuadTree.QuadTreeObject {
  constructor(public shape: SAT.Polygon, public body: SAT.RigidBody) {}

  getAABBAsBox(): SAT.Box {
    return this.shape.getAABBAsBox();
  }

  draw(renderer: Canvas2DRenderer): void {
    // ... draw this.shape
  }
}
```

## Per-Frame Usage

Clear and rebuild the tree each frame, then test candidates:

```typescript
const response = new SAT.Response();

new RenderLoop((loop) => {
  // 1. Rebuild tree
  qt.clear();
  entities.forEach(e => qt.insert(e));

  // 2. Broad-phase → narrow-phase, testing each pair once
  const done = new Set<Entity>();
  entities.forEach(a => {
    // retrieveUnique() drops duplicates; the tree only holds Entity objects
    const candidates = qt.retrieveUnique(a) as Entity[];

    candidates.forEach(b => {
      if (a === b || done.has(b)) return; // skip self and pairs already tested

      response.clear();
      if (SAT.testPolygonPolygon(a.shape, b.shape, response)) {
        a.body.resolveCollision(b.body, response);
        // Update shape positions after resolution
        a.shape.pos.copy(a.body.position);
        b.shape.pos.copy(b.body.position);
      }
    });
    done.add(a);
  });

  // 3. Render
  renderer.clear();
  entities.forEach(e => e.draw(renderer));
});
```

Using `retrieve()` here instead would resolve a colliding pair several times per frame whenever the
pair straddles a quadrant boundary.

## Tuning

| Parameter | Effect |
|---|---|
| `capacity` (default 4) | Lower = more subdivisions, fewer candidates per retrieve; higher = fewer nodes, more candidates |
| `maxLevels` (default 5) | Limits tree depth. Deeper = finer partitioning, more memory. Nodes at `maxLevels` never split |

For a 1600×1200 world with 200 entities, the defaults are a reasonable starting point. For very
dense scenes, try a capacity of 6 and 6 levels. The arguments are positional:
`new QuadTree.QuadTree(worldBounds, 6, 0, 6)`.

## Debug Visualisation

`getAllBounds()` returns the `Box` of every node in the tree — useful for drawing the
partition grid as an overlay. `drawRect()` is a `Canvas2DRenderer` method; `WebGLRenderer` has
no equivalent.

```typescript
const bounds = qt.getAllBounds();
bounds.forEach(b => {
  renderer.drawRect(b.pos.x, b.pos.y, b.w, b.h, "rgba(0,255,0,0.15)");
});
```

## API Reference

### `new QuadTree.QuadTree(bounds: Box, capacity = 4, level = 0, maxLevels = 5)`

`level` is the depth of the node: pass `0` (or omit it) for the root; child nodes are created
internally.

### `insert(obj: QuadTreeObject): void`

Inserts an object into every leaf it overlaps. If a node overflows `capacity` and is below
`maxLevels`, it splits and re-distributes.

### `retrieve(returnObjects: QuadTreeObject[], obj: QuadTreeObject): QuadTreeObject[]`

Appends all objects that share a leaf with `obj` to `returnObjects` and returns that array. A
boundary-straddling object appears once per leaf, and `obj` itself is included if it is in the
tree. The array is not cleared: pass a fresh `[]` on every call, or empty a reused array
(`results.length = 0`) before each call.

### `retrieveUnique(obj: QuadTreeObject): QuadTreeObject[]`

Like `retrieve()` with a fresh array, but each object appears at most once. Prefer this for
collision checks.

### `clear(): void`

Removes all objects and child nodes. Call at the start of each frame before re-inserting.

### `getAllBounds(boundsList: Box[] = []): Box[]`

Appends the AABB of every node in the tree to `boundsList` and returns it, useful for debug
rendering.
