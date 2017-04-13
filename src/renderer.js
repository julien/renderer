import SpritePool from './sprite-pool';

class Renderer {

  constructor(canvas) {

    this.gl = canvas.getContext('webgl');
    if (!this.gl) {
      throw new Error('failed to get WebGL context');
    }

    this.program = this._createProgram();

    this.programInfo = {
      a_position: this.gl.getAttribLocation(this.program, 'a_position'),
      a_texCoord: this.gl.getAttribLocation(this.program, 'a_texCoord'),
      u_matrix: this.gl.getUniformLocation(this.program, 'u_matrix'),
      u_time: this.gl.getUniformLocation(this.program, 'u_time')
    };

    this.gl.useProgram(this.program);

    this.textures = [];
    this.maxTextures = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);

    this._createBuffers();

    this.startTime = Date.now();
    this.vertexData = new Float32Array(Renderer.MIN_ELEMENTS * 30);

    const w = this.gl.canvas.clientWidth;
    const h = this.gl.canvas.clientHeight;
    this.gl.viewport(0, 0, w, h);

    this.viewMatrix = new Float32Array([
      2, 0, 0, -1,
      0, 2, 0, 1,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
    this.viewMatrix[0] *= 1 / w;
    this.viewMatrix[5] *= -1 / h;
    this.gl.uniformMatrix4fv(this.programInfo.u_matrix, false, this.viewMatrix);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);

    this.sprites = new SpritePool();
  }

  get height() {
    return this.gl.canvas.clientHeight;
  }

  set height(v) {
    const h = this.height;
    if (v !== h) {
      this.gl.canvas.height = v;
    }
  }

  get width() {
    return this.gl.canvas.clientWidth;
  }

  set width(v) {
    const w = this.gl.canvas.clientWidth;
    if (v !== w) {
      this.gl.canvas.width = v;
    }
  }

  _createProgram() {
    const vsrc = `
    uniform mat4 u_matrix;
    attribute vec3 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    uniform float u_time;

    void main() {
      vec4 pos = vec4(a_position.xyz, 1.0);

      v_texCoord = a_texCoord;

      gl_Position = pos * u_matrix;
    }`;

    const fsrc = `
    precision lowp float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;

    void main() {
      gl_FragColor = texture2D(u_image, v_texCoord);
    }`;

    const vshader = this._createShader(vsrc, this.gl.VERTEX_SHADER);
    const fshader = this._createShader(fsrc, this.gl.FRAGMENT_SHADER);

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vshader);
    this.gl.attachShader(program, fshader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const e = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(e);
    }
    return program;
  }

  _createShader(src, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const e = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(e);
    }
    return shader;
  }

  createTexture(url, cb) {

    return new Promise((resolve, reject) => {
      if (this.textures.length >= this.maxTextures) {
        return reject(new Error('maximum number of textures created'));
      }

      const img = new Image();
      img.onload = () => {
        const tex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        this.gl.texImage2D(this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          img);

        const info = {w: img.width, h: img.height};
        const obj = {tex, info};
        this.textures.push(obj);
        resolve(obj);
      };

      img.onerror = () => {
        reject(new Error('could not load texture'));
      };

      img.src = url;
    });

  }

  setTexture(idx) {
    if (idx > -1 && idx < this.textures.length) {
      const tex = this.gl[`TEXTURE${idx}`];
      const active = this.gl.getParameter(this.gl.ACTIVE_TEXTURE);
      if (tex !== active) {
        gl.activeTexture(tex);
        return this.textures[id];
      }
    }
  }

  _createBuffers() {
    this.vertexData = new Float32Array(Renderer.MIN_ELEMENTS * 30);

    this.vertexBuffer = this.gl.createBuffer();

    this.gl.enableVertexAttribArray(this.programInfo.a_position);
    this.gl.enableVertexAttribArray(this.programInfo.a_texCoord);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);

    const size = Float32Array.BYTES_PER_ELEMENT; // should be 4
    const elements = 5;
    const stride = size * elements;              // should be 20
    const offset = 3 * size;                     // should be 12

    this.gl.vertexAttribPointer(this.programInfo.a_position, 3, this.gl.FLOAT, false, stride, 0);
    this.gl.vertexAttribPointer(this.programInfo.a_texCoord, 2, this.gl.FLOAT, false, stride, offset);
  }

  setViewMatrix(width, height) {
    const w = this.gl.canvas.clientWidth;
    const h = this.gl.canvas.clientHeight;
    if (w !== width || h !== h) {
      this.gl.canvas.width = width;
      this.gl.canvas.height = height;
      this.gl.viewport(0, 0, this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);
      this.viewMatrix[0] *= 1 / w;
      this.viewMatrix[5] *= -1 / h;
      this.gl.uniformMatrix4fv(this.programInfo.u_matrix, false, this.viewMatrix);
    }
  }

  setClearColor(r, g, b, a = 1.0) {
    this.gl.clearColor(r, g, b, a);
  }

  _drawSprites() {
    const sprites = this.sprites.elements;

    if (this.vertexData.length < sprites.length * 30) {
      this.vertexData = new Float32Array(sprites.length * 30);
    }

    let quads = 0;
    let quads30 = 0;

    for (let i = 0, l = sprites.length; i  < l; i++) {
      const sprite = sprites[i];

      if (sprite.allocated !== false) {
        let quads30i = quads30;
        let x = sprite.pos.x;
        let y = sprite.pos.y;
        let xx = x + sprite.size.x;
        let yy = y + sprite.size.y;

        this.vertexData[quads30i++] = x;
        this.vertexData[quads30i++] = y;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 0;

        this.vertexData[quads30i++] = xx;
        this.vertexData[quads30i++] = y;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 1;
        this.vertexData[quads30i++] = 0;

        this.vertexData[quads30i++] = x;
        this.vertexData[quads30i++] = yy;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 1;

        this.vertexData[quads30i++] = x;
        this.vertexData[quads30i++] = yy;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 1;

        this.vertexData[quads30i++] = xx;
        this.vertexData[quads30i++] = y;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 1;
        this.vertexData[quads30i++] = 0;

        this.vertexData[quads30i++] = xx;
        this.vertexData[quads30i++] = yy;
        this.vertexData[quads30i++] = 0;
        this.vertexData[quads30i++] = 1;
        this.vertexData[quads30i++] = 1;

        quads30 += 30;
        quads++;
      }
    }

    return quads * 6;
  }

  draw() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    const numQuads = this._drawSprites();
    if (numQuads > 1) {
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexData, this.gl.DYNAMIC_DRAW);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, numQuads);
    }
  }

  addSprite(x, y, w, h, tex) {
    const min = -10;
    const max =  10;
    const velx = min + Math.random() * (max - min);
    const vely = min + Math.random() * (max - min);

    return this.sprites.getFree()
      .initialize(x, y, w, h)
      .setVel(velx, vely);
  }

  updateTime() {
    const now = Date.now();
    const delta = now - this.startTime;
    this.startTime = now;
    this.gl.uniform1f(this.programInfo.u_time, now);
  }

  removeSprite(sprite) {
    this.sprites.free(sprite);
  }
}

Renderer.MIN_ELEMENTS = 500;

export default Renderer;
