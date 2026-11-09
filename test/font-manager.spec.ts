import chai from "chai";
import Canvas2DRenderer from "../src/canvas-2d-renderer"
import FontManager from "../src/font-manager";
var should = chai.should();
describe("FontManager", function() {
  var fontManager: FontManager, canvas2DRenderer: Canvas2DRenderer;
  var text: string = `MIT License

Copyright (c) 2019 JOHN SWANA

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
  before("Create Canvas2DRenderer instance", function() {
    canvas2DRenderer = new Canvas2DRenderer(1000, 500);
  });
  after("Destroy Canvas2DRenderer instance", function() {
    // delete canvas2DRenderer
  });
  beforeEach("Create Font instance", function() {
    fontManager = new FontManager(canvas2DRenderer, "40px Aerial");
  });
  afterEach("Destroy Font instance", function() {
    // delete font
  });
  describe("load()", async () => {
    it("should load text and draw text", async (done): Promise < void > => {
      const text1 = text.substr(0, text.length / 2)
      var font = fontManager.load(text1)
      font.draw(text, 0, 0)
      done()
    })
  })

  describe("fill and stroke", function() {
    const WIDTH = 240, HEIGHT = 120, FONT = "48px monospace";
    const isRed = (d: Uint8ClampedArray, i: number) => d[i + 3] > 200 && d[i] > 200 && d[i + 1] < 60;
    const isGreen = (d: Uint8ClampedArray, i: number) => d[i + 3] > 200 && d[i + 1] > 200 && d[i] < 60;
    const hasInk = (d: Uint8ClampedArray, i: number) => d[i + 3] > 0;
    // Count matching pixels and their bounding box [minX, minY, maxX, maxY].
    function scan(context: CanvasRenderingContext2D, match: (d: Uint8ClampedArray, i: number) => boolean) {
      const d = context.getImageData(0, 0, WIDTH, HEIGHT).data;
      let count = 0, minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
      for (let i = 0; i < d.length; i += 4) {
        if (!match(d, i)) continue;
        const x = (i / 4) % WIDTH, y = Math.floor(i / 4 / WIDTH);
        count++;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      return { count, box: [minX, minY, maxX, maxY] };
    }
    function render(fill: boolean, stroke: boolean, lineWidth: number = 3) {
      const renderer = new Canvas2DRenderer(WIDTH, HEIGHT, null, 1);
      new FontManager(renderer, FONT, "#ff0000", "#00ff00", fill, stroke, lineWidth)
        .load("W")
        .draw("W", 30, 30);
      return renderer.context;
    }

    it("should fill glyphs with fillStyle and not stroke them by default", function() {
      const renderer = new Canvas2DRenderer(WIDTH, HEIGHT, null, 1);
      new FontManager(renderer, FONT, "#ff0000", "#00ff00").load("W").draw("W", 30, 30);
      scan(renderer.context, isRed).count.should.be.above(0);
      scan(renderer.context, isGreen).count.should.equal(0);
    });

    it("should stroke glyphs with strokeStyle when stroke is true", function() {
      const context = render(false, true);
      scan(context, isGreen).count.should.be.above(0);
      scan(context, isRed).count.should.equal(0);
    });

    it("should fill and stroke glyphs when both are enabled", function() {
      const context = render(true, true);
      scan(context, isRed).count.should.be.above(0);
      scan(context, isGreen).count.should.be.above(0);
    });

    it("should draw nothing when fill and stroke are both disabled", function() {
      scan(render(false, false), hasInk).count.should.equal(0);
    });

    it("should not clip stroked glyphs", function() {
      // Compare against strokeText drawn directly at the same position.
      const lineWidth = 8;
      const reference = new Canvas2DRenderer(WIDTH, HEIGHT, null, 1).context;
      reference.font = FONT;
      reference.textBaseline = "top";
      reference.strokeStyle = "#00ff00";
      reference.lineWidth = lineWidth;
      reference.strokeText("W", 30, 30);
      const expected = scan(reference, hasInk).box;
      const actual = scan(render(false, true, lineWidth), hasInk).box;
      actual.forEach((value, index) => Math.abs(value - expected[index]).should.be.at.most(1));
    });

    it("should place filled glyphs where fillText would", function() {
      const reference = new Canvas2DRenderer(WIDTH, HEIGHT, null, 1).context;
      reference.font = FONT;
      reference.textBaseline = "top";
      reference.fillStyle = "#ff0000";
      reference.fillText("W", 30, 30);
      const expected = scan(reference, hasInk).box;
      const actual = scan(render(true, false), hasInk).box;
      actual.forEach((value, index) => Math.abs(value - expected[index]).should.be.at.most(1));
    });
  });
});