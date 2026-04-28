import Canvas2DRenderer from "./canvas-2d-renderer";

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

// Configuration passed to ParticleSystem.emit().
// Consumers define their own named presets using this type.
export interface ParticleEmitConfig {
  images: HTMLImageElement[];       // pre-loaded sprites, one chosen at random
  count: number;                    // number of particles to spawn
  colors: string[];                 // CSS color strings, one picked at random per particle
  minSize: number;
  maxSize: number;
  minLife: number;                  // lifetime in fixed-step ticks
  maxLife: number;
  speed: number;                    // base speed scalar (pixels / tick)
  gravity: number;                  // per-tick downward acceleration
  drag: number;                     // velocity multiplier per tick (e.g. 0.88 = 12% drag)
  biasX?: number;                   // optional horizontal direction bias (normalised)
  biasY?: number;                   // optional vertical direction bias (normalised)
  biasStrength?: number;            // 0 = pure random direction, 1 = pure bias direction
  minRotationSpeed: number;
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

export default class ParticleSystem {
  private pool: Particle[] = [];

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

  // Advance all particles by one fixed tick.
  // delta: normalised delta (1.0 = one fixed step at target FPS).
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

  // Draw all live particles onto the Canvas2DRenderer.
  // Call after RenderSystem so particles appear on top.
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

  get count(): number { return this.pool.length; }
}
