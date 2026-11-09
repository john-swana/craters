import Canvas2DRenderer from "./canvas-2d-renderer";

/**
 * Minimal renderer surface that `Tile`, `Sprite` and `TilemapManager` depend on.
 * Both `Canvas2DRenderer` and `WebGLRenderer` satisfy it. The handle returned by
 * `createImage` is renderer-specific (the image itself for 2D, a GPU texture
 * handle for WebGL) and is only ever passed back into the same renderer's
 * `drawImage`, so it is treated as opaque.
 */
export interface Renderer {
  /** Prepare an image for drawing and return a renderer-specific handle. */
  createImage(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap): any;
  /** Draw a source region of a `createImage` handle to a destination rectangle (CSS pixels). */
  drawImage(
    image: any,
    sx?: number, sy?: number, sWidth?: number, sHeight?: number,
    dx?: number, dy?: number, dWidth?: number, dHeight?: number
  ): void;
}

/**
 * Draws regions of an image through a `Renderer`.
 *
 * Fast path: with the default clip rectangle, `"no-repeat"`, `"transparent"`
 * fill/stroke and `lineWidth` 0, the image is just passed to
 * `renderer.createImage` (identity for `Canvas2DRenderer`, a texture upload for
 * `WebGLRenderer`).
 *
 * Otherwise the constructor builds an offscreen canvas the size of the image,
 * clips it to `positions`, paints `fillStyle`/`strokeStyle`, draws the image on
 * top, then fills a `width × height` canvas with a `CanvasPattern` of the
 * result (using `repeat`). That canvas becomes the source for `draw()`.
 */
export default class Tile {
  /** The renderer passed to the constructor (any `Renderer`, despite the name). */
  canvas2DRenderer: Renderer;
  /**
   * The handle returned by `renderer.createImage`: an image or canvas for
   * `Canvas2DRenderer`, a `{ texture, width, height }` handle for `WebGLRenderer`.
   */
  sImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  sWidth: number;
  sHeight: number;
  dWidth: number;
  dHeight: number;
  positions: number[][];
  width: number;
  height: number;
  repeat: string;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  /**
   * @param canvas2DRenderer Renderer to draw with (`Canvas2DRenderer` or `WebGLRenderer`).
   * @param sImage Source image, canvas or bitmap (not a `createImage` handle; the Tile creates its own).
   * @param sWidth Default source region width used by `draw()`.
   * @param sHeight Default source region height used by `draw()`.
   * @param dWidth Default destination width used by `draw()`.
   * @param dHeight Default destination height used by `draw()`.
   * @param positions Clip polygon vertices `[x, y][]` in image pixels (convex or
   *   concave). Default: the image's four corners.
   * @param width Width of the processed (pattern) canvas. Default: image width. Unused on the fast path.
   * @param height Height of the processed (pattern) canvas. Default: image height. Unused on the fast path.
   * @param repeat `CanvasPattern` repetition: `"repeat"`, `"repeat-x"`, `"repeat-y"` or `"no-repeat"` (default).
   *   The whole clipped image is repeated, not a `sWidth × sHeight` region.
   * @param fillStyle Painted inside the clip polygon, under the image. Default `"transparent"`.
   * @param strokeStyle Stroked along the clip polygon, under the image and clipped
   *   to it, so only the inner half of `lineWidth` can show. Default `"transparent"`.
   * @param lineWidth Stroke width in pixels. Default `0`.
   */
  constructor(
    canvas2DRenderer: Renderer,
    sImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    sWidth: number,
    sHeight: number,
    dWidth: number,
    dHeight: number,
    positions: number[][] = [
      [0, 0],
      [sImage.width, 0],
      [sImage.width, sImage.height],
      [0, sImage.height]
    ],
    width: number = sImage.width,
    height: number = sImage.height,
    repeat: string = "no-repeat",
    fillStyle: string = "transparent",
    strokeStyle: string = "transparent",
    lineWidth: number = 0
  ) {
    this.canvas2DRenderer = canvas2DRenderer;
    this.sImage = sImage;
    this.sWidth = sWidth;
    this.sHeight = sHeight;
    this.dWidth = dWidth;
    this.dHeight = dHeight;
    this.positions = positions;
    this.width = width;
    this.height = height;
    this.repeat = repeat;
    this.fillStyle = fillStyle;
    this.strokeStyle = strokeStyle;
    this.lineWidth = lineWidth;

    // Fast path: a plain non-repeating tile with the default full-image rectangle
    // and no fill/stroke decoration draws the source image directly. Building the
    // offscreen clip/pattern canvas below is pure overhead in that case — which is
    // every spritesheet and font atlas tile. Only do the work when it changes the
    // output: a repeat mode, a stroke, a custom fill/stroke, or a non-default clip.
    const isFullRect =
      positions.length === 4 &&
      positions[0][0] === 0 && positions[0][1] === 0 &&
      positions[1][0] === sImage.width && positions[1][1] === 0 &&
      positions[2][0] === sImage.width && positions[2][1] === sImage.height &&
      positions[3][0] === 0 && positions[3][1] === sImage.height;
    const needsProcessing =
      repeat !== "no-repeat" ||
      lineWidth > 0 ||
      fillStyle !== "transparent" ||
      strokeStyle !== "transparent" ||
      !isFullRect;

    if (!needsProcessing) {
      // Still hand the image to the renderer's createImage — identity for
      // Canvas2DRenderer (cheap), but a texture upload for WebGLRenderer, which
      // needs a texture handle (not a raw image) in drawImage. The work the fast
      // path actually avoids is the offscreen clip/pattern canvas below.
      this.sImage = this.canvas2DRenderer.createImage(sImage);
    } else {
      const canvas2DRenderer: Canvas2DRenderer = new Canvas2DRenderer(sImage.width, sImage.height, null, 1);
      const context = canvas2DRenderer.context;
      if (!context) throw new Error("Failed to get context");

      context.moveTo(positions[0][0], positions[0][1]);
      positions.forEach(function (position) {
        context.lineTo(position[0], position[1]);
      })
      context.lineTo(positions[0][0], positions[0][1]);
      context.clip();
      context.fillStyle = fillStyle;
      context.strokeStyle = strokeStyle;
      context.lineWidth = lineWidth;
      context.fill();
      context.stroke();
      // @ts-ignore - drawImage supports various image types but TS might complain about exact overlap
      context.drawImage(sImage, 0, 0, sImage.width, sImage.height, 0, 0, sImage.width, sImage.height);
      const pattern = context.createPattern(canvas2DRenderer.canvasElement, repeat);
      if (pattern) {
        canvas2DRenderer.resize(width, height, 1);
        context.fillStyle = pattern;
        context.fillRect(0, 0, width, height);
        this.sImage = this.canvas2DRenderer.createImage(canvas2DRenderer.canvasElement);
      }
    }
  }
  /**
   * Draw a region of the (possibly processed) source image.
   * @param sx Source x in pixels.
   * @param sy Source y in pixels.
   * @param dx Destination x in CSS pixels.
   * @param dy Destination y in CSS pixels.
   * @param sw Source width. Default `sWidth`.
   * @param sh Source height. Default `sHeight`.
   * @param dw Destination width. Default `dWidth`.
   * @param dh Destination height. Default `dHeight`.
   */
  draw(sx: number, sy: number, dx: number, dy: number, sw: number = this.sWidth, sh: number = this.sHeight, dw: number = this.dWidth, dh: number = this.dHeight): void {
    this.canvas2DRenderer.drawImage(this.sImage, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}