import Sprite from "./sprite";
import { Renderer } from "./tile";

/**
 * A single placed tile: `[sourceCol, sourceRow, destCol, destRow, tilesetIndex]`.
 * All four positions are in tiles, not pixels: the source cell is at
 * (`sourceCol × tilewidth`, `sourceRow × tileheight`) in the tileset image, and
 * the tile is drawn at (`destCol × tilewidth`, `destRow × tileheight`) plus the
 * draw offset, using that tileset's tile size.
 */
export type TileEntry = [number, number, number, number, number];

/** A map layer. Only `data` is read; any other fields are ignored. */
export interface TilemapLayer {
  data: TileEntry[];
}

/** A tileset. Only these fields are read; margin/spacing/firstgid are not supported. */
export interface Tileset {
  /** Image URL, assigned to `Image.src`, so relative paths resolve against the page URL, not the map file. */
  image: string;
  /** Tile width in pixels. */
  tilewidth: number;
  /** Tile height in pixels. */
  tileheight: number;
  /** Populated by `TilemapManager.load` once the image is ready. */
  sprite: Sprite;
}

/**
 * Craters' map2d JSON format. This is not Tiled's JSON export: Tiled layers
 * hold flat GID arrays, which `Tilemap.draw` cannot read.
 */
export interface TilemapData {
  layers: TilemapLayer[];
  tilesets: Tileset[];
}

/** A loaded map, normally created by `TilemapManager.load`. */
export class Tilemap {
  /** The map data, with every `tilesets[i].sprite` populated. */
  tilemap: TilemapData;
  /**
   * @param tilemap Map data whose tilesets already have `sprite` set, e.g.
   *   `{ ...loaded.tilemap, layers: someLayers }` to draw a subset of layers.
   */
  constructor(tilemap: TilemapData) {
    this.tilemap = tilemap
  }
  /**
   * Draw every layer in array order (first = bottom), with a 0.5 px source
   * inset per tile to prevent atlas bleeding.
   * @param offsetX Added to every tile's destination x (e.g. `-camera.x`). Default `0`.
   * @param offsetY Added to every tile's destination y. Default `0`.
   */
  public draw(offsetX: number = 0, offsetY: number = 0): void {
    this.tilemap.layers.forEach((layer) => {
      layer.data.forEach((tile) => {
        // v: Source column
        // w: Source row
        // x: Destination column
        // y: Destination row
        // z: Tileset index
        var [v, w, x, y, z] = tile;
        var {
          sprite,
          tilewidth: s,
          tileheight: u
        } = this.tilemap.tilesets[z];
        // sourceInset=0.5: half-texel inset prevents the sampler at the tile
        // edge from bleeding into the adjacent tile's pixels in the atlas.
        sprite.draw((x * s) + offsetX, (y * u) + offsetY, undefined, [w, v], 0.5);
      });
    });
  }
}
/** Loads map2d-format JSON maps (see `TilemapData`) and their tileset images. */
export default class TilemapManager {
  /** The renderer passed to the constructor (any `Renderer`, despite the name). */
  canvas2DRenderer: Renderer;
  /** @param canvas2Drenderer Renderer used for the tileset sprites (`Canvas2DRenderer` or `WebGLRenderer`). */
  constructor(canvas2Drenderer: Renderer) {
    this.canvas2DRenderer = canvas2Drenderer;
  }
  /**
   * Fetch the map JSON at `resource`, load every tileset image in parallel and
   * resolve with a `Tilemap`.
   *
   * Rejects with an `Error` if the map request returns a non-OK HTTP status
   * (the message includes the status) or if a tileset image fails to load
   * (the message includes the image URL).
   */
  public async load(resource: string): Promise<Tilemap> {
    const request: Request = new Request(resource)
    return fetch(request)
      .then(function(response) {
        if (!response.ok) {
          throw new Error(`TilemapManager: failed to load map "${resource}": HTTP ${response.status} ${response.statusText}`.trim());
        }
        return response.json()
      })
      .then(async (tilemap: TilemapData) => {
        tilemap.tilesets = await Promise.all(tilemap.tilesets.map((tileset) => {
          return new Promise<Tileset>((resolve, reject) => {
            var image: HTMLImageElement = new Image();
            image.onload = () => {
              tileset.sprite = new Sprite(this.canvas2DRenderer, image, tileset.tilewidth, tileset.tileheight, [], 0, tileset.tilewidth, tileset.tileheight);
              resolve(tileset);
            }
            image.onerror = () => {
              reject(new Error(`TilemapManager: failed to load tileset image "${tileset.image}"`));
            };
            image.src = tileset.image;
          })
        }))
        return new Tilemap(tilemap)
      })
  }
}