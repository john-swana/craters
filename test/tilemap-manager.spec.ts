import chai from "chai";
import Canvas2DRenderer from "../src/canvas-2d-renderer";
import TilemapManager from "../src/tilemap-manager";
const map2dTilemap = "./base/test/tilemap-manager/assets/tilemap.json";
var should = chai.should();
describe("TilemapManager", async () => {
  var canvas2DRenderer: Canvas2DRenderer;
  var tilemapManager: TilemapManager;
  beforeEach(function() {
    canvas2DRenderer = new Canvas2DRenderer(1000, 500);
    tilemapManager = new TilemapManager(canvas2DRenderer);
  })
  describe("load()", async () => {
    it("should load tilemap and draw", async (): Promise < void > => {
      return tilemapManager.load(map2dTilemap)
        .then(function(tilemap) {
          tilemap.draw()
        })
    })
    it("should reject with an Error that includes the HTTP status on a non-OK response", async (): Promise < void > => {
      const missing = "./base/test/tilemap-manager/assets/does-not-exist.json";
      let error: unknown;
      try {
        await tilemapManager.load(missing);
      } catch (e) {
        error = e;
      }
      chai.expect(error).to.be.an.instanceof(Error);
      chai.expect((error as Error).message).to.contain("404");
    })
    it("should reject with an Error when a tileset image fails to load", async (): Promise < void > => {
      const image = "./base/test/tilemap-manager/assets/does-not-exist.png";
      const map = URL.createObjectURL(new Blob([JSON.stringify({
        layers: [],
        tilesets: [{ image, tilewidth: 70, tileheight: 70 }]
      })], { type: "application/json" }));
      let error: unknown;
      try {
        await tilemapManager.load(map);
      } catch (e) {
        error = e;
      } finally {
        URL.revokeObjectURL(map);
      }
      chai.expect(error).to.be.an.instanceof(Error);
      chai.expect((error as Error).message).to.contain(image);
    })
  })
})