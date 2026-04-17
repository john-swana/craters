export default class RenderLoop {
  index: number;
  delta: number;       // fixed physics step in ms (always == frameRatio)
  elapsed: number;     // total physics time elapsed in ms
  alpha: number;       // leftover accumulator / fixedStep — use for render interpolation
  frameRate: number;
  frameRatio: number;  // fixed step in ms (= 1000 / frameRate)
  current: number;
  previous: number;
  execute: any;

  private accumulator: number;

  constructor(execute: any, frameRate: number = 60) {
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
    this.start();
  }

  public start(): void {
    // Guard: prevent spawning a second RAF chain if already running
    if (this.index !== 0) return;

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
      }

      // alpha ∈ [0, 1): how far into the next fixed step we are
      // Use this to linearly interpolate rendered positions for smoothness
      this.alpha = this.accumulator / this.frameRatio;
      this.current = timestamp;
    };

    requestAnimationFrame(tick);
  }

  public stop(): void {
    cancelAnimationFrame(this.index);
    this.index = 0;
  }
};