# Sprite Usage Guide

`Sprite` animates a spritesheet by sequencing through grid cells of a `Tile`. Each animation
frame is identified by a `[row, column]` pair in the sheet's grid, and the active frame
advances automatically based on `RenderLoop.elapsed`.

## How It Works

On construction, `Sprite` divides the source image into a grid of `sWidth × sHeight` cells:
`ceil(image.height / sHeight)` rows by `ceil(image.width / sWidth)` columns. `draw()` picks the
current frame from the `frames` sequence, looks up the grid cell, and calls `Tile.draw()` with
the correct source region. A `[row, column]` outside the grid draws nothing, without an error.

## Basic Setup

```typescript
import { Sprite, Canvas2DRenderer, AssetsManager, RenderLoop } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
const assets   = new AssetsManager();

// Spritesheet: 192×128 px, 4 frames across, 2 rows (row 0 = idle, row 1 = run),
// each frame 48×64 px
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

To animate, `draw()` needs the `RenderLoop` instance. It picks the frame from `loop.elapsed`
(milliseconds): `frames[floor(elapsed / 1000 / duration) % frames.length]`. The frame
advances every `duration` seconds of loop time. Draw inside the `RenderLoop` callback, which
runs once per fixed step.

```typescript
const loop = new RenderLoop((loop) => {
  renderer.clear();
  playerSprite.draw(playerX, playerY, loop);
});
```

## Pinning a Specific Frame

Pass a `frameIndex` to override the auto-animation and display a fixed frame. The
`renderLoop` argument is then optional:

```typescript
// Always show the idle frame [row 0, col 0]
playerSprite.draw(playerX, playerY, loop, [0, 0]);
playerSprite.draw(playerX, playerY, undefined, [0, 0]); // same, without a loop
```

This is useful when the animation row depends on game state:

```typescript
const row = isRunning ? 1 : 0; // 0 = idle, 1 = run
const frameCol = Math.floor((loop.elapsed / 1000 / 0.1) % 4); // 4 frames per row
playerSprite.draw(playerX, playerY, loop, [row, frameCol]);
```

## Source Inset (Anti-bleed)

The optional `sourceInset` parameter (default `0`) trims that many pixels from each edge of
the sampled source cell (`0.5` = half a texel). The destination size is unchanged. This stops
pixels of neighbouring cells in the atlas showing at the tile's edges at certain sub-pixel
alignments on mobile.

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

Each `Sprite` builds its own `Tile`. With `WebGLRenderer` that means one texture upload per
`Sprite`, even when they share an image.

## API Reference

### `new Sprite(renderer, image, sWidth, sHeight, frames, duration, dWidth, dHeight)`

| Parameter | Description |
|---|---|
| `renderer` | Any `Renderer` (`Canvas2DRenderer` or `WebGLRenderer`) |
| `image` | Source spritesheet as `HTMLImageElement` |
| `sWidth` / `sHeight` | Width and height of a single frame in the source sheet |
| `frames` | Array of `[row, col]` pairs defining the animation sequence |
| `duration` | Seconds each frame is displayed |
| `dWidth` / `dHeight` | Destination draw size |

### `draw(dX, dY, renderLoop?, frameIndex?, sourceInset?)`

| Parameter | Default | Description |
|---|---|---|
| `dX` / `dY` | — | Destination position |
| `renderLoop` | — | `RenderLoop` instance used to pick the animated frame; required unless `frameIndex` is given |
| `frameIndex` | auto | Override with a `[row, col]` pair to pin a specific frame |
| `sourceInset` | `0` | Pixels trimmed from each edge of the source cell |

After each call, `sprite.index` holds the `[row, col]` selected by that call.
