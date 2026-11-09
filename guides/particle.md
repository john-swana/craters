# ParticleSystem Usage Guide

`ParticleSystem` manages a collection of short-lived, sprite-based particles. It integrates with
`Canvas2DRenderer` and is designed to be called from inside a `RenderLoop` callback.

## Features

- **Sprite particles** — uses preloaded `HTMLImageElement`s, one chosen at random per particle
- **Color tinting** — applies a CSS color tint to each particle canvas, cached for performance (see *Notes and Limitations*)
- **Bias direction** — optional directional bias blended with random spread (e.g. for fire drifting upward)
- **Per-particle physics** — independent gravity, drag, and rotation speed per emit call
- **Fade out** — alpha decreases linearly from full opacity to transparent over the particle's lifetime
- **Lazy tinting** — particles whose image was not yet loaded when emitted are skipped by `draw()` until the image loads, then tinted on the first draw after that

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

// Game loop: step particles at the fixed rate, draw once per animation frame
new RenderLoop(
  (loop) => {
    particles.update(1);
  },
  60,
  (loop) => {
    renderer.clear();
    particles.draw(renderer);
  },
);
```

## ParticleEmitConfig Reference

| Field | Type | Description |
|---|---|---|
| `images` | `HTMLImageElement[]` | Sprite images — one chosen at random per particle |
| `count` | `number` | Number of particles to spawn |
| `colors` | `string[]` | CSS color strings — one picked at random per particle as a tint |
| `minSize` / `maxSize` | `number` | Particle width/height range in CSS pixels (rounded to whole pixels) |
| `minLife` / `maxLife` | `number` | Lifetime range in fixed-step ticks |
| `speed` | `number` | Base speed in pixels per tick; each particle gets `speed` × a random factor of 0.55–1.45 |
| `gravity` | `number` | Per-tick downward acceleration (negative = upward drift) |
| `drag` | `number` | Velocity multiplier per tick — `0.88` means 12% drag per tick, `1` = none |
| `biasX` | `number?` | Horizontal bias direction. Default `0` when `biasY` is set |
| `biasY` | `number?` | Vertical bias direction (positive = downward). Default `1` (down) when `biasX` is set |
| `biasStrength` | `number?` | `0` = pure random spread, `1` = pure bias direction. Default `0.5` |
| `minRotationSpeed` / `maxRotationSpeed` | `number` | Rotation speed range in radians per tick |

## Directional Bias

Use `biasX`, `biasY`, and `biasStrength` to push particles in a preferred direction while
retaining spread. Bias is applied only when `biasX` or `biasY` is set (`biasStrength` alone
is ignored). Each particle's random unit direction is blended linearly with the bias vector:
`dir = random × (1 − biasStrength) + bias × biasStrength`.

- Set **both** `biasX` and `biasY`: if you set only `biasX`, `biasY` defaults to `1`, so
  `{ biasX: 1 }` pushes particles down-right, not right.
- The blended vector is not re-normalised. Particles moving against the bias end up slower,
  and a bias longer than 1 (e.g. `(1, 1)`) makes them faster. Use a unit-length bias.

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

// Emit every fixed step (inside the RenderLoop step callback) at the torch position
particles.emit(fireConfig, torchX, torchY);
```

## Camera Offset

`draw()` accepts optional `cameraX` / `cameraY` offsets so particles render correctly in
a scrolling world. Pass the same camera offset used by your tile/sprite renderers.

```typescript
particles.draw(renderer, -camera.x, -camera.y);
```

## Integration with RenderLoop and ECS

`RenderLoop` runs its first callback once per fixed step, and the optional third argument,
`render`, once per animation frame after that frame's steps. Call `update(1)` in the step
callback, and `draw()` in `render` after your other draw calls. (Drawing in the step callback
also works, but then particles are drawn once per step rather than once per frame.)

`update()` takes **ticks** (`1` = one fixed step), not `loop.delta` (milliseconds) or
`loop.deltaSeconds`. Inside an ECS system that receives seconds, still call `update(1)` once
per `execute()`:

```typescript
import { EntityComponentSystem as ECS, ParticleSystem, RenderLoop } from "craters";

const particles = new ParticleSystem();

class ParticleUpdateSystem extends ECS.System {
  execute(deltaSeconds: number) {
    particles.update(1); // one fixed step = 1 tick
  }
}

const world = new ECS.World();
world.registerSystem(new ParticleUpdateSystem());

new RenderLoop(
  (loop) => {
    world.execute(loop.deltaSeconds); // runs ParticleUpdateSystem once per fixed step
  },
  60,
  (loop) => {
    renderer.clear();
    // ... draw sprites/tiles ...
    particles.draw(renderer, -camera.x, -camera.y);
  },
);
```

Don't name the system class `ParticleSystem`: that clashes with the imported class.

## API Reference

### `new ParticleSystem()`

Creates an empty particle system.

### `emit(config: ParticleEmitConfig, x: number, y: number): void`

Spawns `config.count` particles at world position `(x, y)`. Can be called multiple times
per tick to layer effects. Particles from multiple `emit()` calls accumulate in the same system.

### `update(delta: number): void`

Advances all live particles by `delta` ticks. Expired particles are removed. Call
`update(1)` once per fixed step.

### `draw(renderer: Canvas2DRenderer, cameraX = 0, cameraY = 0): void`

Renders all live particles onto the `Canvas2DRenderer`. Should be called after all other
draw calls so particles appear on top. `cameraX`/`cameraY` are added to each particle's
position (pass `-camera.x`, `-camera.y`) and default to `0`.

### `count` (read-only)

Returns the number of currently live particles.

## Notes and Limitations

- **No pooling or cap.** Each particle is a new object; expired ones are removed from the
  array. There is no maximum count and no `clear()`. Keep emission rates and lifetimes
  bounded, and create a new `ParticleSystem` to discard all particles at once.
- **Global tint cache.** Tinted canvases are cached in one module-level map shared by every
  `ParticleSystem`, keyed by image `src`, color and size, and never evicted. Memory grows
  with the number of distinct image × color × size combinations used.
