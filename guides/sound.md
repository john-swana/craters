# Sound Usage Guide

The audio module has two classes:

- **`SoundManager`** — loads audio files and owns the `AudioContext`. One instance per game.
- **`Sound`** — a single loaded audio clip. Supports play, pause, resume, stop, and volume.

The `AudioContext` is unlocked automatically on the first user interaction (click, tap, or keypress),
complying with browser autoplay policies.

## Setup

```typescript
import { SoundManager } from "craters";

const audio = new SoundManager();
```

## Loading Sounds

`load()` fetches the file, decodes it via the Web Audio API, and resolves with a `Sound` instance.

```typescript
const jump  = await audio.load("sounds/jump.mp3") as Sound;
const music = await audio.load("sounds/theme.ogg") as Sound;
```

Load all sounds upfront (e.g. in a loading screen) so they are ready when needed.

## Playing Sounds

```typescript
// Play once
jump.play();

// Loop (e.g. background music)
music.play(true);

// Play once, then run a callback on completion
jump.play(false, () => console.log("jump sound finished"));
```

Calling `play()` while the sound is already playing stops the previous instance first, so
rapid repeated calls (e.g. footsteps) work correctly without overlapping.

## Stopping, Pausing, and Resuming

```typescript
music.stop();    // stop and release the audio nodes
music.pause();   // suspend the AudioContext (affects all sounds)
music.resume();  // resume the AudioContext
```

> **Note:** `pause()` and `resume()` suspend the entire `AudioContext`, not just this
> individual sound. Prefer `stop()` for one-shot sounds and use pause/resume for a
> global game pause.

## Volume Control

```typescript
music.setVolume(0.5);  // 50% volume (range 0.0 – 1.0)
const vol = music.getVolume(); // 0.5
```

Volume changes are applied immediately, even while the sound is playing.

## Complete Example

```typescript
import { SoundManager, RenderLoop, Input } from "craters";

const audio = new SoundManager();
const input = new Input();
input.bind(Input.KEY.SPACEBAR, "JUMP");

const jumpSfx = await audio.load("jump.mp3") as Sound;
const music   = await audio.load("music.ogg") as Sound;

music.setVolume(0.4);
music.play(true); // start looping music

new RenderLoop((loop) => {
  if (input.isPressed("JUMP") === 2) {
    jumpSfx.play();
  }
});
```

## Browser Autoplay Policy

Browsers block audio from playing before the first user gesture. `SoundManager` handles
this by listening for `touchstart`, `mousedown`, and `keydown` and calling
`audioContext.resume()` on the first event. No extra setup is required.

If you need to check readiness manually:

```typescript
audio.audioContext.state; // "suspended" | "running" | "closed"
```

## API Reference

### `SoundManager`

- `new SoundManager()` — creates `AudioContext` and registers unlock listeners
- `load(resource: string): Promise<Sound>` — fetches and decodes an audio file
- `audioContext: AudioContext` — the underlying Web Audio context

### `Sound`

- `play(loop?, onEnded?)` — play; `loop` defaults to `false`
- `stop()` — stop playback and release audio nodes
- `pause()` — suspend the `AudioContext` (global pause)
- `resume()` — resume the `AudioContext`
- `setVolume(value: number)` — set volume 0.0 – 1.0
- `getVolume(): number` — current volume
