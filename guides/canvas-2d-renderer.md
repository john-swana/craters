# Canvas2DRenderer Usage Guide

`Canvas2DRenderer` wraps an `HTMLCanvasElement` with a `CanvasRenderingContext2D` and handles
high-DPR (Retina / mobile) scaling automatically. It is the primary 2D rendering surface for
tiles, sprites, fonts, and particles. It implements the `Renderer` interface, as does
`WebGLRenderer`, so `Tile`, `Sprite` and `TilemapManager` accept either renderer.
`FontManager` and `ParticleSystem.draw()` require a `Canvas2DRenderer`.

## Setup

```typescript
import { Canvas2DRenderer } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);
```

The canvas element is created internally. The CSS size is set to `width × height` px, while
the actual pixel buffer is scaled by `devicePixelRatio` for sharp rendering on high-DPR screens.

## Drawing Images

`drawImage()` mirrors the standard Canvas API 9-argument form but snaps destination coordinates
to the nearest physical pixel to prevent sub-pixel seams on high-DPR displays.

```typescript
// Draw the full source image at (0, 0) with its natural size
renderer.drawImage(image);

// Draw a specific region of a spritesheet
renderer.drawImage(
  image,
  sx, sy, sWidth, sHeight,  // source rect
  dx, dy, dWidth, dHeight   // destination rect
);
```

All arguments after `image` are optional, but the defaults differ from the native API. An
omitted `dWidth` / `dHeight` is the full image size, not `sWidth` / `sHeight`. The native 3- and
5-argument forms are not supported: `drawImage(img, x, y)` sets `sx` / `sy`. To draw a
sub-region at its own size, pass all nine arguments.

`createImage()` is a passthrough that keeps the API consistent with `WebGLRenderer`:

```typescript
const img = await assetsManager.loadImage("sprite.png");
const handle = renderer.createImage(img); // returns img unchanged
renderer.drawImage(handle, 0, 0, 32, 32, 100, 100, 64, 64);
```

## Clearing the Canvas

```typescript
// Clear the entire canvas (transparent)
renderer.clear();

// Fill the entire canvas with a solid colour
renderer.clear("rgba(20, 20, 30, 1)");

// Clear a specific region
renderer.clear(undefined, x, y, width, height);
```

## Primitive Drawing

All primitives use `ctx.save()` / `ctx.restore()` internally, so they don't change the caller's
styles or transform. `drawCircle`, `drawPolygon` and `drawLine` do start a new path, which
discards any path the caller was building.

```typescript
// Filled / stroked rectangle
renderer.drawRect(x, y, w, h, "red", true);   // filled
renderer.drawRect(x, y, w, h, "blue", false);  // stroked (default)

// Filled / stroked circle
renderer.drawCircle(cx, cy, radius, "green", true);

// Filled / stroked polygon (convex or concave)
const points = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 50 }];
renderer.drawPolygon(points, "purple", true);

// Line
renderer.drawLine(x1, y1, x2, y2, "white", lineWidth);
```

## Resizing

```typescript
// Resize canvas — resets all context state internally
renderer.resize(1280, 720);

// Resize and change DPR (e.g. on window resize or display change)
renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
```

## Accessing the Context

The underlying `CanvasRenderingContext2D` is exposed for custom drawing not covered by the API:

```typescript
const ctx = renderer.context;
ctx.save();
ctx.globalAlpha = 0.5;
ctx.fillStyle = "yellow";
ctx.fillRect(10, 10, 100, 100);
ctx.restore();
```

## High-DPR Notes

- CSS size = `width × height` px (layout size)
- Physical buffer = `width × devicePixelRatio` × `height × devicePixelRatio` px
- `drawImage()` and `clear()` operate in CSS pixels — the DPR transform is applied transparently

## API Reference

### `new Canvas2DRenderer(width, height, options?, devicePixelRatio?)`

| Parameter | Default | Description |
|---|---|---|
| `width` | — | CSS width in pixels |
| `height` | — | CSS height in pixels |
| `options` | `undefined` | 2D context attributes (`CanvasRenderingContext2DSettings`, e.g. `{ alpha: false }`), passed to `canvas.getContext("2d", options)` |
| `devicePixelRatio` | `window.devicePixelRatio` | Physical pixel multiplier |

### Properties
- `canvasElement: HTMLCanvasElement`
- `context: CanvasRenderingContext2D`
- `width: number`, `height: number`
- `devicePixelRatio: number`

### Methods
- `createImage(image)` → `image` (passthrough for API parity with `WebGLRenderer`)
- `drawImage(image, sx?, sy?, sw?, sh?, dx?, dy?, dw?, dh?)`: `sx`, `sy`, `dx` and `dy` default to `0`; `sw`, `sh`, `dw` and `dh` default to the image size
- `clear(color?, x?, y?, width?, height?)`: defaults to the whole canvas; transparent if `color` is omitted. (The parameters are named `v, w, x, y, z` in the source.)
- `drawRect(x, y, w, h, color, fill?)`
- `drawCircle(x, y, r, color, fill?)`
- `drawPolygon(points, color, fill?)`
- `drawLine(x1, y1, x2, y2, color, width?)`
- `resize(width?, height?, devicePixelRatio?)`
