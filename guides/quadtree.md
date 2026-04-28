# QuadTree Usage Guide

`QuadTree` partitions 2D space recursively to accelerate broad-phase collision detection.
Instead of testing every entity pair (O(n²)), objects are inserted into a spatial index
and only nearby candidates are retrieved for expensive narrow-phase tests.

## How It Works

The tree subdivides a rectangular region into four quadrants whenever a node exceeds its
`capacity`. Objects can span multiple quadrants and are stored in all of them. `retrieve()`
returns all objects that share at least one quadrant with the query object — these are the
only candidates that need SAT testing.

## Setup

```typescript
import { QuadTree, SAT } from "craters";
const { Box, Vector } = SAT;

// Define the world bounds (must cover the entire gameplay area)
const worldBounds = new Box(new Vector(0, 0), 1600, 1200);
const qt = new QuadTree.QuadTree(worldBounds);
```

Constructor options:
```typescript
new QuadTree.QuadTree(
  bounds,       // Box — world AABB
  capacity,     // objects per node before splitting (default 4)
  level,        // starting depth — always 0 for root
  maxLevels     // maximum recursion depth (default 5)
);
```

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
  shape: SAT.Polygon;

  getAABBAsBox(): SAT.Box {
    return this.shape.getAABBAsBox();
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

  // 2. Broad-phase → narrow-phase per entity
  entities.forEach(a => {
    const candidates: QuadTree.QuadTreeObject[] = [];
    qt.retrieve(candidates, a);

    candidates.forEach(b => {
      if (a === b) return; // skip self

      response.clear();
      if (SAT.testPolygonPolygon(a.shape, b.shape, response)) {
        a.body.resolveCollision(b.body, response);
        // Update shape positions after resolution
        a.shape.pos.copy(a.body.position);
        b.shape.pos.copy(b.body.position);
      }
    });
  });

  // 3. Render
  renderer.clear();
  entities.forEach(e => e.draw(renderer));
});
```

## Tuning

| Parameter | Effect |
|---|---|
| `capacity` (default 4) | Lower = more subdivisions, fewer candidates per retrieve; higher = fewer nodes, more candidates |
| `maxLevels` (default 5) | Limits tree depth. Deeper = finer partitioning, more memory |

For a 1600×1200 world with 200 entities, the defaults work well. For very dense scenes,
try `capacity: 6, maxLevels: 6`.

## Debug Visualisation

`getAllBounds()` returns the `Box` of every node in the tree — useful for drawing the
partition grid as an overlay.

```typescript
const bounds = qt.getAllBounds();
bounds.forEach(b => {
  renderer.drawRect(b.pos.x, b.pos.y, b.w, b.h, "rgba(0,255,0,0.15)");
});
```

## API Reference

### `new QuadTree.QuadTree(bounds, capacity?, level?, maxLevels?)`

### `insert(obj: QuadTreeObject)`

Inserts an object. If the node overflows `capacity`, it splits and re-distributes.

### `retrieve(results: QuadTreeObject[], obj: QuadTreeObject): QuadTreeObject[]`

Populates and returns `results` with all objects that share a node with `obj`.
Always pass a fresh `[]` or reuse one cleared before the entity loop.

### `clear()`

Removes all objects and child nodes. Call at the start of each frame before re-inserting.

### `getAllBounds(list?): Box[]`

Returns the AABB of every node in the tree, useful for debug rendering.
