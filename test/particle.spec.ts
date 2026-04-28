import chai from "chai";
import Canvas2DRenderer from "../src/canvas-2d-renderer";
import ParticleSystem, { ParticleEmitConfig } from "../src/particle";
var should = chai.should();
var expect = chai.expect;

function makeImage(complete = true, naturalWidth = 16): HTMLImageElement {
  var img = document.createElement("img") as HTMLImageElement;
  Object.defineProperty(img, "complete", { get: () => complete, configurable: true });
  Object.defineProperty(img, "naturalWidth", { get: () => naturalWidth, configurable: true });
  return img;
}

function makeRenderer(): Canvas2DRenderer {
  return new Canvas2DRenderer(200, 200);
}

function baseConfig(overrides: Partial<ParticleEmitConfig> = {}): ParticleEmitConfig {
  return {
    images: [makeImage()],
    count: 5,
    colors: ["#ff0000", "#00ff00"],
    minSize: 4,
    maxSize: 8,
    minLife: 20,
    maxLife: 40,
    speed: 2,
    gravity: 0.1,
    drag: 0.92,
    minRotationSpeed: 0.01,
    maxRotationSpeed: 0.05,
    ...overrides,
  };
}

describe("ParticleSystem", function () {
  var ps: ParticleSystem;

  beforeEach("prepare ParticleSystem instance", function () {
    ps = new ParticleSystem();
  });

  describe("emit()", async () => {
    it("should start with zero particles", async () => {
      expect(ps.count).to.equal(0);
    });

    it("should add count particles after emit", async () => {
      ps.emit(baseConfig({ count: 10 }), 0, 0);
      expect(ps.count).to.equal(10);
    });

    it("should accumulate particles across multiple emits", async () => {
      ps.emit(baseConfig({ count: 3 }), 0, 0);
      ps.emit(baseConfig({ count: 7 }), 100, 100);
      expect(ps.count).to.equal(10);
    });

    it("should not throw when emitting at a given position", async () => {
      expect(() => ps.emit(baseConfig({ count: 1, speed: 0 }), 50, 75)).to.not.throw();
    });

    it("should accept bias direction parameters without throwing", async () => {
      expect(() => ps.emit(baseConfig({ biasX: 1, biasY: 0, biasStrength: 0.8 }), 0, 0)).to.not.throw();
      expect(ps.count).to.equal(5);
    });

    it("should handle an incomplete image without throwing", async () => {
      var cfg = baseConfig({ images: [makeImage(false, 0)] });
      expect(() => ps.emit(cfg, 0, 0)).to.not.throw();
      expect(ps.count).to.equal(cfg.count);
    });

    it("should pick from multiple colors without throwing", async () => {
      expect(() => ps.emit(baseConfig({ colors: ["red", "blue", "green", "yellow"], count: 50 }), 0, 0)).to.not.throw();
    });

    it("should pick from multiple images without throwing", async () => {
      var cfg = baseConfig({ images: [makeImage(), makeImage(), makeImage()], count: 30 });
      expect(() => ps.emit(cfg, 0, 0)).to.not.throw();
      expect(ps.count).to.equal(30);
    });
  });

  describe("update()", async () => {
    it("should decrease particle life each tick", async () => {
      ps.emit(baseConfig({ count: 1, minLife: 10, maxLife: 10, speed: 0 }), 0, 0);
      expect(ps.count).to.equal(1);
      ps.update(1);
      expect(ps.count).to.equal(1);
      for (var i = 0; i < 9; i++) ps.update(1);
      expect(ps.count).to.equal(0);
    });

    it("should remove expired particles each tick", async () => {
      ps.emit(baseConfig({ count: 1, minLife: 1, maxLife: 1 }), 0, 0);
      ps.emit(baseConfig({ count: 1, minLife: 100, maxLife: 100 }), 0, 0);
      ps.update(1);
      expect(ps.count).to.equal(1);
    });

    it("should apply gravity without throwing", async () => {
      ps.emit(baseConfig({ count: 1, speed: 0, gravity: 1, drag: 1, minLife: 100, maxLife: 100 }), 0, 0);
      expect(() => ps.update(1)).to.not.throw();
      expect(ps.count).to.equal(1);
    });

    it("should apply drag over multiple ticks without throwing", async () => {
      ps.emit(baseConfig({ count: 3, speed: 5, drag: 0.9, minLife: 200, maxLife: 200 }), 0, 0);
      for (var i = 0; i < 10; i++) ps.update(1);
      expect(ps.count).to.equal(3);
    });

    it("should handle zero particles gracefully", async () => {
      expect(() => ps.update(1)).to.not.throw();
    });

    it("should accept fractional delta values", async () => {
      ps.emit(baseConfig({ count: 5, minLife: 100, maxLife: 100 }), 0, 0);
      expect(() => ps.update(0.5)).to.not.throw();
      expect(ps.count).to.equal(5);
    });
  });

  describe("draw()", async () => {
    it("should not throw with zero particles", async () => {
      var renderer = makeRenderer();
      expect(() => ps.draw(renderer)).to.not.throw();
    });

    it("should not throw when rendering live particles", async () => {
      ps.emit(baseConfig({ count: 10 }), 50, 50);
      var renderer = makeRenderer();
      expect(() => ps.draw(renderer)).to.not.throw();
    });

    it("should accept custom camera offsets", async () => {
      ps.emit(baseConfig({ count: 5 }), 0, 0);
      var renderer = makeRenderer();
      expect(() => ps.draw(renderer, -200, -100)).to.not.throw();
    });

    it("should restore canvas globalAlpha to the caller's value after drawing", async () => {
      ps.emit(baseConfig({ count: 5 }), 0, 0);
      var renderer = makeRenderer();
      renderer.context.globalAlpha = 0.5;
      ps.draw(renderer);
      expect(renderer.context.globalAlpha).to.be.closeTo(0.5, 0.001);
    });

    it("should lazily tint particles whose image loaded after emit", async () => {
      var img = makeImage(false, 0);
      ps.emit(baseConfig({ images: [img], count: 2 }), 0, 0);
      Object.defineProperty(img, "complete", { get: () => true, configurable: true });
      Object.defineProperty(img, "naturalWidth", { get: () => 16, configurable: true });
      var renderer = makeRenderer();
      expect(() => ps.draw(renderer)).to.not.throw();
    });
  });

  describe("count", async () => {
    it("should reflect the current live particle count", async () => {
      expect(ps.count).to.equal(0);
      ps.emit(baseConfig({ count: 7 }), 0, 0);
      expect(ps.count).to.equal(7);
    });

    it("should decrease as particles expire", async () => {
      ps.emit(baseConfig({ count: 4, minLife: 2, maxLife: 2 }), 0, 0);
      ps.update(1);
      ps.update(1);
      expect(ps.count).to.equal(0);
    });
  });
});
