import Canvas2DRenderer from "./canvas-2d-renderer";
import Tile from "./tile"
type FontMap = Map<number, {
  x: number,
  y: number,
  width: number,
  height: number,
}>;
type FontAtlas = Tile;
/** A rasterised font atlas returned by `FontManager.load`. */
export interface FontInstance {
  /**
   * Draw `text` left to right from (`destX`, `destY`), the top-left corner, in
   * CSS pixels. One atlas draw per character. Characters missing from the atlas
   * are skipped and take no space. Newlines are not handled.
   */
  draw(text: string, destX: number, destY: number): void;
}
class Font implements FontInstance {
  private fontMap: FontMap;
  private fontAtlas: FontAtlas;
  // Transparent margin baked around each glyph cell so strokes are not clipped.
  // 0 when glyphs are not stroked, which keeps the atlas layout unchanged.
  private padding: number;
  constructor(fontMap: FontMap, fontAtlas: FontAtlas, padding: number = 0) {
    this.fontMap = fontMap;
    this.fontAtlas = fontAtlas;
    this.padding = padding;
  }
  draw(text: string, destX: number, destY: number): void {
    var textWidth = 0;
    var padding = this.padding;
    Array.from(text).forEach((_character) => {
      var charactercode = _character.charCodeAt(0);
      if (this.fontMap.has(charactercode)) {
        var character = this.fontMap.get(charactercode)!;
        var {
          width,
          height
        } = character;
        // The cell (glyph box plus margin) is drawn offset by the margin, so the
        // glyph itself lands at the same position as an unstroked glyph and only
        // the stroke extends past the glyph box. Advance by the glyph width only.
        var cellWidth = width + padding * 2,
          cellHeight = height + padding * 2;
        this.fontAtlas.draw(character.x, character.y, destX + textWidth - padding, destY - padding, cellWidth, cellHeight, cellWidth, cellHeight);
        textWidth += width;
      }
    });
  }
}
/**
 * Rasterises characters of a CSS font into a glyph atlas (a `Tile`) for fast
 * text drawing. Requires a `Canvas2DRenderer`.
 */
export default class FontManager {
  canvas2DRenderer: Canvas2DRenderer;
  /** CSS font shorthand, e.g. `"16px Arial"`. */
  fontName: string;
  /** Whether glyphs are filled with `fillStyle` when the atlas is built. */
  fill: boolean;
  /** Whether glyphs are stroked with `strokeStyle` when the atlas is built. */
  stroke: boolean;
  /** Colour used to fill glyphs. */
  fillStyle: string;
  /** Colour used to stroke glyphs. */
  strokeStyle: string;
  /** Stroke width in pixels, used when `stroke` is true. */
  lineWidth: number;
  /**
   * Fill, stroke and line width are applied when `load()` builds the atlas;
   * changing them afterwards only affects later `load()` calls.
   * @param canvas2DRenderer Renderer the text is drawn onto.
   * @param fontName CSS font shorthand, e.g. `"16px Arial"` or `"bold 24px monospace"`.
   * @param fillStyle Glyph fill colour. Default `"#fafafa"`.
   * @param strokeStyle Glyph stroke colour, used when `stroke` is true. Default `"#fafafa"`.
   * @param fill Fill glyphs with `fillStyle`. Default `true`.
   * @param stroke Stroke glyphs with `strokeStyle`, drawn over the fill. Default `false`.
   * @param lineWidth Stroke width in pixels. Default `1`.
   */
  constructor(
    canvas2DRenderer: Canvas2DRenderer,
    fontName: string,
    fillStyle: string = "#fafafa",
    strokeStyle: string = "#fafafa",
    fill: boolean = true,
    stroke: boolean = false,
    lineWidth: number = 1,
  ) {
    this.canvas2DRenderer = canvas2DRenderer
    this.fontName = fontName
    this.fill = fill
    this.stroke = stroke
    this.fillStyle = fillStyle
    this.strokeStyle = strokeStyle
    this.lineWidth = lineWidth
  }
  /**
   * Synchronously rasterise each unique character of `letters` into an atlas,
   * using whatever font is available at call time (await font loading first).
   * Glyph height is the font's px size × 1.2. An invalid font string falls back
   * to the canvas default (`10px sans-serif`).
   *
   * When `stroke` is true, each glyph cell gets a transparent margin of
   * `ceil(lineWidth / 2) + 1` pixels so the stroke is not clipped. Text is laid out
   * exactly as without a stroke; the stroke extends up to `lineWidth / 2`
   * beyond the glyph boxes.
   */
  load(letters: string): FontInstance {
    var canvas2DRenderer = new Canvas2DRenderer(0, 0, void 0, 1)
    var context = canvas2DRenderer.context
    context.font = this.fontName;
    var fontMap: FontMap = new Map();
    // Extract the px size from the font shorthand robustly: parseInt(font) breaks
    // on prefixes like "bold 16px ..." (→ NaN). Fall back to 16px if absent.
    var fontSizeMatch = /(\d+(?:\.\d+)?)px/.exec(context.font);
    var height = (fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 16) * 1.2;
    var measurements = Array.from(letters)
      .filter(function (character, index, characters) {
        return characters.indexOf(character) == index;
      })
      .map(function (letter) {
        return {
          letter: letter,
          measurement: context.measureText(letter)
        };
      });
    // A stroke straddles the glyph outline, so it extends lineWidth / 2 beyond
    // it (plus a pixel of antialiasing). Reserve that margin around every cell.
    var padding = this.stroke ? Math.ceil(this.lineWidth / 2) + 1 : 0;
    var width = measurements.map(function (measurement) {
      return measurement.measurement.width + padding * 2;
    }).reduce(function (previous, next) {
      return previous + next;
    }, 0); // initial value so an empty letter set yields width 0 instead of throwing
    canvas2DRenderer.resize(width, height + padding * 2);
    measurements.forEach((measure) => {
      var letter = measure.letter,
        measurement = measure.measurement;
      context.textBaseline = "top";
      context.font = this.fontName;
      var x = (width -= measurement.width + padding * 2),
        y = 0;
      if (this.fill) {
        context.fillStyle = this.fillStyle;
        context.fillText(letter, x + padding, y + padding);
      }
      if (this.stroke) {
        context.strokeStyle = this.strokeStyle;
        context.lineWidth = this.lineWidth;
        context.strokeText(letter, x + padding, y + padding);
      }
      fontMap.set(letter.charCodeAt(0), {
        width: measurement.width,
        height: height,
        x: x,
        y: y
      });
    });
    var fontAtlas = new Tile(this.canvas2DRenderer, canvas2DRenderer.canvasElement, canvas2DRenderer.width, canvas2DRenderer.height, canvas2DRenderer.width, canvas2DRenderer.height)
    return new Font(fontMap, fontAtlas, padding)
  }
}
