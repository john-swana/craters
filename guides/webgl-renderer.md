# WebGLRenderer Usage Guide

`WebGLRenderer` is an image renderer backed by WebGL 1. It uses an orthographic
projection matrix and NEAREST texture filtering to draw images without sub-pixel seams, even
on high-DPR displays. It implements the same `Renderer` interface (`createImage` / `drawImage`)
as `Canvas2DRenderer`, so `Tile`, `Sprite` and `TilemapManager` work with either renderer
unchanged. The rest of the API differs; see [Limitations](#limitations).

## Setup

```typescript
import { WebGLRenderer } from "craters";

const renderer = new WebGLRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);
```

The constructor compiles and links the internal vertex + fragment shaders and sets up the
position buffer. It throws if the browser does not support WebGL, or if a shader fails to
compile or link.

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

Each `createImage()` call creates a new texture. Release one you no longer need with
`deleteImage()`:

```typescript
renderer.deleteImage(texture);
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

`clear()` always clears the whole canvas. It accepts `x, y, w, h` arguments, but ignores them.

## Alpha Blending

The constructor sets up alpha blending, so transparent PNG sprites composite correctly from the
first draw, with or without a prior `clear()`. Textures are uploaded with premultiplied alpha
(`UNPACK_PREMULTIPLY_ALPHA_WEBGL`) and blended with `ONE, ONE_MINUS_SRC_ALPHA`. Textures can be
created at any time, before or after the first `clear()`. `clear()` re-applies this blend
state, in case other code changed it on the shared WebGL context.

## Resizing

```typescript
renderer.resize(1280, 720);

// Update DPR on a display change event
renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
```

Resize updates the canvas element dimensions, resets the viewport, and recomputes the
orthographic projection matrix.

## Using with Tile and Sprite

`Tile`, `Sprite` and `TilemapManager` take any `Renderer`, so pass the `WebGLRenderer` and the
raw image. They call `createImage()` themselves; passing them a texture handle throws.

```typescript
import { WebGLRenderer, AssetsManager, Tile, Sprite } from "craters";

const renderer = new WebGLRenderer(800, 600);
const assets   = new AssetsManager();

const img    = await assets.loadImage("tileset.png");
const tile   = new Tile(renderer, img, 32, 32, 32, 32);
const sprite = new Sprite(renderer, img, 32, 32, [[0, 0], [0, 1]], 0.2, 32, 32);

renderer.clear();
tile.draw(0, 0, 100, 100);                  // draw tile at (100, 100)
sprite.draw(200, 100, undefined, [0, 1]);   // pinned frame: row 0, column 1
```

## Performance Notes

- Use `createImage()` once per image at load time — texture upload is expensive
- Every `Tile` and `Sprite` instance uploads its own texture, even when several share one image
- `drawImage()` is one texture bind, two matrix uploads and one `gl.drawElements()` call per
  call. There is no batching, so the cost grows linearly with the number of draws
- NEAREST filtering avoids bilinear bleeding at tile edges; it is not suitable for smooth scaling
- Sub-pixel snapping is applied automatically to destination coordinates

## Limitations

- No primitive drawing API (`drawRect`, `drawCircle`, etc.) — use `Canvas2DRenderer` for debug overlays
- No `context` property — direct GL access requires `renderer.canvasElement.getContext("webgl")`
- `clear()` takes an RGBA array (0–1), not a CSS colour string, and ignores its region arguments
- `FontManager` and `ParticleSystem.draw()` are typed for `Canvas2DRenderer` only
- A negative destination width / height mirrors the image (`Canvas2DRenderer` does not); there is no rotation
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
- `deleteImage(handle)`: releases a texture created by `createImage()`
- `drawImage(texture, sx?, sy?, sw?, sh?, dx?, dy?, dw?, dh?)`: same defaults as `Canvas2DRenderer.drawImage()`; `dw` and `dh` default to the texture size
- `clear(rgba?, x?, y?, w?, h?)`: `rgba` defaults to `[0.1, 0.1, 0.1, 1]`; `x`, `y`, `w` and `h` are ignored
- `resize(width?, height?, devicePixelRatio?)`
