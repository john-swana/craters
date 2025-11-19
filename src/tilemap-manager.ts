import Sprite from "./sprite";
export class Tilemap {
  tilemap: any;
  constructor(tilemap: any) {
    this.tilemap = tilemap
  }
  public draw(offsetX: number = 0, offsetY: number = 0): void {
    this.tilemap.layers.forEach((layer: any) => {
      layer.data.forEach((tile: [number, number, number, number, number]) => {
        // v: Source x 
        // w: Source y
        // x: Destination x
        // y: Destination y
        // z: Tileset index
        var [v, w, x, y, z] = tile;
        var {
          sprite,
          tilewidth: s,
          tileheight: u
        } = this.tilemap.tilesets[z];
        sprite.draw((x * s) + offsetX, (y * u) + offsetY, null, [w, v]);
      });
    });
  }
}
export default class TilemapManager {
  canvas2DRenderer: any;
  constructor(canvas2Drenderer: any) {
    this.canvas2DRenderer = canvas2Drenderer;
  }
  public async load(resource: string) {
    const request: Request = new Request(resource)
    return fetch(request)
      .then(function(response) {
        return response.json()
      })
      .then(async (tilemap) => {
        tilemap.tilesets = await Promise.all(tilemap.tilesets.map(async (tileset: any) => {
          return new Promise((resolve, reject) => {
            var image: HTMLImageElement = new Image();
            image.onload = () => {
              tileset.sprite = new Sprite(this.canvas2DRenderer, image, tileset.tilewidth, tileset.tileheight, [], 0, tileset.tilewidth, tileset.tileheight);
              resolve(tileset);
            }
            image.onerror = reject;
            image.src = tileset.image;
          })
        }))
        return new Tilemap(tilemap)
      })
  }
}