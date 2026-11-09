// fetch() resolves on HTTP error statuses; turn those into a rejection so a
// 404 or 500 is not silently returned as the error page's body.
function fetchOk(resource: string): Promise<Response> {
  return fetch(resource).then(function(response: Response) {
    if (!response.ok) {
      throw new Error(`Failed to load "${resource}": ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`);
    }
    return response;
  });
}

/**
 * Promise-based loaders for common asset types. Every loader rejects on a
 * network failure. The fetch-based loaders (loadText, loadJson, loadBinary)
 * also reject with an `Error` naming the HTTP status (e.g. 404), and
 * loadImage rejects with an `Error` when the image cannot be loaded.
 */
export default class AssetsManager {
  /** Fetch a resource as text. Rejects on an HTTP error status. */
  public async loadText(resource: string): Promise < string > {
    return fetchOk(resource)
      .then(function(response: Response) {
        return response.text();
      })
  }
  /**
   * Fetch and parse JSON. Rejects on an HTTP error status or if the body is
   * not valid JSON.
   */
  public async loadJson(resource: string): Promise < any > {
    return fetchOk(resource)
      .then(function(response: Response) {
        return response.json();
      })
  }
  /** Load an image; resolves once loaded, rejects with an `Error` if it fails to load. */
  public async loadImage(resource: string): Promise < HTMLImageElement > {
    return new Promise(function(resolve, reject) {
      var image: HTMLImageElement = new Image();
      image.onload = function() {
        resolve(image);
      }
      image.onerror = function() {
        reject(new Error(`Failed to load image "${resource}"`));
      }
      image.src = resource;
    })
  }
  /**
   * Load and register a font face.
   * The loaded face is added to `document.fonts` so it is immediately usable for
   * canvas and DOM text (e.g. a FontManager font string such as
   * `"16px PixelFont"`) without the caller having to register it.
   * @param fontName the font-family name to register the face under.
   * @param resource a CSS `src` descriptor, e.g. `url("font.woff2") format("woff2")`.
   *   It is passed straight to FontFace, so a bare path will NOT work.
   */
  public async loadFont(fontName: string, resource: string): Promise < FontFace > {
    const fontFace: FontFace = await new FontFace(fontName, resource).load();
    document.fonts.add(fontFace);
    return fontFace;
  }
  /** Fetch a resource as a Blob. Rejects on an HTTP error status. */
  public async loadBinary(resource: string): Promise < Blob > {
    return fetchOk(resource)
      .then(function(response: Response) {
        return response.blob();
      })
  }
}
