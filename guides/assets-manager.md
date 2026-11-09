# AssetsManager Usage Guide

`AssetsManager` provides async loaders for common resource types. Each method resolves with
a native browser object or value (no custom wrappers), e.g. an `HTMLImageElement` that can be
passed straight to the renderers. Audio is loaded with `SoundManager.load()` instead.

## Setup

```typescript
import { AssetsManager } from "craters";

const assets = new AssetsManager();
```

## Loading Images

Returns a fully loaded `HTMLImageElement`. Rejects with an `Error` naming the URL if the image
fails to load (missing file, or data that is not a valid image).

```typescript
const img = await assets.loadImage("sprites/player.png");

// Use with a Canvas2DRenderer
canvasRenderer.drawImage(img, 0, 0, 32, 32, playerX, playerY, 32, 32);

// Use with a WebGLRenderer (uploads the image as a texture)
const texture = glRenderer.createImage(img);
```

`loadImage()` does not set `crossOrigin`. Images from another origin still draw with
`Canvas2DRenderer` (tainting the canvas), but `WebGLRenderer.createImage()` throws a
`SecurityError` for them. Serve images from the same origin, or create the `Image` yourself
with `crossOrigin = "anonymous"` from a CORS-enabled server.

## Loading JSON

Useful for tilemaps, level data, and config files.

```typescript
const level = await assets.loadJson("levels/world1.json");
console.log(level.width, level.height);
```

## Loading Text

Returns the raw response body as a string.

```typescript
const source = await assets.loadText("shaders/vert.glsl");
```

## Loading Binary Data

Returns a `Blob`. Useful for custom binary formats. (To play audio, use
`SoundManager.load(url)`, which fetches and decodes the file itself.)

```typescript
const blob = await assets.loadBinary("data/heightmap.bin");
const buffer = await blob.arrayBuffer();
```

## Loading Fonts

Loads a `FontFace` and registers it in `document.fonts`, so no extra `document.fonts.add()`
call is needed. The second argument is a CSS `src` descriptor such as `url(fonts/pixel.woff2)`,
not a bare path: `"fonts/pixel.woff2"` rejects with a `SyntaxError`.

`FontManager` takes a CSS font string, not the `FontFace`: once the face has loaded, refer to
it by the family name you registered.

```typescript
await assets.loadFont("PixelFont", "url(fonts/pixel.woff2)"); // resolves with the FontFace

const fontManager = new FontManager(renderer, "16px PixelFont");
```

## Loading Multiple Assets in Parallel

Use `Promise.all` to load several resources without blocking on each one sequentially.

```typescript
const [playerImg, enemyImg, level, music] = await Promise.all([
  assets.loadImage("player.png"),
  assets.loadImage("enemy.png"),
  assets.loadJson("level1.json"),
  audio.load("theme.ogg"), // audio is a SoundManager; resolves with a Sound
]);
```

## Error Handling

All methods reject on network failures and missing files, so a `try/catch` (or `.catch()`)
handles optional assets:

- `loadText()`, `loadJson()` and `loadBinary()` reject with an `Error` whose message includes
  the HTTP status (e.g. `Failed to load "levels/world2.json": 404 Not Found`) when the server
  responds with a non-OK status. `loadJson()` also rejects if the body is not valid JSON.
- `loadImage()` rejects with an `Error` when the image cannot be loaded or decoded.
- `loadFont()` rejects with the `FontFace` error (e.g. a `NetworkError` `DOMException`).

```typescript
try {
  const img = await assets.loadImage("optional-overlay.png");
  showOverlay(img);
} catch {
  // overlay not found, continue without it
}

const level2 = await assets.loadJson("levels/world2.json").catch((error: Error) => {
  console.warn(error.message); // Failed to load "levels/world2.json": 404 Not Found
  return null;
});
```

## API Reference

| Method | Returns | Description |
|---|---|---|
| `loadImage(url)` | `Promise<HTMLImageElement>` | Loads an image; rejects with an `Error` on failure |
| `loadJson(url)` | `Promise<any>` | Fetches and parses JSON; rejects with an `Error` on an HTTP error status |
| `loadText(url)` | `Promise<string>` | Fetches raw text; rejects with an `Error` on an HTTP error status |
| `loadBinary(url)` | `Promise<Blob>` | Fetches a binary blob; rejects with an `Error` on an HTTP error status |
| `loadFont(fontName, src)` | `Promise<FontFace>` | Loads a font face from a CSS `src` descriptor (e.g. `url(font.woff2)`) and adds it to `document.fonts` |
