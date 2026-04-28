# ParticleSystem Usage Guide

`ParticleSystem` manages a pool of short-lived, sprite-based particles. It integrates with
`Canvas2DRenderer` and is designed to be called from inside a `RenderLoop` callback.

## Features

- **Sprite particles** — uses preloaded `HTMLImageElement`s, one chosen at random per particle
- **Color tinting** — applies a CSS color tint to each particle canvas, cached for performance
- **Bias direction** — optional directional bias blended with random spread (e.g. for fire drifting upward)
- **Per-particle physics** — independent gravity, drag, and rotation speed per emit call
- **Fade out** — alpha decreases linearly from full opacity to transparent over the particle's lifetime
- **Lazy tinting** — particles whose image was not yet loaded when emitted are tinted on the first draw call

## Basic Usage

```typescript
import { ParticleSystem, AssetsManager, Canvas2DRenderer, RenderLoop } from "craters";

const renderer = new Canvas2DRenderer(800, 600);
document.body.appendChild(renderer.canvasElement);

const assets = new AssetsManager();
const particles = new ParticleSystem();

// Load sprite images for particles
const [sparkImg, glowImg] = await Promise.all([
  assets.loadImage("spark.png"),
  assets.loadImage("glow.png"),
]);

// Define a reusable emit config
const explosionConfig = {
  images: [sparkImg, glowImg],
  count: 30,
  colors: ["#ff6600", "#ffaa00", "#ffffff"],
  minSize: 6,
  maxSize: 18,
  minLife: 20,
  maxLife: 50,
  speed: 4,
  gravity: 0.15,
  drag: 0.88,
  minRotationSpeed: 0.02,
  maxRotationSpeed: 0.12,
};

// Trigger an explosion at world position (400, 300)
particles.emit(explosionConfig, 400, 300);

// Game loop
new RenderLoop((loop) => {
  renderer.clear();
  particles.update(1);
  particles.draw(renderer);
});
```

## ParticleEmitConfig Reference

| Field | Type | Description |
|---|---|---|
| `images` | `HTMLImageElement[]` | Sprite images — one chosen at random per particle |
| `count` | `number` | Number of particles to spawn |
| `colors` | `string[]` | CSS color strings — one picked at random per particle as a tint |
| `minSize` / `maxSize` | `number` | Particle size range in pixels |
| `minLife` / `maxLife` | `number` | Lifetime range in fixed-step ticks |
| `speed` | `number` | Base speed scalar (pixels per tick) |
| `gravity` | `number` | Per-tick downward acceleration (negative = upward drift) |
| `drag` | `number` | Velocity multiplier per tick — `0.88` means 12% drag per tick |
| `biasX` | `number?` | Horizontal direction bias, normalised |
| `biasY` | `number?` | Vertical direction bias, normalised (positive = downward) |
| `biasStrength` | `number?` | `0` = pure random spread, `1` = pure bias direction |
| `minRotationSpeed` / `maxRotationSpeed` | `number` | Rotation speed range in radians per tick |

## Directional Bias

Use `biasX`, `biasY`, and `biasStrength` to push particles in a preferred direction while
retaining spread. Values are blended linearly with the random angle.

```typescript
// Fire effect — particles drift upward with some spread
const fireConfig = {
  images: [emberImg],
  count: 8,
  colors: ["#ff4400", "#ff8800", "#ffcc00"],
  minSize: 4, maxSize: 10,
  minLife: 30, maxLife: 60,
  speed: 2,
  gravity: -0.05,   // slight upward pull
  drag: 0.94,
  biasX: 0,
  biasY: -1,        // upward
  biasStrength: 0.6,
  minRotationSpeed: 0.01,
  maxRotationSpeed: 0.06,
};

// Emit each frame at the torch position
particles.emit(fireConfig, torchX, torchY);
```

## Camera Offset

`draw()` accepts optional `cameraX` / `cameraY` offsets so particles render correctly in
a scrolling world. Pass the same camera offset used by your tile/sprite renderers.

```typescript
particles.draw(renderer, -camera.x, -camera.y);
```

## Integration with RenderLoop and ECS

Call `update()` once per fixed tick and `draw()` once per render frame. Because `RenderLoop`
calls the callback on every fixed step, both calls sit in the same callback.

```typescript
import { EntityComponentSystem as ECS, ParticleSystem, RenderLoop } from "craters";

const particles = new ParticleSystem();

class ParticleSystem extends ECS.System {
  execute(delta: number) {
    particles.update(delta);
  }
}

const world = new ECS.World();
world.registerSystem(new ParticleSystem());

new RenderLoop((loop) => {
  world.execute(loop.delta);
  renderer.clear();
  // ... draw sprites/tiles ...
  particles.draw(renderer, -camera.x, -camera.y);
});
```

## API Reference

### `new ParticleSystem()`

Creates an empty particle system.

### `emit(config, x, y)`

Spawns `config.count` particles at world position `(x, y)`. Can be called multiple times
per tick to layer effects. Particles from multiple `emit()` calls accumulate in the same pool.

### `update(delta)`

Advances all live particles by `delta` ticks. Expired particles are removed. Call once per
fixed tick.

### `draw(renderer, cameraX?, cameraY?)`

Renders all live particles onto the `Canvas2DRenderer`. Should be called after all other
draw calls so particles appear on top. `cameraX`/`cameraY` default to `0`.

### `count` (read-only)

Returns the number of currently live particles.
