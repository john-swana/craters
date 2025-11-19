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
  private bindings: Map < string, string > = new Map();
  private pressed: Map < string, number > = new Map();
  public constructor() {
    this.bindKeys();
  }
  public bind(key: string, action: string): void {
    this.bindings.set(key, action);
    this.pressed.set(action, 0);
  }
  public bindKeys(): void {
    document.addEventListener("keyup", this.keyup.bind(this), false);
    document.addEventListener("keydown", this.keydown.bind(this), false);
  }
  public unbindKeys(): void {
    document.removeEventListener("keyup", this.keyup.bind(this), false);
    document.removeEventListener("keydown", this.keydown.bind(this), false);
  }
  private keyup(event: KeyboardEvent): void {
    var key = event.code;
    if (this.bindings.has(key)) {
      var action = this.bindings.get(key);
      this.pressed.set(action, 0);
    }
  }
  private keydown(event: KeyboardEvent): void {
    var key = event.code;
    if (this.bindings.has(key)) {
      var action = this.bindings.get(key);
      this.pressed.set(action, 2);
    }
  }
  public isPressed(action: string): number {
    if (this.pressed.has(action)) {
      var pressed = this.pressed.get(action);
      if (pressed) {
        if (pressed === 2)
          this.pressed.set(action, 1);
        return pressed;
      }
    }
    return 0;
  }
}