# Input Usage Guide

`Input` provides unified keyboard, mouse, and touch input with a three-state press model.
It uses `KeyboardEvent.code` (layout-independent key codes) and maps raw events to
named **actions** so game logic stays decoupled from physical keys.

## Press States

| Value | Meaning |
|---|---|
| `0` | Not pressed / released |
| `2` | Just pressed (since the last `update()`) |
| `1` | Held down |

`isPressed()` only reads the state; repeated reads in the same step all return the same
value. Call `input.update()` once at the end of each fixed step to advance `2 → 1`, so a
`2` is seen for exactly one step per press.

## Basic Setup

```typescript
import { Input, RenderLoop } from "craters";

const input = new Input(); // starts listening immediately (pointer events on `document`)

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

  input.update(); // end of step: "just pressed" (2) becomes "held" (1)
});
```

Without the `update()` call, `=== 2` stays true for as long as the key is held.

> **Note:** keyboard auto-repeat sends repeated `keydown` events, and each one sets the
> state back to `2`. A press and release that both happen between two steps are not
> observed. To trigger strictly once per physical press, remember whether the action was
> already down:
>
> ```typescript
> let jumpHeld = false;
> // inside the loop:
> const jump = input.isPressed("JUMP");
> if (jump === 2 && !jumpHeld) player.jump();
> jumpHeld = jump !== 0;
> ```

## Pointer Target

By default, mouse and touch listeners are attached to `document`. Pass an element, usually
the game canvas, to listen only there:

```typescript
const input = new Input(renderer.canvasElement);
```

With a target:

- Mouse presses, mouse moves and touches are only seen when they happen on the target.
  `mouseup` is still listened for on `document`, so a button pressed on the canvas and
  released outside it is released.
- The touch listeners' `preventDefault()` (which stops scrolling, zoom, emulated mouse
  events and clicks) applies only to touches that start on the target. The rest of the
  page keeps working normally: HTML buttons, links and scrolling.
- Keyboard listeners stay on `document`.

## Pointer Position

`pointerPosition` is updated by `mousemove`, `touchstart` and `touchmove` events on the
pointer target. It holds
`clientX` / `clientY` in CSS pixels, i.e. **viewport** coordinates, not canvas or world
coordinates. Subtract the canvas position (and add your camera offset) to convert:

```typescript
const { x, y } = input.pointerPosition;
const rect = renderer.canvasElement.getBoundingClientRect();
const worldX = x - rect.left + camera.x;
const worldY = y - rect.top + camera.y;
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
input.bind("NumpadEnter", "CONFIRM");
```

`Input.KEY` is typed as a string map, so a misspelled name such as `Input.KEY.SPACE`
compiles but is `undefined` at runtime.

## Mouse Buttons

Mouse buttons are bound as `"Mouse0"` (left), `"Mouse1"` (middle), `"Mouse2"` (right):

```typescript
input.bind("Mouse0", "SHOOT");
input.bind("Mouse2", "AIM");
```

`Input` does not suppress the browser context menu, so a right-click also opens it.
With a pointer target, only presses on the target are reported.

## Touch

Touch is currently single-touch only via `"Touch0"`. `pointerPosition` tracks the first
touch point's `clientX` / `clientY`.

```typescript
input.bind("Touch0", "TAP");
```

- `"Touch0"` stays held while any finger is down and is released when the last finger lifts.
  Putting down an additional finger reports a new press (`2`).
- The touch listeners call `preventDefault()` for touches on the pointer target, which
  stops scrolling, zoom and the emulated mouse events there, so taps on the target never
  trigger `"Mouse0"` bindings. Bind `"Touch0"` as well.
- With the default target (`document`) this applies to the whole page, including clicks on
  HTML elements. Pass the game canvas as the pointer target (see *Pointer Target* above)
  to keep the rest of the page interactive.

## Cleanup

Remove all event listeners when tearing down a scene or replacing the input instance:

```typescript
input.unbind();
```

`unbind()` removes the listeners from `document` and from the pointer target. It keeps
bindings and press states. Afterwards only the keyboard listeners can be re-attached
(`bindKeys()`); to get mouse and touch back, create a new `Input`.

## API Reference

### `new Input(pointerTarget?: HTMLElement | Document)`

Instantiates and immediately attaches listeners: keyboard and `mouseup` on `document`;
mouse move, mouse down and touch on `pointerTarget` (default `document`).

### `bind(key: string, action: string): void`

Maps a key code (from `Input.KEY` or a raw `KeyboardEvent.code` / `"Mouse0"`–`"Mouse2"` /
`"Touch0"`) to an action name string. Several keys may share one action (releasing any of
them sets it to `0`); rebinding a key replaces its action. Resets the action's state to `0`.

### `isPressed(action: string): number`

Returns the press state (`0`, `1`, or `2`; `0` for an unknown action). Does not change the state.

### `update(): void`

Advances every action at `2` to `1`. Call once at the end of each fixed step.

### `unbind(): void`

Removes all keyboard, mouse and touch listeners from `document` and the pointer target.
Bindings are kept.

### `bindKeys(): void`

Re-attaches the keyboard listeners (the constructor calls it).

### `unbindKeys(): void` *(deprecated)*

Alias of `unbind()`.

### `pointerPosition: { x: number, y: number }`

Last known pointer position in viewport CSS pixels (updated by mouse move, touch start and
touch move on the pointer target).

### `Input.KEY`

Static map of named constants to `KeyboardEvent.code` strings.
