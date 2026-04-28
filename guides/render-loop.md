# RenderLoop Usage Guide

`RenderLoop` implements a **fixed-timestep game loop** driven by `requestAnimationFrame`. Physics
and game logic run at a guaranteed step rate regardless of the display's refresh rate, while the
`alpha` value exposes how far into the next step the renderer currently is — enabling smooth
visual interpolation.

## How It Works

Each frame:
1. The elapsed wall-clock time since the last frame is added to an **accumulator**
2. The accumulator is consumed in fixed chunks (`frameRatio = 1000 / frameRate`)
3. Your callback is invoked once per consumed chunk, receiving the `RenderLoop` instance
4. After draining the accumulator, `alpha` (`accumulator / frameRatio`) is ready for interpolation

The accumulator is clamped to 250 ms to prevent the **spiral of death** when the tab regains
focus after being hidden.

## Basic Setup

```typescript
import { RenderLoop } from "craters";

const loop = new RenderLoop((loop) => {
  // Called once per fixed tick (default 60 fps)
  update(loop.delta);
  render(loop.alpha);
});
```

`RenderLoop` starts automatically in the constructor. No extra `start()` call is needed.

## Custom Frame Rate

```typescript
// 30 fps physics tick
const loop = new RenderLoop((loop) => {
  update(loop.delta);
}, 30);
```

## Loop Instance Properties

| Property | Type | Description |
|---|---|---|
| `delta` | `number` | Fixed step duration in ms (always `= frameRatio`) |
| `elapsed` | `number` | Total physics time elapsed in ms |
| `alpha` | `number` | Interpolation factor ∈ [0, 1) — fraction through the next step |
| `frameRate` | `number` | Target fixed steps per second |
| `frameRatio` | `number` | Fixed step in ms (`1000 / frameRate`) |
| `current` | `number` | `requestAnimationFrame` timestamp of the last frame |

## Render Interpolation with `alpha`

When the display runs faster than the physics tick (e.g. 144 Hz display, 60 Hz physics),
each rendered frame would otherwise see the same position. Use `alpha` to linearly interpolate
between the previous and current position to eliminate jitter.

```typescript
// Store previous position alongside current
let prevX = 0, prevY = 0;
let currX = 0, currY = 0;

const loop = new RenderLoop((loop) => {
  prevX = currX;
  prevY = currY;

  // Update physics
  currX += velocityX * loop.delta;
  currY += velocityY * loop.delta;

  // Render at interpolated position
  const renderX = prevX + (currX - prevX) * loop.alpha;
  const renderY = prevY + (currY - prevY) * loop.alpha;
  drawSprite(renderX, renderY);
});
```

## Tracking Elapsed Time

`loop.elapsed` accumulates total physics time in ms — useful for animations that are keyed
to physics ticks (e.g. sprite frame selection inside `Sprite`).

```typescript
const loop = new RenderLoop((loop) => {
  const frameSec = loop.elapsed / 1000;
  const spriteFrame = Math.floor(frameSec / 0.1) % totalFrames;
});
```

## Stopping and Restarting

```typescript
const loop = new RenderLoop(tick);

// Pause (e.g. on game-over screen)
loop.stop();

// Resume — guard inside start() prevents double RAF chains
loop.start();
```

## Integration with ECS

```typescript
import { EntityComponentSystem as ECS, RenderLoop } from "craters";

const world = new ECS.World();
world.registerSystem(new MovementSystem());
world.registerSystem(new RenderSystem(renderer));

const loop = new RenderLoop((loop) => {
  world.execute(loop.delta);
});
```

## API Reference

### `new RenderLoop(callback, frameRate?)`

| Parameter | Default | Description |
|---|---|---|
| `callback` | — | Called once per fixed tick with the `RenderLoop` instance |
| `frameRate` | `60` | Target physics update rate in Hz |

### `start()`

Starts or resumes the RAF loop. Safe to call when already running (no-op).

### `stop()`

Cancels the RAF loop. Call to pause the game.
