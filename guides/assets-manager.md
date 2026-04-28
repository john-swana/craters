# AssetsManager Usage Guide

`AssetsManager` provides async loaders for every resource type a game typically needs. Each
method returns a native browser object — no custom wrappers — so resources can be passed
directly to other Craters APIs.

## Setup

```typescript
import { AssetsManager } from "craters";

const assets = new AssetsManager();
```

## Loading Images

Returns a fully loaded `HTMLImageElement`. Rejects if the image fails to load.

```typescript
const img = await assets.loadImage("sprites/player.png");

// Use with Canvas2DRenderer
renderer.drawImage(img, 0, 0, 32, 32, playerX, playerY, 32, 32);

// Use with WebGLRenderer
const texture = renderer.createImage(img);
```

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

Returns a `Blob`. Useful for audio or custom binary formats.

```typescript
const blob = await assets.loadBinary("data/heightmap.bin");
const buffer = await blob.arrayBuffer();
```

## Loading Fonts

Loads a `FontFace` from a URL and registers it with the document. The returned `FontFace`
is already loaded and can be passed to `FontManager`.

```typescript
const face = await assets.loadFont("PixelFont", "url(fonts/pixel.woff2)");
document.fonts.add(face);
```

## Loading Multiple Assets in Parallel

Use `Promise.all` to load several resources without blocking on each one sequentially.

```typescript
const [playerImg, enemyImg, level, music] = await Promise.all([
  assets.loadImage("player.png"),
  assets.loadImage("enemy.png"),
  assets.loadJson("level1.json"),
  assets.loadBinary("theme.ogg"),
]);
```

## Error Handling

All methods reject on network or decode errors. Wrap with `try/catch` or `.catch()` to
handle missing files gracefully.

```typescript
try {
  const img = await assets.loadImage("optional-overlay.png");
  showOverlay(img);
} catch {
  // overlay not found, continue without it
}
```

## API Reference

| Method | Returns | Description |
|---|---|---|
| `loadImage(url)` | `Promise<HTMLImageElement>` | Fetches and decodes an image |
| `loadJson(url)` | `Promise<any>` | Fetches and parses JSON |
| `loadText(url)` | `Promise<string>` | Fetches raw text |
| `loadBinary(url)` | `Promise<Blob>` | Fetches a binary blob |
| `loadFont(name, url)` | `Promise<FontFace>` | Loads a font face by name and URL |
