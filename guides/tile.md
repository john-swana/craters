# Tile Usage Guide

`Tile` is the fundamental drawing primitive in Craters. It wraps an image source (or canvas /
`ImageBitmap`) and draws a rectangular region of it through a renderer: any `Renderer`, i.e.
`Canvas2DRenderer` or `WebGLRenderer`. `Sprite`, `FontManager`, and `TilemapManager` (via
`Sprite`) all build on top of `Tile`.

## What Tile Does

Construction takes one of two paths:

- **Fast path:** with the default clip rectangle, `"no-repeat"`, transparent fill / stroke and
  `lineWidth` 0, the image is handed straight to the renderer's `createImage()`. That is a no-op
  for `Canvas2DRenderer` and a texture upload for `WebGLRenderer`. Plain spritesheet and
  font-atlas tiles take this path.
- **Processed path:** any custom clip polygon, repeat mode, fill, stroke or line width makes
  `Tile` build an offscreen canvas the size of the source image. It clips that canvas to the
  `positions` polygon, paints the fill / stroke, and draws the image on top. It then fills a
  `width × height` canvas with a `CanvasPattern` of the result, and that canvas becomes the
  source image.

Either way, all subsequent `draw()` calls use the prepared image, so construction is the
expensive step, not drawing.

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
is how `FontManager` turns its glyph canvas into an atlas. Pass the raw image or canvas, not a
`WebGLRenderer.createImage()` handle: `Tile` calls `createImage()` itself.

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
`positions` array (image pixel coordinates) to clip to any polygon, convex or concave.

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

The pattern repeats the whole (clipped) source image across a `width × height` canvas.
`draw()` samples only `sWidth × sHeight` of that canvas. Set `sWidth` / `sHeight` to the
pattern size, otherwise you get one copy of the image stretched to the destination.

```typescript
// 32×32 image repeated across a 200×200 area
const tile = new Tile(
  renderer, img,
  200, 200,  // source size: sample the whole pattern canvas
  200, 200,  // destination size
  undefined, // default clip polygon
  200, 200,  // pattern canvas size
  "repeat"
);
tile.draw(0, 0, 0, 0);
```

## Fill and Stroke

`fillStyle` and `strokeStyle` are painted on the clip polygon *before* the image is drawn,
so the image covers them:

- The fill shows only through transparent pixels of the image.
- The stroke is clipped to the polygon, so at most the inner half of `lineWidth` shows, and
  only where the image is transparent. On an opaque image it is invisible.

For a visible outline, draw it after the tile, e.g. with `Canvas2DRenderer.drawPolygon()`.

## API Reference

### `new Tile(renderer, image, sWidth, sHeight, dWidth, dHeight, positions?, width?, height?, repeat?, fillStyle?, strokeStyle?, lineWidth?)`

| Parameter | Default | Description |
|---|---|---|
| `renderer` | — | Any `Renderer` (`Canvas2DRenderer` or `WebGLRenderer`) |
| `image` | — | Source image, canvas, or bitmap |
| `sWidth` / `sHeight` | — | Default source region size for `draw()` |
| `dWidth` / `dHeight` | — | Default destination draw size |
| `positions` | image corners | Clip polygon vertices `[x, y][]` |
| `width` / `height` | image size | Pattern canvas size (unused on the fast path) |
| `repeat` | `"no-repeat"` | `CanvasPattern` repeat mode |
| `fillStyle` | `"transparent"` | Fill inside the clip polygon, under the image |
| `strokeStyle` | `"transparent"` | Stroke along the clip polygon, under the image and clipped to it |
| `lineWidth` | `0` | Stroke width |

### `draw(sx, sy, dx, dy, sw?, sh?, dw?, dh?)`

Draws the source region at `(sx, sy)` (pixels in the prepared image) to destination
`(dx, dy)`. All size arguments default to the values set in the constructor.
