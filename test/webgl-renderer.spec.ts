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
});