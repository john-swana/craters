import RenderLoop from "./render-loop";
import Tile, { Renderer } from "./tile";

interface GridCell {
  tile: Tile;
  width: number;
  height: number;
  position: {
    x: number;
    y: number;
  };
}

export default class Sprite {
  renderer: Renderer;
  image: HTMLImageElement;
  sWidth: number;
  sHeight: number;
  frames: number[][] = [];
  duration: number;
  dWidth: number;
  dHeight: number;
  private grid: GridCell[][];
  index: number[] = [];

  constructor(renderer: Renderer, image: HTMLImageElement, sWidth: number, sHeight: number, frames: number[][], duration: number, dWidth: number, dHeight: number) {
    this.frames = frames;
    this.index = [];
    this.renderer = renderer;
    this.image = image;
    this.sWidth = sWidth;
    this.sHeight = sHeight;
    this.duration = duration;
    this.dWidth = dWidth;
    this.dHeight = dHeight;

    const spritesheet = new Tile(renderer, image, sWidth, sHeight, dWidth, dHeight);

    // Initialize grid properly
    const rows = Math.ceil(image.height / sHeight);
    const cols = Math.ceil(image.width / sWidth);

    this.grid = [];

    for (let r = 0; r < rows; r++) {
      const row: GridCell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          tile: spritesheet,
          width: sWidth,
          height: sHeight,
          position: {
            x: c * sWidth,
            y: r * sHeight
          }
        });
      }
      this.grid.push(row);
    }
  }

  // renderLoop is only needed for time-driven animation; it may be omitted when
  // an explicit frameIndex is supplied (e.g. static tilemap tiles).
  draw(dX: number, dY: number, renderLoop?: RenderLoop, frameIndex?: number[], sourceInset: number = 0) {
    if (frameIndex) {
      this.index = frameIndex;
    } else {
      this.index = this.frames[(Math.floor((renderLoop!.elapsed / 1000) / this.duration) % this.frames.length)];
    }

    if (this.index && this.index.length >= 2) {
      const row = this.grid[this.index[0]];
      if (row) {
        const column = row[this.index[1]];
        if (column) {
          const { x: sX, y: sY } = column.position;
          // Apply half-texel source inset to prevent bleeding from adjacent
          // tiles in the atlas. Destination size is unchanged so tiles still
          // fill their slots exactly; only the sampled source region shrinks.
          column.tile.draw(
            sX + sourceInset, sY + sourceInset,
            dX, dY,
            column.width  - sourceInset * 2,
            column.height - sourceInset * 2
          );
        }
      }
    }
  }
}