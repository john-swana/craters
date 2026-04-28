# Input Usage Guide

`Input` provides unified keyboard, mouse, and touch input with a three-state press model.
It uses `KeyboardEvent.code` (layout-independent key codes) and maps raw events to
named **actions** so game logic stays decoupled from physical keys.

## Press States

| Value | Meaning |
|---|---|
| `0` | Not pressed / released |
| `2` | Just pressed (this tick only — transitions to 1 on next read) |
| `1` | Held down |

`isPressed()` automatically advances state from `2 → 1` on each call, so a value of `2`
is only seen once per press event.

## Basic Setup

```typescript
import { Input } from "craters";

const input = new Input(); // starts listening immediately

// Map physical keys to action names
input.bind(Input.KEY.SPACEBAR, "JUMP");
input.bind(Input.KEY.LEFT_ARROW, "LEFT");
input.bind(Input.KEY.RIGHT_ARROW, "RIGHT");
input.bind("Mouse0", "FIRE"); // left mouse button
input.bind("Touch0", "TAP");  // first touch point
```

## Querying Input in the Game Loop

```typescript
new RenderLoop((loop) => {
  if (input.isPressed("JUMP") === 2) {
    player.jump();         // just pressed — trigger once
  }
  if (input.isPressed("LEFT")) {
    player.moveLeft();     // held — trigger every tick
  }
  if (input.isPressed("RIGHT")) {
    player.moveRight();
  }
  if (input.isPressed("FIRE") === 2) {
    spawnBullet(input.pointerPosition.x, input.pointerPosition.y);
  }
});
```

## Pointer Position

`pointerPosition` is updated by mouse move and touch move events. It reflects
`clientX` / `clientY` in CSS pixels.

```typescript
const { x, y } = input.pointerPosition;
```

## Keyboard Constants (`Input.KEY`)

Common keys are pre-mapped as constants on `Input.KEY`:

```
BACKSPACE, TAB, ENTER
SHIFT_LEFT, SHIFT_RIGHT, CTRL_LEFT, CTRL_RIGHT, ALT_LEFT, ALT_RIGHT
ESCAPE, SPACEBAR, CAPS_LOCK, PAUSE
PAGE_UP, PAGE_DOWN, HOME, END, INSERT, DELETE
LEFT_ARROW, UP_ARROW, RIGHT_ARROW, DOWN_ARROW
A–Z, ZERO–NINE, NUMPAD_ZERO–NUMPAD_NINE
MULTIPLY, ADD, SUBTRACT, DECIMAL, DIVIDE
F1–F12
SEMICOLON, EQUAL, COMMA, MINUS, PERIOD, SLASH
BACKQUOTE, BRACKET_LEFT, BRACKET_RIGHT, BACKSLASH, QUOTE
```

For any key not in the list, pass the raw `KeyboardEvent.code` string directly:

```typescript
input.bind("KeyQ", "ABILITY");
```

## Mouse Buttons

Mouse buttons are bound as `"Mouse0"` (left), `"Mouse1"` (middle), `"Mouse2"` (right):

```typescript
input.bind("Mouse0", "SHOOT");
input.bind("Mouse2", "AIM");
```

## Touch

Touch is currently single-touch only via `"Touch0"`. `pointerPosition` tracks the first
touch point's `clientX` / `clientY`.

```typescript
input.bind("Touch0", "TAP");
```

## Cleanup

Remove all event listeners when tearing down a scene or replacing the input instance:

```typescript
input.unbindKeys();
```

## API Reference

### `new Input()`

Instantiates and immediately attaches keyboard, mouse, and touch listeners to `document`.

### `bind(key, action)`

Maps a key code (from `Input.KEY` or a raw `KeyboardEvent.code` / `"Mouse0"` / `"Touch0"`)
to an action name string.

### `isPressed(action): number`

Returns the press state (`0`, `1`, or `2`). Calling it while state is `2` transitions it to `1`.

### `unbindKeys()`

Removes all event listeners from `document`.

### `pointerPosition: { x: number, y: number }`

Last known pointer position in CSS pixels (updated by mouse move and touch move).

### `Input.KEY`

Static map of named constants to `KeyboardEvent.code` strings.
