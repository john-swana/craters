# TilemapManager Usage Guide

`TilemapManager` loads **Tiled**-format JSON maps, resolves their tilesets into `Sprite`
instances, and renders them layer by layer. It is built on top of `Sprite` and works with
`Canvas2DRenderer`.

## Tiled Map Format

Export your map from [Tiled](https://www.mapeditor.org/) as **JSON** with embedded or
relative tileset paths. `TilemapManager` expects:

```
map.json
{
  "layers": [
    {
      "data": [[srcY, srcX, dstX, dstY, tilesetIndex], ...]
    }
  ],
  "tilesets": [
    { "image": "tileset.png", "tilewidth": 16, "tileheight": 16 }
  ]
}
```

Each tile entry in `layer.data` is a 5-element array:
`[sourceRow, sourceCol, destinationCol, destinationRow, tilesetIndex]`

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

All layers defined in the Tiled JSON are drawn automatically. Layer ordering from Tiled is
preserved, so background layers render before foreground layers.

For games that need to draw game objects between layers (e.g. player behind a roof layer),
split the draw call manually:

```typescript
// Draw only background layers, then entities, then foreground
// This requires splitting the tilemap or using Tiled's layer naming as a convention.
// Currently TilemapManager draws all layers in a single draw() call.
tilemap.draw(-camera.x, -camera.y);
// Draw player here
drawPlayer();
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
| `renderer` | `Canvas2DRenderer` used to create tile sprites |

### `tilemapManager.load(url): Promise<Tilemap>`

Fetches the Tiled JSON at `url`, loads all tileset images in parallel, and resolves with
a `Tilemap` ready to draw.

### `tilemap.draw(offsetX?, offsetY?)`

Renders all map layers. `offsetX` and `offsetY` default to `0`.
