import chai from "chai";
import AssetsManager from "../src/assets-manager";
var should = chai.should();
var expect = chai.expect;
const MISSING = "./base/test/assets-manager/assets/does-not-exist";

// Resolves with the rejection reason, or fails if the promise resolves.
async function rejectionOf(promise: Promise<any>): Promise<any> {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  throw new Error("expected the promise to reject");
}
describe("AssetsManager", function() {
  var assetsManager: AssetsManager;
  before("prepare assetsManager instance", function() {
    assetsManager = new AssetsManager();
  });
  after("destroy assetsManager instance", function() {
    // delete assetsManager;
  });
  describe("loadText()", async () => {
    it("should request text file and resolve", async (): Promise < void > => {
      return assetsManager.loadText("./base/test/assets-manager/assets/test.txt")
        .then(function(text) {
          text.should.equal("test")
        });
    });
    it("should reject with an Error on an HTTP error status", async () => {
      const error = await rejectionOf(assetsManager.loadText(MISSING + ".txt"));
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.contain("404");
    });
  });
  describe("loadJson()", async () => {
    it("should request json file and resolve", async (): Promise < any > => {
      return assetsManager.loadJson("./base/test/assets-manager/assets/test.json")
        .then(function(json) {
          json.test.should.equal(true)
        });
    });
    it("should reject with an Error on an HTTP error status", async () => {
      const error = await rejectionOf(assetsManager.loadJson(MISSING + ".json"));
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.contain("404");
    });
  });
  describe("loadImage()", async () => {
    it("should request an image and resolve", async (): Promise < HTMLImageElement > => {
      return assetsManager.loadImage("./base/test/assets-manager/assets/test.png");
    });
    it("should reject with an Error when the image cannot be loaded", async () => {
      const error = await rejectionOf(assetsManager.loadImage(MISSING + ".png"));
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.contain(MISSING + ".png");
    });
  });
  describe("loadFont()", async () => {
    it("should request a font and resolve", async (): Promise < FontFace > => {
      return assetsManager.loadFont("Test", "url(\"./base/test/assets-manager/assets/test.ttf\") format(\"truetype\")");
    });
  });
  describe("loadBinary()", async () => {
    it("should request a blob and resolve", async (): Promise < Blob > => {
      return assetsManager.loadBinary("./base/test/assets-manager/assets/test");
    });
    it("should reject with an Error on an HTTP error status", async () => {
      const error = await rejectionOf(assetsManager.loadBinary(MISSING + ".bin"));
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.contain("404");
    });
  });
});