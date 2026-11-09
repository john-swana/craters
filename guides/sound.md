# Sound Usage Guide

The audio module has two classes:

- **`SoundManager`** — loads audio files and owns the `AudioContext`. One instance per game.
- **`Sound`** — a single loaded audio clip. Supports play, overlapping one-shots, stop, and volume.

Both are exported: `import { Sound, SoundManager } from "craters"`.

The `AudioContext` is unlocked automatically on the first user gesture (a tap, click, or key
press), complying with browser autoplay policies.

## Setup

```typescript
import { Sound, SoundManager } from "craters";

const audio = new SoundManager();
```

## Loading Sounds

`load()` fetches the file, decodes it via the Web Audio API, and resolves with a `Sound` instance.
It rejects if the server returns an HTTP error status or the data cannot be decoded.

```typescript
const jump: Sound  = await audio.load("sounds/jump.mp3");
const music: Sound = await audio.load("sounds/theme.ogg");
```

Load all sounds upfront (e.g. in a loading screen) so they are ready when needed.

## Playing Sounds

```typescript
// Play once
jump.play();

// Loop (e.g. background music)
music.play(true);

// Play once, then run a callback when it stops
jump.play(false, () => console.log("jump sound stopped"));
```

Each `Sound` has one primary voice: calling `play()` while it is already playing stops the
previous instance first. For rapid effects that should overlap instead of cutting each other
off (footsteps, hits), use `playOneShot()`:

```typescript
jump.playOneShot();     // layered; uses the current volume
jump.playOneShot(0.3);  // layered, at 30% volume
```

> **Note:** the `onEnded` callback also fires when the voice is stopped with `stop()` or
> replaced by another `play()` call, not only at the natural end. It never fires on its
> own while looping.

## Stopping, Pausing, and Resuming

```typescript
music.stop();      // stop the primary voice and release its audio nodes
music.stopAll();   // stop the primary voice and every playOneShot() voice

await audio.suspendAll();  // global pause: suspends the whole AudioContext
await audio.resumeAll();   // resume every sound
```

`Sound.pause()` and `Sound.resume()` still exist but are **deprecated**: although called on
one sound, they suspend and resume the entire `AudioContext`. Use
`SoundManager.suspendAll()` / `resumeAll()` for a global game pause.

## Volume Control

```typescript
music.setVolume(0.5);  // 50% volume (1.0 = unchanged)
const vol = music.getVolume(); // 0.5
```

The value is a gain and is not clamped: keep it in 0.0 – 1.0 unless you want amplification.
Changes apply immediately to the playing primary voice; `playOneShot()` voices that are
already playing keep the volume they started with.

## Complete Example

```typescript
import { SoundManager, Sound, RenderLoop, Input } from "craters";

const audio = new SoundManager();
const input = new Input();
input.bind(Input.KEY.SPACEBAR, "JUMP");

const jumpSfx: Sound = await audio.load("jump.mp3");
const music: Sound   = await audio.load("music.ogg");

music.setVolume(0.4);
music.play(true); // start looping music (audible once the context is unlocked)

new RenderLoop((loop) => {
  if (input.isPressed("JUMP") === 2) {
    jumpSfx.playOneShot();
  }
  input.update(); // end of step: advance "just pressed" to "held"
});
```

## Browser Autoplay Policy

Browsers block audio from playing before the first user gesture. If the context starts
suspended, `SoundManager` listens on `document` for `touchend`, `click`, `mousedown`,
`pointerup` and `keydown` (the events browsers accept as a user gesture) and calls
`audioContext.resume()` on each of them. The listeners are removed once the context is
actually `"running"`, so a gesture the browser does not accept is simply followed by
another attempt on the next one. A single tap is enough on touch devices, including when an
`Input` is active. No extra setup is required.

After the context has been unlocked, later gestures no longer resume it, so a game paused
with `suspendAll()` stays paused until you call `resumeAll()`.

If you need to check readiness manually:

```typescript
audio.audioContext.state; // "suspended" | "running" | "closed"
```

## API Reference

### `SoundManager`

- `new SoundManager()` — creates the `AudioContext`; if it starts suspended, registers the
  unlock listeners
- `load(resource: string): Promise<Sound>` — fetches and decodes an audio file; rejects on
  an HTTP error status or decode failure
- `suspendAll(): Promise<void>` — suspend the whole `AudioContext` (global pause)
- `resumeAll(): Promise<void>` — resume the whole `AudioContext`
- `unlockAudioContext(): void` — if the context is suspended, resumes it on the next accepted
  user gesture, retrying until it is running (called by the constructor)
- `audioContext: AudioContext` — the underlying Web Audio context

### `Sound`

- `play(loop = false, onEnded?: () => void): void` — play the primary voice, stopping the
  previous one; `onEnded` also fires on `stop()` / replay
- `playOneShot(volume = getVolume()): void` — play an overlapping voice
- `stop(): void` — stop the primary voice and release its audio nodes
- `stopAll(): void` — stop the primary voice and all one-shot voices
- `setVolume(value: number): void` — set the gain (not clamped; 1.0 = unchanged)
- `getVolume(): number` — current volume
- `pause()` / `resume()` — **deprecated**; suspend/resume the whole `AudioContext`. Use
  `suspendAll()` / `resumeAll()`.
