import chai from "chai";
import RenderLoop from "../src/render-loop";
var should = chai.should();
describe("RenderLoop", function() {
  var renderLoop: RenderLoop;
  before("Create and initiate render loop instance", function() {
    renderLoop = new RenderLoop(function(renderLoop: RenderLoop) {
      it("should assert index value", async (done): Promise < void > => {
        renderLoop.index.should.equal(1)
        done()
      })
      it("should assert delta value", async (done): Promise < void > => {
        renderLoop.delta.should.be.greaterThan(0)
        done()
      })
      it("should assert elapsed value", async (done): Promise < void > => {
        renderLoop.elapsed.should.be.greaterThan(renderLoop.delta)
        done()
      })
      it("should assert framerate value", async (done): Promise < void > => {
        renderLoop.frameRate.should.be.equal(60)
        done()
      })
      it("should assert current value", async (done): Promise < void > => {
        renderLoop.current.should.be.greaterThan(renderLoop.previous)
        done()
      })
      it("should assert previous value", async (done): Promise < void > => {
        renderLoop.previous.should.be.greaterThan(renderLoop.current)
        done()
      })
    }, 60)
  });
  after("Suspend and destroy render loop instance", function() {
    renderLoop.stop()
    // delete renderLoop
  });
  describe("wait", async () => {
    it("should hang and resolve after 100ms", async (): Promise < void > => {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve()
        }, 100)
      })
    })
  })
});

describe("RenderLoop fixed-step timing", function() {
  var expect = chai.expect;
  // Frames are driven by hand: requestAnimationFrame callbacks are queued and
  // run by frame(timestamp). 50 steps per second gives an exact 20 ms step.
  var callbacks: Map < number, FrameRequestCallback > ;
  var nextId: number;
  var realRequest: typeof window.requestAnimationFrame;
  var realCancel: typeof window.cancelAnimationFrame;

  function frame(timestamp: number): void {
    const due = Array.from(callbacks.values());
    callbacks.clear();
    due.forEach(cb => cb(timestamp));
  }

  beforeEach(function() {
    callbacks = new Map();
    nextId = 1;
    realRequest = window.requestAnimationFrame;
    realCancel = window.cancelAnimationFrame;
    window.requestAnimationFrame = function(cb: FrameRequestCallback): number {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    };
    window.cancelAnimationFrame = function(id: number): void {
      callbacks.delete(id);
    };
  });

  afterEach(function() {
    window.requestAnimationFrame = realRequest;
    window.cancelAnimationFrame = realCancel;
  });

  it("should run one step per fixed step of elapsed time", function() {
    let steps = 0;
    const loop = new RenderLoop(() => { steps++; }, 50);
    frame(1000); // first frame only records a timestamp
    expect(steps).to.equal(0);
    frame(1040);
    expect(steps).to.equal(2);
    expect(loop.elapsed).to.equal(40);
    frame(1050);
    expect(steps).to.equal(2);
    expect(loop.alpha).to.equal(0.5);
    expect(loop.deltaSeconds).to.equal(0.02);
    loop.stop();
  });

  it("start() should be a no-op while running, including before the first frame", function() {
    const loop = new RenderLoop(() => {}, 50);
    loop.start();
    expect(callbacks.size).to.equal(1);
    frame(1000);
    loop.start();
    expect(callbacks.size).to.equal(1);
    loop.stop();
  });

  it("stop() before the first frame should cancel the loop", function() {
    let steps = 0;
    const loop = new RenderLoop(() => { steps++; }, 50);
    loop.stop();
    expect(callbacks.size).to.equal(0);
    expect(loop.index).to.equal(0);
    frame(1000);
    frame(1100);
    expect(steps).to.equal(0);
  });

  it("start() after stop() should not run catch-up steps for the paused time", function() {
    let steps = 0;
    const loop = new RenderLoop(() => { steps++; }, 50);
    frame(1000);
    frame(1030); // 1 step, 10 ms left over
    expect(steps).to.equal(1);
    loop.stop();

    loop.start();
    expect(loop.alpha).to.equal(0);
    frame(5000); // first frame after resuming only records a timestamp
    expect(steps).to.equal(1);
    frame(5020);
    expect(steps).to.equal(2);
    expect(loop.elapsed).to.equal(40);
    loop.stop();
  });

  it("stop() inside the callback should skip the remaining steps of that frame", function() {
    let steps = 0;
    let renders = 0;
    const loop = new RenderLoop((l) => {
      steps++;
      l.stop();
    }, 50, () => { renders++; });
    frame(1000);
    frame(1100); // 5 steps due
    expect(steps).to.equal(1);
    expect(renders).to.equal(0);
    expect(callbacks.size).to.equal(0);
    expect(loop.index).to.equal(0);
  });

  it("should call render once per frame, after the steps, with this frame's alpha and current", function() {
    const log: string[] = [];
    const loop = new RenderLoop(
      (l) => { log.push("step alpha=" + l.alpha); },
      50,
      (l) => { log.push("render alpha=" + l.alpha + " current=" + l.current); }
    );
    frame(1000);
    expect(log).to.deep.equal([]); // no render on the first frame
    frame(1030); // 1 step, 10 ms left over
    expect(log).to.deep.equal(["step alpha=0", "render alpha=0.5 current=1030"]);
    frame(1035); // no step due, render still runs
    expect(log.slice(2)).to.deep.equal(["render alpha=0.75 current=1035"]);
    frame(1050); // 1 step; execute sees the previous frame's alpha
    expect(log.slice(3)).to.deep.equal(["step alpha=0.75", "render alpha=0.5 current=1050"]);
    loop.stop();
  });

  it("should not require a render callback", function() {
    const loop = new RenderLoop(() => {}, 50);
    expect(loop.render).to.equal(undefined);
    frame(1000);
    frame(1020);
    expect(loop.elapsed).to.equal(20);
    loop.stop();
  });
});
