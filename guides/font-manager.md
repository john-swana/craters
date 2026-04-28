# FontManager Usage Guide

`FontManager` rasterises a string of characters from any loaded web font into a texture
atlas and renders text through `Tile`. It is CPU-rasterised at load time, so `draw()` is
as cheap as a sprite draw.

## How It Works

1. `FontManager` creates an off-screen `Canvas2DRenderer` and measures each unique character
   in the provided string using `context.measureText()`.
2. It draws every character side-by-side into that canvas, recording each character's position
   and dimensions in a `FontMap`.
3. The resulting canvas becomes a `Tile` (the **font atlas**).
4. When text is drawn, `Font.draw()` looks up each character's position in the atlas and
   calls `Tile.draw()` for each one.

## Setup

Load a `FontFace` via `AssetsManager`, register it, then create a `FontManager`:

```typescript
import { FontManager, AssetsManager, Canvas2DRenderer } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
const assets   = new AssetsManager();

// Load and register the font face
const face = await assets.loadFont("PixelFont", "url(fonts/pixel.woff2)");
document.fonts.add(face);

// Create a FontManager for this typeface and style
const fontManager = new FontManager(
  renderer,
  "16px PixelFont",   // CSS font string — size and family
  "#ffffff",          // fillStyle
  "#ffffff",          // strokeStyle (unused when stroke: false)
  true,               // fill
  false               // stroke
);
```

## Building the Font Atlas

Call `load()` with every character you need to render. Pass a string containing all unique
characters used in the game — any character not included here cannot be drawn.

```typescript
const font = fontManager.load(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?:-"
);
```

`load()` is synchronous and returns a `Font` object. Call it once at startup.

## Drawing Text

```typescript
font.draw("Hello, World!", destX, destY);
font.draw("Score: 1000", 10, 10);
```

Characters are drawn left-to-right starting at `(destX, destY)`. There is no automatic
line wrapping — insert newlines manually by adjusting `destY`.

## Complete Example

```typescript
import { FontManager, AssetsManager, Canvas2DRenderer, RenderLoop } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);

const assets  = new AssetsManager();
const face    = await assets.loadFont("PixelFont", "url(pixel.woff2)");
document.fonts.add(face);

const mgr  = new FontManager(renderer, "16px PixelFont", "#00ff88");
const font = mgr.load("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?:-");

let score = 0;

new RenderLoop((loop) => {
  score++;
  renderer.clear("rgba(10, 10, 20, 1)");
  font.draw(`Score: ${score}`, 16, 16);
});
```

## Using System Fonts

Any font available in the browser can be used without loading a `FontFace`:

```typescript
const mgr  = new FontManager(renderer, "bold 24px monospace", "#ffcc00");
const font = mgr.load("0123456789");
font.draw("9999", 10, 10);
```

## API Reference

### `new FontManager(renderer, fontName, fillStyle?, strokeStyle?, fill?, stroke?)`

| Parameter | Default | Description |
|---|---|---|
| `renderer` | — | `Canvas2DRenderer` to draw text onto |
| `fontName` | — | CSS font string, e.g. `"16px Arial"` |
| `fillStyle` | `"#fafafa"` | Fill colour for glyph rasterisation |
| `strokeStyle` | `"#fafafa"` | Stroke colour (if `stroke` is `true`) |
| `fill` | `true` | Whether to fill glyphs |
| `stroke` | `false` | Whether to stroke glyphs |

### `fontManager.load(characters): Font`

Rasterises all unique characters in the string into an atlas. Returns a `Font` object.

### `font.draw(text, destX, destY)`

Draws `text` at `(destX, destY)`. Only characters present in the atlas string are rendered;
unrecognised characters are silently skipped.
