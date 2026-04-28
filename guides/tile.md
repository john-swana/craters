# Tile Usage Guide

`Tile` is the fundamental drawing primitive in Craters. It wraps an image source (or canvas /
`ImageBitmap`) and draws a rectangular region of it onto a `Canvas2DRenderer`. `Sprite`,
`FontManager`, and `TilemapManager` all build on top of `Tile`.

## What Tile Does

On construction, `Tile` creates an internal canvas of the source image's size, clips it to a
polygon path, and optionally tiles it with a CSS repeat pattern. The resulting canvas is stored
as the final source image. All subsequent `draw()` calls use this pre-processed image — so
construction is the expensive step, not drawing.

## Basic Usage

```typescript
import { Tile, Canvas2DRenderer, AssetsManager } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
const assets   = new AssetsManager();
const img      = await assets.loadImage("tile.png");

// Tile that draws the full 32×32 image at the destination size
const tile = new Tile(renderer, img, 32, 32, 32, 32);

// Draw tile at destination (100, 200)
tile.draw(0, 0, 100, 200);
```

## Drawing a Region from a Spritesheet

```typescript
// Source image is a 256×256 spritesheet, each tile is 32×32
const tile = new Tile(renderer, img, 32, 32, 32, 32);

// Draw the tile in row 1, column 2 of the sheet
const sx = 2 * 32;
const sy = 1 * 32;
tile.draw(sx, sy, destX, destY);
```

## Scaling the Destination

`draw()` accepts optional source and destination sizes. Source defaults to the tile's `sWidth`
and `sHeight`; destination defaults to `dWidth` and `dHeight` set in the constructor.

```typescript
tile.draw(sx, sy, dx, dy, sw, sh, dw, dh);

// Draw a 32×32 source region scaled up to 64×64
tile.draw(0, 0, 100, 100, 32, 32, 64, 64);
```

## Using a Canvas Element as the Source

`Tile` accepts any `HTMLImageElement | HTMLCanvasElement | ImageBitmap` as the source, which
is how `FontManager` and `ParticleSystem` build their tinted canvases.

```typescript
const offscreen = document.createElement("canvas");
offscreen.width = 64;
offscreen.height = 64;
// ... draw to offscreen context ...

const tile = new Tile(renderer, offscreen, 64, 64, 64, 64);
tile.draw(0, 0, screenX, screenY);
```

## Custom Clip Polygon

By default `Tile` clips to a rectangle matching the full image bounds. Pass a custom
`positions` array to clip to an arbitrary convex polygon.

```typescript
// Diamond-shaped clip
const positions = [
  [32, 0],
  [64, 32],
  [32, 64],
  [0, 32],
];
const tile = new Tile(renderer, img, 64, 64, 64, 64, positions);
```

## Repeated Tiles (Patterns)

The `repeat` parameter accepts the same values as `CanvasRenderingContext2D.createPattern()`:
`"repeat"`, `"repeat-x"`, `"repeat-y"`, or `"no-repeat"` (default).

```typescript
// Tile that fills the destination by repeating the source
const tile = new Tile(
  renderer, img,
  32, 32,    // source size
  200, 200,  // destination / pattern size
  undefined, // default clip polygon
  200, 200,  // pattern canvas size
  "repeat"
);
tile.draw(0, 0, 0, 0);
```

## API Reference

### `new Tile(renderer, image, sWidth, sHeight, dWidth, dHeight, positions?, width?, height?, repeat?, fillStyle?, strokeStyle?, lineWidth?)`

| Parameter | Default | Description |
|---|---|---|
| `renderer` | — | `Canvas2DRenderer` to draw onto |
| `image` | — | Source image, canvas, or bitmap |
| `sWidth` / `sHeight` | — | Source sample region size |
| `dWidth` / `dHeight` | — | Default destination draw size |
| `positions` | image corners | Clip polygon vertices `[x, y][]` |
| `width` / `height` | image size | Pattern canvas size |
| `repeat` | `"no-repeat"` | CSS pattern repeat mode |
| `fillStyle` | transparent | Fill inside clip polygon |
| `strokeStyle` | transparent | Stroke on clip polygon edge |
| `lineWidth` | `0` | Stroke width |

### `draw(sx, sy, dx, dy, sw?, sh?, dw?, dh?)`

Draws the tile at destination `(dx, dy)`. All size arguments default to the values
set in the constructor.
