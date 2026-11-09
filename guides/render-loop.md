# RenderLoop Usage Guide

`RenderLoop` implements a **fixed-timestep game loop** driven by `requestAnimationFrame`. Game
logic runs at a fixed step rate regardless of the display's refresh rate. An optional `render`
callback runs once per display frame, with `alpha` exposing how far the frame is into the next
step — enabling smooth visual interpolation.

## How It Works

Each animation frame:
1. The time since the last frame, capped at 250 ms, is added to an **accumulator**
2. The accumulator is consumed in fixed chunks (`frameRatio = 1000 / frameRate` ms)
3. Your `execute` callback is invoked once per consumed chunk, receiving the `RenderLoop`
   instance, so a frame can run it zero, one or several times
4. After draining the accumulator, `alpha` is set to `accumulator / frameRatio`
5. The optional `render` callback is invoked once, with `alpha` and `current` already updated

The first animation frame after a start only records a timestamp; steps and rendering begin on the
next frame.

Capping each frame's time at 250 ms prevents the **spiral of death** when the tab regains focus
after being hidden. Time beyond the cap is dropped, so after a long stall the simulation runs behind
wall-clock time.

## Basic Setup

```typescript
import { RenderLoop } from "craters";

const loop = new RenderLoop(
  (loop) => {
    // Called once per fixed step (default 60 per second)
    update(loop.deltaSeconds); // step length in seconds
  },
  60,
  (loop) => {
    // Optional: called once per display frame, after the steps
    render();
  }
);
```

`RenderLoop` starts automatically in the constructor. No extra `start()` call is needed. The
`render` callback is optional; without it, draw inside `execute`, which then updates the screen at
the step rate.

## Custom Frame Rate

```typescript
// 30 steps per second: deltaSeconds = 1/30, delta = 33.3 ms
const loop = new RenderLoop((loop) => {
  update(loop.deltaSeconds);
}, 30);
```

## Loop Instance Properties

| Property | Type | Description |
|---|---|---|
| `delta` | `number` | Fixed step duration in **ms** (always `= frameRatio`) |
| `deltaSeconds` | `number` (getter) | Fixed step in **seconds** (`frameRatio / 1000`). Pass this to `world.execute()` and `RigidBody.integrate()` |
| `elapsed` | `number` | Total simulated time in ms; advances by `frameRatio` before each `execute` call |
| `alpha` | `number` | `accumulator / frameRatio` ∈ [0, 1), set after the frame's steps. Current inside `render`; inside `execute` it is the previous frame's value |
| `frameRate` | `number` | Fixed steps per second, set by the constructor (assigning it later has no effect) |
| `frameRatio` | `number` | Fixed step in ms (`1000 / frameRate`) |
| `current` | `number` | `requestAnimationFrame` timestamp of the last fully processed frame. Inside `render` this is the current frame; inside `execute` it is the **previous** frame's timestamp; `0` until the first step |
| `previous` | `number` | Timestamp of the most recent frame, set before its steps run. Inside `execute` this is the **current** frame's timestamp |
| `index` | `number` | Id of the pending `requestAnimationFrame` request; `0` when stopped |
| `execute` | `(loop: RenderLoop) => void` | The step callback passed to the constructor |
| `render` | `(loop: RenderLoop) => void` (optional) | The per-frame callback passed to the constructor, or `undefined` |

## Render Interpolation with `alpha`

When the display runs faster than the fixed step (e.g. 144 Hz display, 60 steps per second), some
frames run no step at all, so drawing the latest state would repeat the same position. Keep the
state from the last two steps and, in `render`, interpolate between them with `alpha` to eliminate
jitter. The drawn position trails the simulation by up to one step.

```typescript
// Store previous position alongside current
let prevX = 0, prevY = 0;
let currX = 0, currY = 0;

const loop = new RenderLoop(
  (loop) => {
    prevX = currX;
    prevY = currY;

    // Update physics (velocities in px/s)
    currX += velocityX * loop.deltaSeconds;
    currY += velocityY * loop.deltaSeconds;
  },
  60,
  (loop) => {
    // Render at the interpolated position, once per display frame
    const renderX = prevX + (currX - prevX) * loop.alpha;
    const renderY = prevY + (currY - prevY) * loop.alpha;
    renderer.clear();
    drawSprite(renderX, renderY);
  }
);
```

Read `alpha` in `render`, not in `execute`: inside `execute` it still holds the previous frame's
value.

## Tracking Elapsed Time

`loop.elapsed` accumulates total simulated time in ms — useful for animations that are keyed
to physics steps. `Sprite.draw()` uses it to select animation frames.

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

// Resume — start() is a no-op if the loop is already running
loop.start();
```

`start()` checks `index`: while a frame request is pending it returns without starting a second
chain. The constructor records the id of its first request too, so `stop()` and `start()` behave
correctly even before the first frame has fired.

Resuming restarts timing: the accumulator and `alpha` are reset and the first frame only records a
timestamp, so the time spent stopped is not replayed as catch-up steps. `elapsed` continues from
where it was.

Calling `stop()` from inside `execute` takes effect immediately: the steps still queued for that
frame are skipped and `render` is not called.

## Integration with ECS

```typescript
import { EntityComponentSystem as ECS, RenderLoop } from "craters";

const world = new ECS.World();
world.registerSystem(new MovementSystem());
world.registerSystem(new RenderSystem(renderer));

const loop = new RenderLoop((loop) => {
  world.execute(loop.deltaSeconds);
});
```

## API Reference

### `new RenderLoop(execute, frameRate?, render?)`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `execute` | `(loop: RenderLoop) => void` | — | Called once per fixed step with the `RenderLoop` instance |
| `frameRate` | `number` | `60` | Fixed steps per second |
| `render` | `(loop: RenderLoop) => void` | — | Optional. Called once per animation frame after the steps, with `alpha` and `current` updated; not called on the first frame after a start |

The constructor starts the loop.

### `start(): void`

Starts or resumes the RAF loop. No-op while a frame request is pending (`index !== 0`). Resets the
accumulator and `alpha`; the first frame after starting only records a timestamp.

### `stop(): void`

Cancels the pending frame request and sets `index` to `0`. Call to pause the game. From inside
`execute`, it also skips the rest of the current frame's steps and its `render` call.

### `deltaSeconds: number` (getter)

The fixed step in seconds, `frameRatio / 1000`.
