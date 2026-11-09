# TilemapManager Usage Guide

`TilemapManager` loads JSON maps in Craters' own **map2d** format, resolves their tilesets into
`Sprite` instances, and renders them layer by layer. It is built on top of `Sprite` and accepts
any `Renderer` (`Canvas2DRenderer` or `WebGLRenderer`).

## Map Format

The map is a JSON file with this shape (TypeScript types `TilemapData`, `TilemapLayer`,
`Tileset` and `TileEntry` are exported from `"craters"`):

```
map.json
{
  "layers": [
    {
      "data": [[srcCol, srcRow, dstCol, dstRow, tilesetIndex], ...]
    }
  ],
  "tilesets": [
    { "image": "tileset.png", "tilewidth": 16, "tileheight": 16 }
  ]
}
```

Each tile entry in `layer.data` is a 5-element array:
`[sourceCol, sourceRow, destinationCol, destinationRow, tilesetIndex]`.

All positions are in tiles, not pixels:

- The source cell is at pixel `(sourceCol × tilewidth, sourceRow × tileheight)` in the tileset image.
- The tile is drawn at `(destinationCol × tilewidth + offsetX, destinationRow × tileheight + offsetY)`,
  using that tileset's tile size.
- Only the fields shown above are read; any others are ignored.

### Format Limitations

- **Not Tiled's JSON export.** Tiled layers hold flat GID arrays (`"data": [1, 2, 0, …]`) with
  a `firstgid` per tileset, and `draw()` throws `TypeError: tile is not iterable` on them.
  Layers without `data` (e.g. Tiled object layers) also throw, and external tilesets
  (`"source": "…"`) fail to load. Convert Tiled maps to the format above first.
- **Tileset `image` paths resolve against the page URL**, not the map file, because they are
  assigned to `Image.src`. Use absolute paths, or paths relative to the page.
- Tileset `margin` / `spacing` are not supported. The image is cut into a gapless
  `tilewidth × tileheight` grid.

## Setup

```typescript
import { TilemapManager, Canvas2DRenderer } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);

const tilemapManager = new TilemapManager(renderer);
```

## Loading a Map

`load()` fetches the JSON, loads every tileset image, and returns a `Tilemap` instance.
All image loading is done in parallel via `Promise.all`.

```typescript
const tilemap = await tilemapManager.load("maps/world1.json");
```

The promise rejects with an `Error` if the map request returns a non-OK HTTP status (the
message includes the status, e.g. `HTTP 404 Not Found`), or if a tileset image fails to load
(the message includes the image URL):

```typescript
try {
  await tilemapManager.load("maps/missing.json");
} catch (error) {
  console.error((error as Error).message);
}
```

## Drawing the Map

`Tilemap.draw()` renders all layers in order (bottom to top). Pass `offsetX` / `offsetY`
to implement camera scrolling.

```typescript
new RenderLoop((loop) => {
  renderer.clear();
  tilemap.draw();                       // no scroll
  tilemap.draw(-camera.x, -camera.y);  // with camera offset
});
```

## Camera Scrolling

Subtract the camera position from the draw offset to scroll the map:

```typescript
let cameraX = 0;
let cameraY = 0;

new RenderLoop((loop) => {
  // Move camera right
  cameraX += 1;

  renderer.clear("rgba(20, 20, 30, 1)");
  tilemap.draw(-cameraX, -cameraY);
});
```

## Layered Maps

All layers in the JSON are drawn by a single `draw()` call, in array order, so background
layers render before foreground layers.

To draw game objects between layers (e.g. player behind a roof layer), build extra `Tilemap`
instances over subsets of the loaded layers. They reuse the already-loaded tilesets:

```typescript
import { Tilemap, RenderLoop } from "craters";

const { layers, tilesets } = tilemap.tilemap;
const background = new Tilemap({ layers: layers.slice(0, 2), tilesets });
const foreground = new Tilemap({ layers: layers.slice(2), tilesets });

new RenderLoop((loop) => {
  renderer.clear();
  background.draw(-camera.x, -camera.y);
  drawPlayer();
  foreground.draw(-camera.x, -camera.y);
});
```

## Source Inset

`Tilemap.draw()` passes a `0.5` pixel source inset to each `Sprite.draw()` call
automatically. This prevents texture bleeding between adjacent tiles in the atlas — no
configuration needed.

## Complete Example

```typescript
import { TilemapManager, Canvas2DRenderer, RenderLoop, Input } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);

const tilemapManager = new TilemapManager(renderer);
const tilemap = await tilemapManager.load("maps/level1.json");

const input = new Input();
input.bind(Input.KEY.LEFT_ARROW, "LEFT");
input.bind(Input.KEY.RIGHT_ARROW, "RIGHT");

let cameraX = 0;

new RenderLoop((loop) => {
  if (input.isPressed("LEFT"))  cameraX -= 2;
  if (input.isPressed("RIGHT")) cameraX += 2;

  renderer.clear("rgba(10, 10, 20, 1)");
  tilemap.draw(-cameraX, 0);
});
```

## API Reference

### `new TilemapManager(renderer)`

| Parameter | Description |
|---|---|
| `renderer` | Any `Renderer` (`Canvas2DRenderer` or `WebGLRenderer`) used to create tile sprites |

### `tilemapManager.load(url): Promise<Tilemap>`

Fetches the map JSON at `url`, loads all tileset images in parallel, and resolves with
a `Tilemap` ready to draw. Rejects with an `Error` on a non-OK HTTP response or a tileset
image that fails to load.

### `new Tilemap(data: TilemapData)`

Wraps map data whose tilesets already have their `sprite` set (as returned by `load()`).
Use it to draw a subset of layers.

### `tilemap.tilemap: TilemapData`

The loaded map data, with every `tilesets[i].sprite` populated.

### `tilemap.draw(offsetX?, offsetY?)`

Renders all map layers. `offsetX` and `offsetY` default to `0`.
