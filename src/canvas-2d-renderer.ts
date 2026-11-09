/**
 * 2D canvas renderer with automatic high-DPR scaling. All drawing coordinates
 * are CSS pixels; the backing buffer is `width × devicePixelRatio` by
 * `height × devicePixelRatio` physical pixels. Implements the `Renderer`
 * interface used by `Tile`, `Sprite` and `TilemapManager`.
 */
export default class Canvas2DRenderer {
  /** Physical pixels per CSS pixel used for the backing buffer. */
  public devicePixelRatio: number;
  /** The canvas element, created internally. Append it to the DOM yourself. */
  public canvasElement: HTMLCanvasElement;
  /** The underlying 2D context (DPR transform already applied). */
  public context: CanvasRenderingContext2D;
  /** CSS width in pixels. */
  public width: number;
  /** CSS height in pixels. */
  public height: number;
  /**
   * @param width CSS width in pixels.
   * @param height CSS height in pixels.
   * @param options 2D context attributes (e.g. `{ alpha: false }`), passed to
   *   `canvas.getContext("2d", options)`.
   * @param devicePixelRatio Physical pixel multiplier. Defaults to `window.devicePixelRatio`.
   */
  constructor(width: number, height: number, options?: CanvasRenderingContext2DSettings | null, devicePixelRatio = window.devicePixelRatio) {
    this.width = width;
    this.height = height;
    this.canvasElement = document.createElement("canvas");
    // `options` are 2D context attributes (e.g. { alpha, willReadFrequently }).
    // They belong on getContext — createElement's 2nd arg is ElementCreationOptions
    // ({ is }), which silently ignored these. `?? undefined` keeps overload
    // resolution on the "2d" signature (passing `any`/`null` widens the return).
    this.context = this.canvasElement.getContext("2d", options ?? undefined)!;
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
  /** Passthrough: returns `image` unchanged (API parity with `WebGLRenderer.createImage`). */
  public createImage(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap): HTMLImageElement | HTMLCanvasElement | ImageBitmap {
    return image;
  }
  /**
   * Draw a region of `image` (the 9-argument `drawImage` form). The destination
   * rectangle is snapped to whole physical pixels.
   *
   * Every argument after `image` is optional, but the defaults differ from the
   * native API: an omitted `dWidth`/`dHeight` is the full image size, not
   * `sWidth`/`sHeight`, and the 3- and 5-argument native forms are not
   * supported (`drawImage(img, x, y)` sets `sx`/`sy`). Pass all nine arguments
   * to draw a sub-region at its own size.
   */
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
  /**
   * Clear a rectangle (default: the whole canvas), in CSS pixels.
   * @param v Fill colour (any CSS colour). If omitted, the area is cleared to transparent.
   * @param w Left edge (x) of the area. Default `0`.
   * @param x Top edge (y) of the area. Default `0`.
   * @param y Width of the area. Default `this.width`.
   * @param z Height of the area. Default `this.height`.
   */
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
  /**
   * Fill or stroke a rectangle. Context state is saved and restored around the call.
   * @param fill `true` to fill, `false` (default) to stroke.
   */
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
  /**
   * Fill or stroke a circle centred on (`x`, `y`). Context state is saved and
   * restored, but the call starts a new path, so any path the caller was building is discarded.
   * @param fill `true` to fill, `false` (default) to stroke.
   */
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
  /**
   * Fill or stroke a closed polygon (convex or concave). Does nothing for fewer
   * than 2 points. Starts a new path, so any path the caller was building is discarded.
   * @param fill `true` to fill, `false` (default) to stroke.
   */
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
  /**
   * Stroke a line segment. Starts a new path, so any path the caller was building is discarded.
   * @param width Line width in CSS pixels. Default `1`.
   */
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
  /**
   * Resize the canvas. Resizing resets all context state (fill/stroke styles,
   * font, transforms); the DPR transform and disabled image smoothing are re-applied.
   * Omitted arguments keep their current values.
   */
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