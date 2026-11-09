/**
 * Keyboard, mouse and touch input mapped to named actions. Keyboard listeners
 * are attached to `document`; mouse and touch listeners to the pointer target
 * passed to the constructor (default `document`). The touch listeners call
 * `preventDefault()`, which suppresses clicks, emulated mouse events,
 * scrolling and zoom for touches that start on the target. Pass the game
 * canvas as the target to leave the rest of the page usable.
 */
export default class Input {
  public static KEY: {
    [key: string]: string
  } = {
      BACKSPACE: "Backspace",
      TAB: "Tab",
      ENTER: "Enter",
      SHIFT_LEFT: "ShiftLeft",
      SHIFT_RIGHT: "ShiftRight",
      CTRL_LEFT: "ControlLeft",
      CTRL_RIGHT: "ControlRight",
      ALT_LEFT: "AltLeft",
      ALT_RIGHT: "AltRight",
      PAUSE: "Pause",
      CAPS_LOCK: "CapsLock",
      ESCAPE: "Escape",
      SPACEBAR: "Space",
      PAGE_UP: "PageUp",
      PAGE_DOWN: "PageDown",
      END: "End",
      HOME: "Home",
      LEFT_ARROW: "ArrowLeft",
      UP_ARROW: "ArrowUp",
      RIGHT_ARROW: "ArrowRight",
      DOWN_ARROW: "ArrowDown",
      INSERT: "Insert",
      DELETE: "Delete",
      ZERO: "Digit0",
      ONE: "Digit1",
      TWO: "Digit2",
      THREE: "Digit3",
      FOUR: "Digit4",
      FIVE: "Digit5",
      SIX: "Digit6",
      SEVEN: "Digit7",
      EIGHT: "Digit8",
      NINE: "Digit9",
      A: "KeyA",
      B: "KeyB",
      C: "KeyC",
      D: "KeyD",
      E: "KeyE",
      F: "KeyF",
      G: "KeyG",
      H: "KeyH",
      I: "KeyI",
      J: "KeyJ",
      K: "KeyK",
      L: "KeyL",
      M: "KeyM",
      N: "KeyN",
      O: "KeyO",
      P: "KeyP",
      Q: "KeyQ",
      R: "KeyR",
      S: "KeyS",
      T: "KeyT",
      U: "KeyU",
      V: "KeyV",
      W: "KeyW",
      X: "KeyX",
      Y: "KeyY",
      Z: "KeyZ",
      NUMPAD_ZERO: "Numpad0",
      NUMPAD_ONE: "Numpad1",
      NUMPAD_TWO: "Numpad2",
      NUMPAD_THREE: "Numpad3",
      NUMPAD_FOUR: "Numpad4",
      NUMPAD_FIVE: "Numpad5",
      NUMPAD_SIX: "Numpad6",
      NUMPAD_SEVEN: "Numpad7",
      NUMPAD_EIGHT: "Numpad8",
      NUMPAD_NINE: "Numpad9",
      MULTIPLY: "NumpadMultiply",
      ADD: "NumpadAdd",
      SUBTRACT: "NumpadSubtract",
      DECIMAL: "NumpadDecimal",
      DIVIDE: "NumpadDivide",
      F1: "F1",
      F2: "F2",
      F3: "F3",
      F4: "F4",
      F5: "F5",
      F6: "F6",
      F7: "F7",
      F8: "F8",
      F9: "F9",
      F10: "F10",
      F11: "F11",
      F12: "F12",
      SEMICOLON: "Semicolon",
      EQUAL: "Equal",
      COMMA: "Comma",
      MINUS: "Minus",
      PERIOD: "Period",
      SLASH: "Slash",
      BACKQUOTE: "Backquote",
      BRACKET_LEFT: "BracketLeft",
      BACKSLASH: "Backslash",
      BRACKET_RIGHT: "BracketRight",
      QUOTE: "Quote"
    }
  private bindings: Map<string, string> = new Map();
  private pressed: Map<string, number> = new Map();
  /**
   * Last known pointer position in viewport CSS pixels (`clientX`/`clientY`),
   * updated by `mousemove`, `touchstart` and `touchmove` on the pointer
   * target. Not canvas-relative.
   */
  public pointerPosition: { x: number, y: number } = { x: 0, y: 0 };
  private pointerTarget: HTMLElement | Document;

  /**
   * @param pointerTarget element that receives the mouse and touch listeners
   *   (e.g. the game canvas). Defaults to `document`. Keyboard listeners are
   *   always attached to `document`, and `mouseup` is also listened for on
   *   `document` so a button released outside the target is still released.
   */
  public constructor(pointerTarget: HTMLElement | Document = document) {
    this.pointerTarget = pointerTarget;
    this.bindKeys();
    this.bindMouse();
    this.bindTouch();
  }
  /**
   * Map a key (a `KeyboardEvent.code` such as `Input.KEY.SPACEBAR`, or
   * `"Mouse0"`-`"Mouse2"`, or `"Touch0"`) to an action name. Rebinding a key
   * replaces its action; several keys may share one action. Resets the
   * action's state to 0.
   */
  public bind(key: string, action: string): void {
    this.bindings.set(key, action);
    this.pressed.set(action, 0);
  }
  /** Attach the keyboard listeners (called by the constructor). */
  public bindKeys(): void {
    document.addEventListener("keyup", this.keyup, false);
    document.addEventListener("keydown", this.keydown, false);
  }
  /**
   * Remove every keyboard, mouse and touch listener (from `document` and the
   * pointer target). Bindings and press states are kept. Only the keyboard
   * listeners can be re-attached afterwards (via {@link bindKeys}); to restore
   * mouse and touch, create a new Input.
   */
  // Relies on the handlers being stable arrow-function fields (see below):
  // passing a fresh `.bind(this)` here would create a new reference and
  // silently remove nothing.
  public unbind(): void {
    document.removeEventListener("keyup", this.keyup, false);
    document.removeEventListener("keydown", this.keydown, false);
    this.pointerTarget.removeEventListener("mousemove", this.mousemove as EventListener, false);
    this.pointerTarget.removeEventListener("mousedown", this.mousedown as EventListener, false);
    document.removeEventListener("mouseup", this.mouseup, false);
    this.pointerTarget.removeEventListener("touchstart", this.touchstart as EventListener);
    this.pointerTarget.removeEventListener("touchmove", this.touchmove as EventListener);
    this.pointerTarget.removeEventListener("touchend", this.touchend as EventListener);
  }
  /**
   * Alias of {@link unbind}, kept for backward compatibility.
   * @deprecated Use {@link unbind}.
   */
  public unbindKeys(): void {
    this.unbind();
  }
  // The `as EventListener` casts are needed because the `HTMLElement | Document`
  // union only exposes the untyped addEventListener overload.
  private bindMouse(): void {
    this.pointerTarget.addEventListener("mousemove", this.mousemove as EventListener, false);
    this.pointerTarget.addEventListener("mousedown", this.mousedown as EventListener, false);
    // On document, so releasing the button outside the target still releases it.
    document.addEventListener("mouseup", this.mouseup, false);
  }
  private bindTouch(): void {
    this.pointerTarget.addEventListener("touchstart", this.touchstart as EventListener, { passive: false });
    this.pointerTarget.addEventListener("touchmove", this.touchmove as EventListener, { passive: false });
    this.pointerTarget.addEventListener("touchend", this.touchend as EventListener, { passive: false });
  }
  private mousemove = (event: MouseEvent): void => {
    this.pointerPosition.x = event.clientX;
    this.pointerPosition.y = event.clientY;
  }
  private mousedown = (event: MouseEvent): void => {
    this.handleMouse(event, 2);
  }
  private mouseup = (event: MouseEvent): void => {
    this.handleMouse(event, 0);
  }
  private touchstart = (event: TouchEvent): void => {
    event.preventDefault(); // Prevent default mouse emulation
    if (event.touches.length > 0) {
      this.updateTouchPosition(event.touches[0]);
      this.handleTouch(2);
    }
  }
  private touchmove = (event: TouchEvent): void => {
    event.preventDefault();
    if (event.touches.length > 0) {
      this.updateTouchPosition(event.touches[0]);
    }
  }
  private touchend = (event: TouchEvent): void => {
    event.preventDefault();
    // Release only when the last finger lifts; other fingers keep Touch0 held.
    if (event.touches.length === 0) {
      this.handleTouch(0);
    }
  }
  private updateTouchPosition(touch: Touch): void {
    this.pointerPosition.x = touch.clientX;
    this.pointerPosition.y = touch.clientY;
  }
  private handleTouch(state: number): void {
    const button = "Touch0";
    if (this.bindings.has(button)) {
      const action = this.bindings.get(button)!;
      this.pressed.set(action, state);
    }
  }
  private handleMouse(event: MouseEvent, state: number): void {
    const button = "Mouse" + event.button;
    if (this.bindings.has(button)) {
      const action = this.bindings.get(button)!;
      this.pressed.set(action, state);
    }
  }
  private keyup = (event: KeyboardEvent): void => {
    var key = event.code;
    if (this.bindings.has(key)) {
      var action = this.bindings.get(key)!;
      this.pressed.set(action, 0);
    }
  }
  private keydown = (event: KeyboardEvent): void => {
    var key = event.code;
    if (this.bindings.has(key)) {
      var action = this.bindings.get(key)!;
      this.pressed.set(action, 2);
    }
  }
  /**
   * Current state of an action: 2 = pressed since the last {@link update},
   * 1 = held, 0 = released (or unknown action). Reading does not change the
   * state, so several systems can observe the same "just pressed" value.
   * Note: key auto-repeat `keydown` events set the state back to 2.
   */
  public isPressed(action: string): number {
    return this.pressed.get(action) ?? 0;
  }
  /**
   * Advance edge state: every action at 2 ("just pressed") becomes 1 ("held").
   * Call once at the end of each fixed step, after all input has been read.
   */
  public update(): void {
    this.pressed.forEach((state, action) => {
      if (state === 2) this.pressed.set(action, 1);
    });
  }
}