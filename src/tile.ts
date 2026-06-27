import Canvas2DRenderer from "./canvas-2d-renderer";

// Minimal renderer surface that Tile/Sprite/Tilemap depend on. Both
// Canvas2DRenderer and WebGLRenderer satisfy it. The handle returned by
// createImage is renderer-specific (a raw image for 2D, a GPU texture for
// WebGL) and only ever passed back into the same renderer's drawImage, so it is
// treated as opaque here.
export interface Renderer {
  createImage(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap): any;
  drawImage(
    image: any,
    sx?: number, sy?: number, sWidth?: number, sHeight?: number,
    dx?: number, dy?: number, dWidth?: number, dHeight?: number
  ): void;
}

export default class Tile {
  canvas2DRenderer: Renderer;
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
  draw(sx: number, sy: number, dx: number, dy: number, sw: number = this.sWidth, sh: number = this.sHeight, dw: number = this.dWidth, dh: number = this.dHeight): void {
    this.canvas2DRenderer.drawImage(this.sImage, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}