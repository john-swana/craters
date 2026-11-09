import Canvas2DRenderer from "./canvas-2d-renderer";

// Module-global tint cache shared by every ParticleSystem. Keyed by image
// src, color and rounded size; entries are never evicted.
const tintCache = new Map<string, HTMLCanvasElement>();

function getTinted(img: HTMLImageElement, color: string, size: number): HTMLCanvasElement {
  const key = `${img.src}|${color}|${size}`;
  if (tintCache.has(key)) return tintCache.get(key)!;

  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "luminosity";
  ctx.globalAlpha = 0.4;
  ctx.drawImage(img, 0, 0, size, size);
  tintCache.set(key, c);
  return c;
}

/**
 * Configuration passed to {@link ParticleSystem.emit}.
 * Consumers define their own named presets using this type.
 */
export interface ParticleEmitConfig {
  /** Pre-loaded sprites; one is chosen at random per particle. */
  images: HTMLImageElement[];
  /** Number of particles to spawn per emit() call. */
  count: number;
  /** CSS color strings; one is picked at random per particle as a tint. */
  colors: string[];
  /** Minimum particle width/height in CSS pixels (rounded to an integer). */
  minSize: number;
  /** Maximum particle width/height in CSS pixels (rounded to an integer). */
  maxSize: number;
  /** Minimum lifetime in fixed-step ticks. */
  minLife: number;
  /** Maximum lifetime in fixed-step ticks. */
  maxLife: number;
  /** Base speed in pixels per tick; each particle gets speed × random 0.55–1.45. */
  speed: number;
  /** Downward acceleration in pixels per tick² (negative = upward). */
  gravity: number;
  /** Velocity multiplier per tick (e.g. 0.88 = 12% drag); 1 = no drag. */
  drag: number;
  /**
   * Horizontal bias direction. Bias is applied only if biasX or biasY is set;
   * then biasX defaults to 0. Not normalised by the engine.
   */
  biasX?: number;
  /**
   * Vertical bias direction (positive = down). Bias is applied only if biasX
   * or biasY is set; then biasY defaults to 1 (down). Not normalised.
   */
  biasY?: number;
  /**
   * Linear blend between the random unit vector (0) and the bias vector (1).
   * Defaults to 0.5; ignored unless biasX or biasY is set.
   */
  biasStrength?: number;
  /** Minimum rotation speed in radians per tick. */
  minRotationSpeed: number;
  /** Maximum rotation speed in radians per tick. */
  maxRotationSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  canvas: HTMLCanvasElement | null;
  img: HTMLImageElement;
  gravity: number;
  drag: number;
}

/**
 * Short-lived, tinted sprite particles drawn onto a Canvas2DRenderer.
 * Live particles are kept in an array: there is no object reuse and no
 * maximum count.
 */
export default class ParticleSystem {
  private pool: Particle[] = [];

  /** Spawn `config.count` particles at world position (x, y). */
  emit(config: ParticleEmitConfig, x: number, y: number): void {
    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      let vx = Math.cos(angle);
      let vy = Math.sin(angle);

      if (config.biasX !== undefined || config.biasY !== undefined) {
        const bx = config.biasX ?? 0;
        const by = config.biasY ?? 1;
        const s = config.biasStrength ?? 0.5;
        vx = vx * (1 - s) + bx * s;
        vy = vy * (1 - s) + by * s;
      }

      const speedVar = 0.55 + Math.random() * 0.9;
      vx *= config.speed * speedVar;
      vy *= config.speed * speedVar;

      const life = config.minLife + Math.random() * (config.maxLife - config.minLife);
      const size = Math.round(config.minSize + Math.random() * (config.maxSize - config.minSize));
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      const img = config.images[Math.floor(Math.random() * config.images.length)];
      const rotSpeed = config.minRotationSpeed +
        Math.random() * (config.maxRotationSpeed - config.minRotationSpeed);

      const canvas = img.complete && img.naturalWidth > 0
        ? getTinted(img, color, size)
        : null;

      this.pool.push({
        x, y, vx, vy,
        life, maxLife: life,
        size, rotation: Math.random() * Math.PI * 2,
        rotationSpeed: rotSpeed,
        color, canvas, img,
        gravity: config.gravity,
        drag: config.drag,
      });
    }
  }

  /**
   * Advance all particles by `delta` ticks and remove expired ones.
   * @param delta elapsed time in fixed-step ticks (1 = one fixed step); this
   *   is not `RenderLoop.delta` (milliseconds) or `deltaSeconds`.
   */
  update(delta: number): void {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= delta;
      if (p.life <= 0) { this.pool.splice(i, 1); continue; }
      p.vy += p.gravity * delta;
      p.vx *= Math.pow(p.drag, delta);
      p.vy *= Math.pow(p.drag, delta);
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.rotation += p.rotationSpeed * delta;
    }
  }

  /**
   * Draw all live particles onto the Canvas2DRenderer. Call after your other
   * draw calls so particles appear on top. Particles whose image has not
   * loaded yet are skipped (and tinted on the first draw after it loads).
   * @param cameraX added to each particle's x (pass `-camera.x`), default 0.
   * @param cameraY added to each particle's y (pass `-camera.y`), default 0.
   */
  draw(renderer: Canvas2DRenderer, cameraX = 0, cameraY = 0): void {
    if (this.pool.length === 0) return;
    const ctx = renderer.context;
    ctx.save();
    for (const p of this.pool) {
      if (!p.canvas && p.img.complete && p.img.naturalWidth > 0) {
        p.canvas = getTinted(p.img, p.color, p.size);
      }
      if (!p.canvas) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      const sx = Math.round(p.x + cameraX);
      const sy = Math.round(p.y + cameraY);
      const half = p.size / 2;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rotation);
      ctx.drawImage(p.canvas, -half, -half, p.size, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Number of live particles. */
  get count(): number { return this.pool.length; }
}
