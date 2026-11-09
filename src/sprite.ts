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

/**
 * Animates a spritesheet cut into a grid of `sWidth × sHeight` cells
 * (`ceil(image.height / sHeight)` rows by `ceil(image.width / sWidth)` columns).
 * Frames are addressed as `[row, column]`. Each Sprite builds its own `Tile`,
 * so on `WebGLRenderer` every Sprite uploads its own texture, even for a shared image.
 */
export default class Sprite {
  renderer: Renderer;
  image: HTMLImageElement;
  sWidth: number;
  sHeight: number;
  /** Animation sequence of `[row, column]` cells. */
  frames: number[][] = [];
  /** Seconds each frame is shown. */
  duration: number;
  dWidth: number;
  dHeight: number;
  private grid: GridCell[][];
  /** The `[row, column]` chosen by the most recent `draw()` call. */
  index: number[] = [];

  /**
   * @param renderer Renderer to draw with (`Canvas2DRenderer` or `WebGLRenderer`).
   * @param image Spritesheet image.
   * @param sWidth Width of one cell in the sheet, in pixels.
   * @param sHeight Height of one cell in the sheet, in pixels.
   * @param frames Animation sequence of `[row, column]` cells.
   * @param duration Seconds each frame is shown.
   * @param dWidth Destination draw width.
   * @param dHeight Destination draw height.
   */
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

  /**
   * Draw the current frame at (`dX`, `dY`).
   *
   * Without `frameIndex`, the frame is
   * `frames[floor(renderLoop.elapsed / 1000 / duration) % frames.length]`
   * (`elapsed` is in milliseconds). A cell outside the grid draws nothing.
   *
   * @param renderLoop Needed only for time-driven animation; may be omitted
   *   when `frameIndex` is given (e.g. static tilemap tiles).
   * @param frameIndex `[row, column]` to draw instead of the animated frame.
   * @param sourceInset Pixels trimmed from each edge of the source cell
   *   (0.5 = half a texel) to stop neighbouring cells bleeding in. The
   *   destination size is unchanged. Default `0`.
   */
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