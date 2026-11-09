import chai from "chai";
import AssetsManager from "../src/assets-manager";
import WebGLRenderer from "../src/webgl-renderer";
var should = chai.should();
describe("WebGLRenderer", function() {
  var assetsManager: AssetsManager,
    webGLRenderer: WebGLRenderer;
  before("prepare assetsManager instance", function() {
    assetsManager = new AssetsManager();
  });
  after("destroy assetsManager instance", function() {
    // delete assetsManager
  });
  beforeEach("prepare webGLRenderer instance", function() {
    try {
      webGLRenderer = new WebGLRenderer(1920, 1200);
    } catch (e: any) {
      if (e.message && e.message.includes("WebGL is not supported")) {
        this.skip();
      } else {
        throw e;
      }
    }
  });
  afterEach("destroy webGLRenderer instance", function() {
    // delete webGLRenderer
  });
  describe("createImage()", async () => {
    it("should create image", async (): Promise < void > => {
      return assetsManager.loadImage("./base/test/webgl-renderer/assets/test.png")
        .then(function(image: HTMLImageElement) {
          webGLRenderer.createImage(image);
        })
    })
  })
  describe("drawImage()", async () => {
    it("should draw image", async (): Promise < void > => {
      return assetsManager.loadImage("./base/test/webgl-renderer/assets/test.png")
        .then(function(image: HTMLImageElement) {
          const createdImage = webGLRenderer.createImage(image)
          webGLRenderer.drawImage(createdImage)
        })
    })
  })
  describe("resize()", async () => {
    const sizes = [];
    [void 0, 1920, 1200].forEach(function(width) {
      [void 0, 1920, 1200].forEach(function(height) {
        sizes.push({
          width,
          height
        })
      })
    })
    sizes.forEach(function(size) {
      it("should resize canvas", async (done): Promise < void > => {
        webGLRenderer.resize(size.width, size.height)
        done()
      })
    })
  })
  describe("clear()", async () => {
    const fills = [];
    [void 0, "rgba(25.5,25.5,25.5,1)"].forEach(function(color) {
      [void 0, 1920, 1200].forEach(function(width) {
        [void 0, 1920, 1200].forEach(function(height) {
          [void 0, 0].forEach(function(x) {
            [void 0, 0].forEach(function(y) {
              fills.push({
                color,
                width,
                height,
                x,
                y
              })
            })
          })
        })
      })
    })
    fills.forEach((fill) => {
      it("should clear canvas", async (done): Promise < void > => {
        webGLRenderer.clear(fill.color, fill.x, fill.y, fill.width, fill.height)
        done()
      })
    })
  })
  describe("alpha blending", function() {
    const SIZE = 64;
    function solid(color: string): HTMLCanvasElement {
      const canvas = document.createElement("canvas");
      canvas.width = 8;
      canvas.height = 8;
      const context = canvas.getContext("2d")!;
      context.fillStyle = color;
      context.fillRect(0, 0, 8, 8);
      return canvas;
    }
    // RGBA at CSS pixel (x, y); WebGL rows start at the bottom.
    function pixel(renderer: WebGLRenderer, x: number, y: number): number[] {
      const gl = renderer.canvasElement.getContext("webgl")!;
      const out = new Uint8Array(4);
      gl.readPixels(x, SIZE - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
      return Array.from(out);
    }
    const halfRed = solid("rgba(255, 0, 0, 0.5)");

    it("should composite a semi-transparent texture the same whether it is created before or after the first clear()", function() {
      const renderer = new WebGLRenderer(SIZE, SIZE, undefined, 1);
      const before = renderer.createImage(halfRed);
      renderer.clear([0, 0, 0, 1]);
      const after = renderer.createImage(halfRed);
      renderer.drawImage(before, 0, 0, 8, 8, 0, 0, 8, 8);
      renderer.drawImage(after, 0, 0, 8, 8, 16, 0, 8, 8);
      const a = pixel(renderer, 4, 4), b = pixel(renderer, 20, 4);
      a[0].should.be.within(126, 130); // 50% red over black
      a.should.deep.equal(b);
    });

    it("should blend even if clear() has never been called", function() {
      const renderer = new WebGLRenderer(SIZE, SIZE, undefined, 1);
      renderer.drawImage(renderer.createImage(solid("#0000ff")), 0, 0, 8, 8, 0, 0, 8, 8);
      renderer.drawImage(renderer.createImage(halfRed), 0, 0, 8, 8, 0, 0, 8, 8);
      const [r, g, b, a] = pixel(renderer, 4, 4);
      r.should.be.within(126, 130);
      g.should.equal(0);
      b.should.be.within(126, 130);
      a.should.equal(255);
    });

    it("should leave opaque textures unchanged", function() {
      const renderer = new WebGLRenderer(SIZE, SIZE, undefined, 1);
      renderer.clear([0, 0, 0, 1]);
      renderer.drawImage(renderer.createImage(solid("#0000ff")), 0, 0, 8, 8, 0, 0, 8, 8);
      pixel(renderer, 4, 4).should.deep.equal([0, 0, 255, 255]);
    });
  })
});