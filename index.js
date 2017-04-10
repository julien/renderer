
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
      u_matrix:   this.gl.getUniformLocation(this.program, 'u_matrix')
      // u_time ?
      // u_mouse?
    };

    this.textures = [];
    this.maxTextures = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);

    // _createBuffers();
  }

  _createProgram() {
    const vsrc = `
    uniform mat4 u_matrix;
    attribute vec3 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;

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

}

