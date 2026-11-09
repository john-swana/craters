# FontManager Usage Guide

`FontManager` rasterises a string of characters from any loaded web font into a texture
atlas and renders text through `Tile`. It is CPU-rasterised at load time, so `draw()` costs
one image draw per character. It requires a `Canvas2DRenderer`.

## How It Works

1. `FontManager` creates an off-screen `Canvas2DRenderer` and measures each unique character
   in the provided string using `context.measureText()`.
2. It draws every character side-by-side into that canvas, recording each character's position
   and dimensions in a `FontMap`.
3. The resulting canvas becomes a `Tile` (the **font atlas**).
4. When text is drawn, `FontInstance.draw()` looks up each character's position in the atlas and
   calls `Tile.draw()` for each one.

## Setup

Load a `FontFace` via `AssetsManager` (`loadFont()` also registers it in `document.fonts`),
then create a `FontManager`:

```typescript
import { FontManager, AssetsManager, Canvas2DRenderer } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
const assets   = new AssetsManager();

// Load and register the font face
await assets.loadFont("PixelFont", "url(fonts/pixel.woff2)");

// Create a FontManager for this typeface and style
const fontManager = new FontManager(
  renderer,
  "16px PixelFont",   // CSS font string — size and family
  "#ffffff"           // fillStyle used to rasterise the glyphs
);
```

## Outlined Text

The optional `strokeStyle`, `fill`, `stroke` and `lineWidth` arguments control how glyphs are
baked into the atlas. When `fill` is true (the default), glyphs are filled with `fillStyle`.
When `stroke` is true, they are also stroked with `strokeStyle`, drawn over the fill:

```typescript
const outlined = new FontManager(
  renderer,
  "bold 24px monospace",
  "#ffcc00",  // fillStyle
  "#000000",  // strokeStyle
  true,       // fill
  true,       // stroke
  3           // lineWidth in pixels
);
const title = outlined.load("GAME OVER");
title.draw("GAME OVER", 100, 80);
```

Stroked glyphs are not clipped: each atlas cell gets a transparent margin of
`ceil(lineWidth / 2) + 1` px. Text is laid out exactly as it would be without a stroke, and the
stroke extends up to `lineWidth / 2` beyond the glyph boxes. These options are applied when
`load()` runs; to change them, set them and call `load()` again.

## Building the Font Atlas

Call `load()` with every character you need to render. Pass a string containing all unique
characters used in the game — any character not included here cannot be drawn.

```typescript
const font = fontManager.load(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?:-"
);
```

`load()` is synchronous and returns a `FontInstance`. Call it once at startup.

- It rasterises with whatever font is available at that moment, so await the font load first.
- Glyph height is the font's px size × 1.2.
- An invalid font string falls back to the canvas default, `10px sans-serif`.

## Drawing Text

```typescript
font.draw("Hello, World!", destX, destY);
font.draw("Score: 1000", 10, 10);
```

Characters are drawn left-to-right starting at `(destX, destY)`, the top-left corner. There is
no automatic line wrapping and `"\n"` is not treated as a line break. For multiple lines, call
`draw()` once per line with an adjusted `destY`.

## Complete Example

```typescript
import { FontManager, AssetsManager, Canvas2DRenderer, RenderLoop } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);

const assets = new AssetsManager();
await assets.loadFont("PixelFont", "url(pixel.woff2)");

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

### `new FontManager(renderer, fontName, fillStyle?, strokeStyle?, fill?, stroke?, lineWidth?)`

| Parameter | Default | Description |
|---|---|---|
| `renderer` | — | `Canvas2DRenderer` to draw text onto (`WebGLRenderer` is not accepted) |
| `fontName` | — | CSS font string, e.g. `"16px Arial"` |
| `fillStyle` | `"#fafafa"` | Fill colour for glyph rasterisation |
| `strokeStyle` | `"#fafafa"` | Stroke colour (if `stroke` is `true`) |
| `fill` | `true` | Whether to fill glyphs |
| `stroke` | `false` | Whether to stroke glyphs (drawn over the fill) |
| `lineWidth` | `1` | Stroke width in pixels |

### `fontManager.load(characters): FontInstance`

Rasterises all unique characters in the string into an atlas. Returns a `FontInstance`
(exported as a type from `"craters"`).

### `font.draw(text, destX, destY)`

Draws `text` at `(destX, destY)`. Only characters present in the atlas string are rendered;
unrecognised characters are silently skipped and take no space.
