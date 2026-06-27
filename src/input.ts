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
  public pointerPosition: { x: number, y: number } = { x: 0, y: 0 };

  public constructor() {
    this.bindKeys();
    this.bindMouse();
    this.bindTouch();
  }
  public bind(key: string, action: string): void {
    this.bindings.set(key, action);
    this.pressed.set(action, 0);
  }
  public bindKeys(): void {
    document.addEventListener("keyup", this.keyup, false);
    document.addEventListener("keydown", this.keydown, false);
  }
  // Removes every listener attached by bindKeys/bindMouse/bindTouch. Relies on
  // the handlers being stable arrow-function fields (see below): passing a fresh
  // `.bind(this)` here would create a new reference and silently remove nothing.
  public unbind(): void {
    document.removeEventListener("keyup", this.keyup, false);
    document.removeEventListener("keydown", this.keydown, false);
    document.removeEventListener("mousemove", this.mousemove, false);
    document.removeEventListener("mousedown", this.mousedown, false);
    document.removeEventListener("mouseup", this.mouseup, false);
    document.removeEventListener("touchstart", this.touchstart);
    document.removeEventListener("touchmove", this.touchmove);
    document.removeEventListener("touchend", this.touchend);
  }
  // Deprecated alias kept for backward compatibility; use unbind().
  public unbindKeys(): void {
    this.unbind();
  }
  private bindMouse(): void {
    document.addEventListener("mousemove", this.mousemove, false);
    document.addEventListener("mousedown", this.mousedown, false);
    document.addEventListener("mouseup", this.mouseup, false);
  }
  private bindTouch(): void {
    document.addEventListener("touchstart", this.touchstart, { passive: false });
    document.addEventListener("touchmove", this.touchmove, { passive: false });
    document.addEventListener("touchend", this.touchend, { passive: false });
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
    this.handleTouch(0);
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
  // Returns the current state without mutating it, so multiple systems can query
  // the same action in one frame and all observe the "just pressed" value (2).
  // 2 = pressed this frame, 1 = held, 0 = released.
  public isPressed(action: string): number {
    return this.pressed.get(action) ?? 0;
  }
  // Advances edge state: collapses "just pressed" (2) into "held" (1). Call once
  // per frame, after all input has been read, so the 2 → 1 transition happens at
  // a defined point rather than as a side effect of the first read.
  public update(): void {
    this.pressed.forEach((state, action) => {
      if (state === 2) this.pressed.set(action, 1);
    });
  }
}