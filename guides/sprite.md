# Sprite Usage Guide

`Sprite` animates a spritesheet by sequencing through grid cells of a `Tile`. Each animation
frame is identified by a `[row, column]` pair in the sheet's grid, and the active frame
advances automatically based on `RenderLoop.elapsed`.

## How It Works

On construction, `Sprite` divides the source image into a grid of `sWidth × sHeight` cells
and stores each cell as a `GridCell` with position data. `draw()` picks the current frame
index from the `frames` sequence, looks up the grid cell, and calls `Tile.draw()` with the
correct source region.

## Basic Setup

```typescript
import { Sprite, Canvas2DRenderer, AssetsManager, RenderLoop } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
const assets   = new AssetsManager();

// Spritesheet: 192×64 px, 4 frames across, 2 rows, each frame 48×64 px
const img = await assets.loadImage("player.png");

const playerSprite = new Sprite(
  renderer,
  img,
  48, 64,   // source frame size (sWidth, sHeight)
  [[0, 0], [0, 1], [0, 2], [0, 3]],  // frames: [row, col] pairs
  0.1,      // duration per frame in seconds
  48, 64    // destination draw size (dWidth, dHeight)
);
```

## Drawing in the Game Loop

`draw()` requires the `RenderLoop` instance so it can calculate the current frame from
`loop.elapsed`. The frame advances every `duration` seconds.

```typescript
const loop = new RenderLoop((loop) => {
  renderer.clear();
  playerSprite.draw(playerX, playerY, loop);
});
```

## Pinning a Specific Frame

Pass a `frameIndex` to override the auto-animation and display a fixed frame:

```typescript
// Always show the idle frame [row 0, col 0]
playerSprite.draw(playerX, playerY, loop, [0, 0]);
```

This is useful for directional sprites where the animation row depends on movement direction:

```typescript
const row = movingLeft ? 1 : movingRight ? 2 : 0; // 0 = idle, 1 = left, 2 = right
const frameCol = Math.floor((loop.elapsed / 1000 / 0.1) % 4); // 4 frames per row
playerSprite.draw(playerX, playerY, loop, [row, frameCol]);
```

## Source Inset (Anti-bleed)

The optional `sourceInset` parameter (default `0`) shrinks the sampled source region by a
half-texel on each edge. This prevents the bilinear sampler from bleeding pixels from
adjacent tiles in the atlas, which is visible at certain sub-pixel alignments on mobile.

```typescript
playerSprite.draw(playerX, playerY, loop, undefined, 0.5);
```

## Multiple Animations

Define separate `Sprite` instances for each animation state, sharing the same source image:

```typescript
const idleSprite = new Sprite(renderer, img, 48, 64, [[0, 0], [0, 1]], 0.3, 48, 64);
const runSprite  = new Sprite(renderer, img, 48, 64, [[1, 0], [1, 1], [1, 2], [1, 3]], 0.08, 48, 64);

new RenderLoop((loop) => {
  renderer.clear();
  const sprite = isRunning ? runSprite : idleSprite;
  sprite.draw(playerX, playerY, loop);
});
```

## API Reference

### `new Sprite(renderer, image, sWidth, sHeight, frames, duration, dWidth, dHeight)`

| Parameter | Description |
|---|---|
| `renderer` | `Canvas2DRenderer` to draw onto |
| `image` | Source spritesheet as `HTMLImageElement` |
| `sWidth` / `sHeight` | Width and height of a single frame in the source sheet |
| `frames` | Array of `[row, col]` pairs defining the animation sequence |
| `duration` | Seconds each frame is displayed |
| `dWidth` / `dHeight` | Destination draw size |

### `draw(dX, dY, renderLoop, frameIndex?, sourceInset?)`

| Parameter | Default | Description |
|---|---|---|
| `dX` / `dY` | — | Destination position |
| `renderLoop` | — | `RenderLoop` instance (used to advance the frame) |
| `frameIndex` | auto | Override with a `[row, col]` pair to pin a specific frame |
| `sourceInset` | `0` | Half-texel inset to prevent atlas bleeding |
