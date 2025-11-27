import chai from "chai";
import Canvas2DRenderer from "../src/canvas-2d-renderer";
import AssetsManager from "../src/assets-manager";
import Tile from "../src/tile";
var should = chai.should();
describe("Tile", async () => {
  var canvas2DRenderer: Canvas2DRenderer;
  var assetsManager: AssetsManager;
  beforeEach(function () {
    assetsManager = new AssetsManager();
    canvas2DRenderer = new Canvas2DRenderer(1920, 1200);
  })
  describe("Tile()", async () => {
    it("should load tile and draw", async (): Promise<void> => {
      return assetsManager.loadImage("./base/test/tile/assets/spritesheet.png")
        .then(function (spritesheet: HTMLImageElement) {
          const tile = new Tile(canvas2DRenderer, spritesheet, 214, 282, 107, 140)
          tile.draw(0, 0, 0, 0)
        })
    })

    it("should load tile with custom shape and draw", async (): Promise<void> => {
      return assetsManager.loadImage("./base/test/tile/assets/spritesheet.png")
        .then(function (spritesheet: HTMLImageElement) {
          const positions = [[0, 0], [10, 0], [10, 10], [0, 10]];
          const tile = new Tile(canvas2DRenderer, spritesheet, 214, 282, 107, 140, positions)
          tile.draw(10, 10, 20, 20, 50, 50, 50, 50)
        })
    })
  })
})