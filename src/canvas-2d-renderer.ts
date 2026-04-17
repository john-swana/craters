export default class Canvas2DRenderer {
  public devicePixelRatio: number;
  public canvasElement: HTMLCanvasElement;
  public context: CanvasRenderingContext2D;
  public width: number;
  public height: number;
  constructor(width: number, height: number, options?: any, devicePixelRatio = window.devicePixelRatio) {
    this.width = width;
    this.height = height;
    this.canvasElement = document.createElement("canvas", options);
    this.context = this.canvasElement.getContext("2d")!;
    this.devicePixelRatio = devicePixelRatio;
    this.canvasElement.style.width = width + "px";
    this.canvasElement.style.height = height + "px";
    this.canvasElement.width = Math.round(width * devicePixelRatio);
    this.canvasElement.height = Math.round(height * devicePixelRatio);
    this.context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    // Prevent the 2D resampler from feathering up-scaled tile bitmaps, which
    // causes visible seams between tiles on high-DPR (mobile) displays.
    this.context.imageSmoothingEnabled = false;
  }
  public createImage(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap): HTMLImageElement | HTMLCanvasElement | ImageBitmap {
    return image;
  }
  public drawImage(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    sx: number = 0,
    sy: number = 0,
    sWidth: number = image.width,
    sHeight: number = image.height,
    dx: number = 0,
    dy: number = 0,
    dWidth: number = image.width,
    dHeight: number = image.height
  ): void {
    // Snap destination to the nearest PHYSICAL pixel boundary.
    // Math.round(CSS) is not enough: on non-integer DPR devices (Pixel=2.625,
    // some Samsung=2.75) round(70)*2.625 = 183.75 — still sub-pixel.
    // Math.round(v * DPR) / DPR guarantees round(v*DPR)/DPR * DPR = integer.
    const pr = this.devicePixelRatio;
    const snap = (v: number) => Math.round(v * pr) / pr;
    this.context.drawImage(
      image,
      sx, sy, sWidth, sHeight,
      snap(dx), snap(dy), snap(dWidth), snap(dHeight)
    );
  }
  public clear(v?: string, w: number = 0, x: number = 0, y: number = this.width, z: number = this.height): void {
    if (v) {
      this.context.save();
      this.context.fillStyle = v;
      this.context.fillRect(w, x, y, z);
      this.context.restore();
    } else {
      this.context.clearRect(w, x, y, z);
    }
  }
  public drawRect(x: number, y: number, w: number, h: number, color: string, fill: boolean = false): void {
    this.context.save();
    if (fill) {
      this.context.fillStyle = color;
      this.context.fillRect(x, y, w, h);
    } else {
      this.context.strokeStyle = color;
      this.context.strokeRect(x, y, w, h);
    }
    this.context.restore();
  }
  public drawCircle(x: number, y: number, r: number, color: string, fill: boolean = false): void {
    this.context.save();
    this.context.beginPath();
    this.context.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
      this.context.fillStyle = color;
      this.context.fill();
    } else {
      this.context.strokeStyle = color;
      this.context.stroke();
    }
    this.context.restore();
  }
  public drawPolygon(points: { x: number, y: number }[], color: string, fill: boolean = false): void {
    if (points.length < 2) return;
    this.context.save();
    this.context.beginPath();
    this.context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.context.lineTo(points[i].x, points[i].y);
    }
    this.context.closePath();
    if (fill) {
      this.context.fillStyle = color;
      this.context.fill();
    } else {
      this.context.strokeStyle = color;
      this.context.stroke();
    }
    this.context.restore();
  }
  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1): void {
    this.context.save();
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.strokeStyle = color;
    this.context.lineWidth = width;
    this.context.stroke();
    this.context.restore();
  }
  public resize(width: number = this.width, height: number = this.height, devicePixelRatio: number = this.devicePixelRatio): void {
    this.width = width;
    this.height = height;
    this.devicePixelRatio = devicePixelRatio;
    this.canvasElement.style.width = width + "px";
    this.canvasElement.style.height = height + "px";
    this.canvasElement.width = Math.round(width * devicePixelRatio);
    this.canvasElement.height = Math.round(height * devicePixelRatio);
    this.context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    // Re-apply after resize since resizing the canvas resets all context state.
    this.context.imageSmoothingEnabled = false;
  }
};