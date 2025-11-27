import Canvas2DRenderer from "./canvas-2d-renderer";
export default class Tile {
  canvas2DRenderer: Canvas2DRenderer;
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
    canvas2DRenderer: Canvas2DRenderer,
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
    fillStyle: string = "rgba(25.5, 114.75, 114.75, 0)",
    strokeStyle: string = "rgba(229.5, 25.5, 25.5, 0)",
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

    {
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