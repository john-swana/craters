/**
 * Fixed-timestep game loop driven by `requestAnimationFrame`.
 *
 * Each animation frame adds the elapsed time (capped at 250 ms) to an accumulator
 * and calls `execute` once per whole fixed step it contains: zero, one or several
 * times per frame. The optional `render` hook then runs once for the frame, with
 * {@link alpha} set for interpolation. The loop starts in the constructor.
 */
export default class RenderLoop {
  /** Id of the pending `requestAnimationFrame` request; `0` when stopped. */
  index: number;
  /** Fixed step in milliseconds (always equal to {@link frameRatio}). Use {@link deltaSeconds} for physics. */
  delta: number;
  /** Total simulated time in milliseconds: `frameRatio` per step run, including the current one. */
  elapsed: number;
  /**
   * Leftover accumulator / fixed step, in [0, 1): how far the current frame is into
   * the next fixed step. Set after a frame's steps have run, so it is current inside
   * {@link render}; inside `execute` it still holds the previous frame's value.
   */
  alpha: number;
  /** Fixed steps per second, as passed to the constructor. Assigning it later has no effect. */
  frameRate: number;
  /** Fixed step in milliseconds (`1000 / frameRate`). */
  frameRatio: number;
  /**
   * Timestamp of the last fully processed frame, set after its steps run. Inside
   * {@link render} it is this frame's timestamp; inside `execute` it is the previous
   * frame's. `0` until the first step.
   */
  current: number;
  /** Timestamp of the most recent frame, set before its steps run (inside `execute`: the current frame). */
  previous: number;
  /** Callback run once per fixed step with this loop. */
  execute: (loop: RenderLoop) => void;
  /**
   * Optional callback run once per animation frame, after that frame's fixed steps,
   * with {@link alpha} and {@link current} already updated. Not called on the first
   * frame after a start, which only records a timestamp.
   */
  render?: (loop: RenderLoop) => void;

  private accumulator: number;

  /**
   * Creates the loop and starts it.
   *
   * @param execute called once per fixed step with this loop.
   * @param frameRate fixed steps per second (default 60).
   * @param render optional; called once per animation frame after the fixed steps, for drawing.
   */
  constructor(execute: (loop: RenderLoop) => void, frameRate: number = 60, render?: (loop: RenderLoop) => void) {
    this.index = 0;
    this.frameRate = frameRate;
    this.frameRatio = 1000 / frameRate;   // e.g. 16.67ms at 60fps
    this.delta = this.frameRatio;          // always the fixed step
    this.elapsed = 0;
    this.alpha = 0;
    this.accumulator = 0;
    this.current = 0;
    this.previous = 0;
    this.execute = execute;
    this.render = render;
    this.start();
  }

  /**
   * Fixed step in SECONDS (`frameRatio / 1000`). Pass this to `World.execute()` and
   * physics (e.g. `RigidBody.integrate`), which expect seconds; `delta`/`frameRatio`
   * are milliseconds.
   */
  public get deltaSeconds(): number {
    return this.frameRatio / 1000;
  }

  /**
   * Starts or resumes the loop. No-op while a frame request is pending (`index !== 0`).
   *
   * Timing restarts: the accumulator and `alpha` are reset and the
   * first frame only records a timestamp, so a resume does not replay the time
   * spent stopped as catch-up steps. `elapsed` keeps counting from where it was.
   */
  public start(): void {
    // Guard: prevent spawning a second RAF chain if already running
    if (this.index !== 0) return;

    // Re-bootstrap timing so the pause isn't counted as frame time on resume
    this.previous = 0;
    this.accumulator = 0;
    this.alpha = 0;

    const tick = (timestamp: number) => {
      this.index = requestAnimationFrame(tick);

      // Bootstrap: skip first tick to establish a valid previous timestamp
      if (this.previous === 0) {
        this.previous = timestamp;
        return;
      }

      // Raw frame time, clamped to 250ms to prevent spiral-of-death
      // (e.g. when tab loses focus and resumes)
      let frameTime = timestamp - this.previous;
      if (frameTime > 250) frameTime = 250;
      this.previous = timestamp;

      this.accumulator += frameTime;

      // Consume accumulator in fixed steps — deterministic regardless of refresh rate
      while (this.accumulator >= this.frameRatio) {
        this.elapsed += this.frameRatio;
        this.accumulator -= this.frameRatio;
        this.execute(this);
        // stop() was called from the callback: run no further steps or render this frame
        if (this.index === 0) return;
      }

      // alpha ∈ [0, 1): how far into the next fixed step we are. Computed after
      // the steps, so render() sees this frame's value and execute() the previous one.
      this.alpha = this.accumulator / this.frameRatio;
      this.current = timestamp;

      if (this.render) this.render(this);
    };

    // Record the bootstrap frame's id too — otherwise stop() cannot cancel a
    // loop whose first tick hasn't fired yet (e.g. constructed in a background
    // tab, where RAF is frozen), and a later start() passes the index guard
    // and spawns a second, untrackable tick chain.
    this.index = requestAnimationFrame(tick);
  }

  /**
   * Cancels the pending frame request and sets `index` to `0`. When called from
   * inside `execute`, the steps still queued for the current frame are skipped and
   * `render` is not called for that frame.
   */
  public stop(): void {
    cancelAnimationFrame(this.index);
    this.index = 0;
  }
};