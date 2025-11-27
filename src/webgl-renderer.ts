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
export default class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private devicePixelRatio: number;
  private positionLocation: number;
  private matrixLocation: WebGLUniformLocation;
  private textureMatrixLocation: WebGLUniformLocation;
  private textureLocation: WebGLUniformLocation;
  private matrix: mat4;
  private n: number;
  public width: number;
  public height: number;
  public canvasElement: HTMLCanvasElement;
  constructor(width: number, height: number, options?: any, devicePixelRatio: number = window.devicePixelRatio) {
    this.width = width;
    this.height = height;
    this.canvasElement = document.createElement("canvas");
    var gl: WebGLRenderingContext = this.canvasElement.getContext("webgl")!;
    this.gl = gl;
    this.devicePixelRatio = devicePixelRatio;
    this.canvasElement.style.width = width + "px";
    this.canvasElement.style.height = height + "px";
    this.canvasElement.width = Math.round(width * devicePixelRatio);
    this.canvasElement.height = Math.round(height * devicePixelRatio);
    gl.viewport(0, 0, Math.round(width * devicePixelRatio), Math.round(height * devicePixelRatio))

    var vs: WebGLShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vertexShader)
    gl.compileShader(vs)

    var fs: WebGLShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fragmentShader)
    gl.compileShader(fs)

    var program: WebGLProgram = gl.createProgram()!;
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.useProgram(program)

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
  }
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    return {
      width,
      height,
      texture
    }
  }
  private workingMatrix: mat4 = mat4.create();
  private translationVector: vec3 = vec3.create();
  private scaleVector: vec3 = vec3.create();
  private textureMatrix: mat4 = mat4.create();
  private textureScaleVector: vec3 = vec3.create();
  private textureTranslationVector: vec3 = vec3.create();

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

    // Destination Matrix
    mat4.copy(workingMatrix, this.matrix);
    vec3.set(translationVector, destinationX, destinationY, 0);
    mat4.translate(workingMatrix, workingMatrix, translationVector);
    vec3.set(scaleVector, destinationWidth, destinationHeight, 1);
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
  public clear(v: [number, number, number, number] = [0.1, 0.1, 0.1, 1], w: number = 0, x: number = 0, y: number = this.width, z: number = this.height): void {
    var gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.clearColor(...v);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}