export default class AssetsManager {
  public async loadText(resource: string): Promise < string > {
    return fetch(resource)
      .then(function(response: Response) {
        return response.text();
      })
  }
  public async loadJson(resource: string): Promise < any > {
    return fetch(resource)
      .then(function(response: Response) {
        return response.json();
      })
  }
  public async loadImage(resource: string): Promise < HTMLImageElement > {
    return new Promise(function(resolve, reject) {
      var image: HTMLImageElement = new Image();
      image.onload = function() {
        resolve(image);
      }
      image.onerror = reject;
      image.src = resource;
    })
  }
  /**
   * Load and register a font face.
   * @param resource a CSS `src` descriptor, e.g. `url("font.woff2") format("woff2")`.
   *   It is passed straight to FontFace, so a bare path will NOT work.
   * The loaded face is added to `document.fonts` so it is immediately usable for
   * canvas and DOM text without the caller having to register it.
   */
  public async loadFont(fontName: string, resource: string): Promise < FontFace > {
    const fontFace: FontFace = await new FontFace(fontName, resource).load();
    document.fonts.add(fontFace);
    return fontFace;
  }
  public async loadBinary(resource: string): Promise < Blob > {
    return fetch(resource)
      .then(function(response: Response) {
        return response.blob();
      })
  }
}