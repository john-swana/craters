# WebGLRenderer Usage Guide

`WebGLRenderer` is a high-performance sprite renderer backed by WebGL 1. It uses an orthographic
projection matrix and NEAREST texture filtering to draw images without sub-pixel seams, even
on high-DPR displays. It has the same surface API as `Canvas2DRenderer` so the two can be
swapped without changing call sites in `Tile` or `Sprite`.

## Setup

```typescript
import { WebGLRenderer } from "craters";

const renderer = new WebGLRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);
```

The constructor compiles and links the internal vertex + fragment shaders and sets up the
position buffer. It throws if the browser does not support WebGL.

## Loading Images as Textures

Unlike `Canvas2DRenderer`, images must be uploaded to the GPU with `createImage()` before
they can be drawn. The returned handle must be passed to `drawImage()`.

```typescript
import { AssetsManager, WebGLRenderer } from "craters";

const assets   = new AssetsManager();
const renderer = new WebGLRenderer(800, 600);

const img     = await assets.loadImage("sprites.png");
const texture = renderer.createImage(img); // { texture, width, height }

// Draw the full texture at (100, 50)
renderer.drawImage(texture, 0, 0, img.width, img.height, 100, 50, img.width, img.height);
```

## Drawing from a Spritesheet

```typescript
const TILE_W = 32;
const TILE_H = 32;

// Draw the tile at column 2, row 1 of the sheet
renderer.drawImage(
  texture,
  2 * TILE_W, 1 * TILE_H, TILE_W, TILE_H,  // source region
  playerX, playerY, TILE_W * 2, TILE_H * 2  // destination — 2× scale
);
```

## Clearing

```typescript
// Clear with default dark colour [0.1, 0.1, 0.1, 1.0]
renderer.clear();

// Clear with a custom RGBA colour (components in 0–1 range)
renderer.clear([0.05, 0.05, 0.15, 1.0]);
```

`clear()` also enables alpha blending (`SRC_ALPHA, ONE_MINUS_SRC_ALPHA`) and sets
`UNPACK_PREMULTIPLY_ALPHA_WEBGL`, so transparent PNG sprites composite correctly.

## Resizing

```typescript
renderer.resize(1280, 720);

// Update DPR on a display change event
renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
```

Resize updates the canvas element dimensions, resets the viewport, and recomputes the
orthographic projection matrix.

## Using with Tile and Sprite

`Tile` and `Sprite` accept either renderer. The `createImage` / `drawImage` interface is
identical — only the internal implementation differs.

```typescript
import { WebGLRenderer, AssetsManager, Tile } from "craters";

const renderer = new WebGLRenderer(800, 600);
const assets   = new AssetsManager();

const img      = await assets.loadImage("tileset.png");
const texture  = renderer.createImage(img);
const tile     = new Tile(renderer as any, texture as any, 32, 32, 32, 32);

tile.draw(0, 0, 100, 100); // draw tile at (100, 100)
```

## Performance Notes

- Use `createImage()` once per image at load time — texture upload is expensive
- `drawImage()` is a single `gl.drawElements()` call per image — batch by grouping draws between clears
- NEAREST filtering avoids bilinear bleeding at tile edges; it is not suitable for smooth scaling
- Sub-pixel snapping is applied automatically to destination coordinates

## Limitations

- No primitive drawing API (`drawRect`, `drawCircle`, etc.) — use `Canvas2DRenderer` for debug overlays
- No `context` property — direct GL access requires `renderer.canvasElement.getContext("webgl")`
- WebGL 1 only; no WebGL 2 or WebGPU

## API Reference

### `new WebGLRenderer(width, height, options?, devicePixelRatio?)`

| Parameter | Default | Description |
|---|---|---|
| `width` | — | CSS width in pixels |
| `height` | — | CSS height in pixels |
| `options` | `undefined` | Unused, kept for API parity |
| `devicePixelRatio` | `window.devicePixelRatio` | Physical pixel multiplier |

### Properties
- `canvasElement: HTMLCanvasElement`
- `width: number`, `height: number`

### Methods
- `createImage(image)` → `{ texture: WebGLTexture, width, height }`
- `drawImage(texture, sx?, sy?, sw?, sh?, dx?, dy?, dw?, dh?)`
- `clear(rgba?, x?, y?, w?, h?)`
- `resize(width?, height?, devicePixelRatio?)`
