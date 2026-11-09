import {
  mat4,
  vec3,
} from "gl-matrix"
const vertexShader = `
	attribute vec4 a_position;
	uniform mat4 u_matrix;
	uniform mat4 u_textureMatrix;
	varying vec2 v_texcoord;
	void main() {
		gl_Position = u_matrix * a_position;
		v_texcoord = (u_textureMatrix * a_position).xy;
	}
`
const fragmentShader = `
	precision mediump float;
	varying vec2 v_texcoord;
	uniform sampler2D u_texture;
	void main() {
		gl_FragColor = texture2D(u_texture, v_texcoord);
	}
`
/**
 * WebGL 1 image renderer: orthographic projection in CSS pixels, NEAREST
 * texture filtering, and destination snapping to physical pixels. Implements
 * the `Renderer` interface (`createImage` / `drawImage`), so `Tile`, `Sprite`
 * and `TilemapManager` work with it. It has no primitive drawing API and no
 * exposed context; `FontManager` and `ParticleSystem.draw` are typed for
 * `Canvas2DRenderer` only.
 */
export default class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private devicePixelRatio: number;
  private positionLocation: number;
  private matrixLocation: WebGLUniformLocation;
  private textureMatrixLocation: WebGLUniformLocation;
  private textureLocation: WebGLUniformLocation;
  private matrix: mat4;
  private n: number;
  /** CSS width in pixels. */
  public width: number;
  /** CSS height in pixels. */
  public height: number;
  /** The canvas element, created internally. Append it to the DOM yourself. */
  public canvasElement: HTMLCanvasElement;
  /**
   * Compiles and links the internal shaders.
   * @param width CSS width in pixels.
   * @param height CSS height in pixels.
   * @param options Unused (kept for signature parity with `Canvas2DRenderer`).
   * @param devicePixelRatio Physical pixel multiplier. Defaults to `window.devicePixelRatio`.
   * @throws Error if WebGL is unavailable or a shader fails to compile or link.
   */
  constructor(width: number, height: number, options?: any, devicePixelRatio: number = window.devicePixelRatio) {
    this.width = width;
    this.height = height;
    this.canvasElement = document.createElement("canvas");
    // const (not var) so the non-null narrowing below survives into the
    // compileShader closure — a reassignable binding would widen back to null there.
    const gl: WebGLRenderingContext | null = this.canvasElement.getContext("webgl");
    if (!gl) {
      throw new Error("WebGL is not supported or unavailable in this environment.");
    }
    this.gl = gl;
    this.devicePixelRatio = devicePixelRatio;
    this.canvasElement.style.width = width + "px";
    this.canvasElement.style.height = height + "px";
    this.canvasElement.width = Math.round(width * devicePixelRatio);
    this.canvasElement.height = Math.round(height * devicePixelRatio);
    gl.viewport(0, 0, Math.round(width * devicePixelRatio), Math.round(height * devicePixelRatio))

    // Compile with status checks so a shader failure throws a readable error
    // instead of silently producing a blank canvas.
    const compileShader = (type: number, source: string): WebGLShader => {
      const shader: WebGLShader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`WebGL shader compilation failed: ${log}`);
      }
      return shader;
    };

    var vs: WebGLShader = compileShader(gl.VERTEX_SHADER, vertexShader);
    var fs: WebGLShader = compileShader(gl.FRAGMENT_SHADER, fragmentShader);

    var program: WebGLProgram = gl.createProgram()!;
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new Error(`WebGL program linking failed: ${log}`);
    }
    gl.useProgram(program)

    // Shaders are linked into the program; the standalone objects can go now.
    gl.deleteShader(vs)
    gl.deleteShader(fs)

    this.positionLocation = gl.getAttribLocation(program, "a_position")
    this.matrixLocation = gl.getUniformLocation(program, "u_matrix")!;
    this.textureMatrixLocation = gl.getUniformLocation(program, "u_textureMatrix")!;
    this.textureLocation = gl.getUniformLocation(program, "u_texture")!;

    var positionBuffer: WebGLBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    var positions = [
      0, 0,
      1, 0,
      1, 1,
      0, 1
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    var indexBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    var indices = new Uint8Array([
      2, 3,
      0, 0,
      1, 2
    ])
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
    this.n = indices.length

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(this.positionLocation)
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0)
    this.matrix = mat4.ortho(new Float32Array(16), 0, width, height, 0, -1, 1)

    // Configure blending up front so drawing composites correctly even before
    // the first clear(), and texture alpha is handled the same no matter when
    // a texture is created.
    this.applyBlendState()
  }
  // Textures are uploaded premultiplied (see createImage), so blend with
  // ONE / ONE_MINUS_SRC_ALPHA: the source colour already carries its alpha.
  // This also keeps the drawing buffer premultiplied, which is what the
  // default (premultipliedAlpha: true) WebGL canvas expects when compositing.
  private applyBlendState(): void {
    var gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  }
  /**
   * Upload `image` to a new GPU texture and return its handle, which is what
   * `drawImage` takes. Every call creates a new texture; release it with `deleteImage`.
   * The image is uploaded with premultiplied alpha, matching the renderer's
   * blend function, so textures can be created at any time.
   */
  public createImage(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap): {
    texture: WebGLTexture,
    width: number,
    height: number
  } {
    var gl: WebGLRenderingContext = this.gl
    var texture: WebGLTexture = gl.createTexture()!
    var width: number = image.width
    var height: number = image.height
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    // NEAREST filtering: prevents bilinear sampling from bleeding adjacent
    // texels across tile boundaries, which shows as transparent seams on
    // high-DPR (mobile) displays where UV coords land on texel edges.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    // Set the unpack flag per upload, in case other code changed it on the
    // shared context; the blend function assumes premultiplied texels.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    // The image is already loaded by the time createImage is called, so upload
    // it directly — no need for the throwaway 1x1 placeholder texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    return {
      width,
      height,
      texture
    }
  }
  /** Release a texture created by createImage. Do not draw the handle afterwards. */
  public deleteImage(image: { texture: WebGLTexture }): void {
    this.gl.deleteTexture(image.texture);
  }
  private workingMatrix: mat4 = mat4.create();
  private translationVector: vec3 = vec3.create();
  private scaleVector: vec3 = vec3.create();
  private textureMatrix: mat4 = mat4.create();
  private textureScaleVector: vec3 = vec3.create();
  private textureTranslationVector: vec3 = vec3.create();

  /**
   * Draw a region of a texture handle from `createImage`, in CSS pixels. Same
   * argument order and defaults as `Canvas2DRenderer.drawImage`; omitted
   * `destinationWidth`/`destinationHeight` default to the full texture size.
   * Each call is one `gl.drawElements` (no batching). A negative destination
   * width or height mirrors the image (`Canvas2DRenderer` does not).
   */
  public drawImage(texture: {
    width: number,
    height: number,
    texture: WebGLTexture
  },
    sourceX: number = 0,
    sourceY: number = 0,
    sourceWidth: number = texture.width,
    sourceHeight: number = texture.height,
    destinationX: number = 0,
    destinationY: number = 0,
    destinationWidth: number = texture.width,
    destinationHeight: number = texture.height
  ): void {
    var gl: WebGLRenderingContext = this.gl;
    var {
      matrixLocation,
      textureMatrixLocation,
      textureLocation,
      workingMatrix,
      translationVector,
      scaleVector,
      textureMatrix,
      textureScaleVector,
      textureTranslationVector
    } = this;

    gl.bindTexture(gl.TEXTURE_2D, texture.texture);

    // Snap destination to the nearest PHYSICAL pixel.
    // The ortho matrix maps CSS px → clip space; viewport maps clip → physical px.
    // So physical = destination_css * DPR. Math.round(CSS) is still fractional
    // for non-integer DPR (Pixel=2.625, Samsung=2.75, Surface=1.5 etc.).
    // Math.round(v * DPR) / DPR ensures the drawn quad edge lands on an integer
    // physical pixel, eliminating UV boundary seams between tiles.
    const pr = this.devicePixelRatio;
    const snap = (v: number) => Math.round(v * pr) / pr;
    const dX = snap(destinationX);
    const dY = snap(destinationY);
    const dW = snap(destinationWidth);
    const dH = snap(destinationHeight);

    // Destination Matrix
    mat4.copy(workingMatrix, this.matrix);
    vec3.set(translationVector, dX, dY, 0);
    mat4.translate(workingMatrix, workingMatrix, translationVector);
    vec3.set(scaleVector, dW, dH, 1);
    mat4.scale(workingMatrix, workingMatrix, scaleVector);
    gl.uniformMatrix4fv(matrixLocation, false, workingMatrix);

    // Texture Matrix
    mat4.identity(textureMatrix);
    vec3.set(textureScaleVector, 1 / texture.width, 1 / texture.height, 1);
    mat4.scale(textureMatrix, textureMatrix, textureScaleVector);
    vec3.set(textureTranslationVector, sourceX, sourceY, 0);
    mat4.translate(textureMatrix, textureMatrix, textureTranslationVector);
    vec3.set(textureScaleVector, sourceWidth, sourceHeight, 1);
    mat4.scale(textureMatrix, textureMatrix, textureScaleVector);

    gl.uniformMatrix4fv(textureMatrixLocation, false, textureMatrix);
    gl.uniform1i(textureLocation, 0);
    gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_BYTE, 0);
  }
  /**
   * Resize the canvas, reset the viewport and recompute the projection matrix.
   * Omitted arguments keep their current values.
   */
  public resize(width: number = this.width, height: number = this.height, devicePixelRatio: number = this.devicePixelRatio): void {
    this.width = width;
    this.height = height;
    var gl = this.gl;
    this.devicePixelRatio = devicePixelRatio;
    this.canvasElement.style.width = width + "px";
    this.canvasElement.style.height = height + "px";
    this.canvasElement.width = Math.round(width * devicePixelRatio);
    this.canvasElement.height = Math.round(height * devicePixelRatio);
    gl.viewport(0, 0, Math.round(width * devicePixelRatio), Math.round(height * devicePixelRatio));
    this.matrix = mat4.ortho(new Float32Array(16), 0, width, height, 0, -1, 1);
  }
  /**
   * Clear the whole canvas to `v`. Also re-applies the renderer's blend state
   * (premultiplied alpha, `ONE, ONE_MINUS_SRC_ALPHA`), which is first set up by
   * the constructor, in case other code changed it on the shared context.
   * @param v RGBA colour, components in the 0–1 range. Default `[0.1, 0.1, 0.1, 1]`.
   * @param w Ignored: the whole canvas is always cleared.
   * @param x Ignored.
   * @param y Ignored.
   * @param z Ignored.
   */
  public clear(v: [number, number, number, number] = [0.1, 0.1, 0.1, 1], w: number = 0, x: number = 0, y: number = this.width, z: number = this.height): void {
    var gl = this.gl;
    this.applyBlendState();
    gl.clearColor(...v);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}