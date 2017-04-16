(function () {

  'use strict';

  function DoublyLinkedList() {
    this._head = null;
    this._tail = null;
    this._length = 0;
  }

  DoublyLinkedList.prototype.add = function(data) {
    var node = {
      data: data,
      next: null,
      prev: null
    };

    if (this._length === 0) {
      this._head = node;
      this._tail = node;
    } else {
      this._tail.next = node;
      node.prev = this._tail;
      this._tail = node;
    }
    this._length++;
  };

  DoublyLinkedList.prototype.remove = function(index) {
    if (index > -1 && index < this._length) {
      var current = this._head;
      var i = 0;

      if (index === 0) {
        this._head = current.next;

        if (this._head == undefined) {
          this._tail = null;
        } else {
          this._head.prev = null;
        }
      } else if (index === this._length - 1) {
        current = this._tail;
        this._tail = current.prev;
        this._tail.next = null;
      } else {

        while (i++ < index) {
          current = current.next;
        }

        current.prev.next = current.next;
        current.next.prev = current.prev;
      }

      this._length--;
      return current.data;
    } else {
      return null;
    }
  };

  DoublyLinkedList.prototype.size = function() { return this._length; };

  DoublyLinkedList.prototype.toArray = function() {
    var result = [];
    var current = this._head;

    while (current !== null) {
      result.push(current.data);
      current = current.next;
    }
    return result;
  };

  function Sprite(poolindex) {
    this._poolindex = poolindex;
    this.allocated = false;

    this.pos = {x: 0, y: 0};
    this.acc = {x: 0, y: 0};
    this.vel = {x: 0, y: 0};
    this.size = {x: 0, y: 0};
    this.life = 0;
  };

  Sprite.prototype.initialize = function(x, y, w, h) {
    this.pos.x = x;
    this.pos.y = y;
    this.size.x = w;
    this.size.y = h;
    return this;
  };

  Sprite.prototype.setVel = function(x, y) {
    this.vel.x = x;
    this.vel.y = y;
    return this;
  };

  Sprite.prototype.reset = function() {
    this.initialize(0, 0, 0, 0);
    this.setVel(0, 0);
    this.acc.x = 0;
    this.acc.y = 0;
    this.life = 0;
    return this;
  };

  function SpritePool(growthRate) {
    this.elements = [];
    this.freeElements = new DoublyLinkedList();

    this.growthRate = growthRate ? growthRate : 1;
    this.grow(this.growthRate);
  }

  SpritePool.prototype.grow = function() {
    var oldsize  = this.elements.length;
    var newsize = (oldsize + this.growthRate + 1) << 0;

    this.elements.length = newsize;

    for (var i = oldsize; i < newsize; i++) {
      this.elements[i] = new Sprite(i);
      this.freeElements.add(i);
    }
  };

  SpritePool.prototype.getFree = function() {
    if (this.freeElements.size() === 0) {
      this.grow();
    }
    var index = this.freeElements.remove(0);
    var sprite = this.elements[index];
    sprite.allocated = true;
    return sprite;
  };

  SpritePool.prototype.free = function(sprite) {
    if (sprite.allocated === true) {
      sprite.allocated = false;
      sprite.reset();
      this.freeElements.add(sprite._poolindex);
    }
  };

  function Renderer(canvas) {
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

    var w = this.gl.canvas.clientWidth;
    var h = this.gl.canvas.clientHeight;
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

  Object.defineProperty(Renderer.prototype, 'height', {
    get: function() {
      return this.gl.canvas.clientHeight;
    },
    set: function(v) {
      var v = this.height;
      if (v !== h) {
        this.gl.canvas.height = v;
      }
    }
  });

  Object.defineProperty(Renderer.prototype, 'width', {
    get: function() {
      return this.gl.canvas.clientWidth;
    },
    set: function(v) {
      var w = this.gl.canvas.clientWidth;
      if (v !== w) {
        this.gl.canvas.width = v;
      }
    }
  })

  Renderer.prototype._createProgram = function() {
    var vsrc = `
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

    var fsrc = `
    precision lowp float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;

    void main() {
      gl_FragColor = texture2D(u_image, v_texCoord);
    }`;

    var vshader = this._createShader(vsrc, this.gl.VERTEX_SHADER);
    var fshader = this._createShader(fsrc, this.gl.FRAGMENT_SHADER);

    var program = this.gl.createProgram();
    this.gl.attachShader(program, vshader);
    this.gl.attachShader(program, fshader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      var e = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(e);
    }
    return program;
  }

  Renderer.prototype._createShader = function(src, type) {
    var shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      var e = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(e);
    }
    return shader;
  }

  Renderer.prototype.createTexture = function(url, cb) {

    return new Promise((resolve, reject) => {
      if (this.textures.length >= this.maxTextures) {
        return reject(new Error('maximum number of textures created'));
      }

      var self = this;
      var img = new Image();
      img.onload = function() {
        var tex = self.gl.createTexture();
        self.gl.bindTexture(self.gl.TEXTURE_2D, tex);

        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.CLAMP_TO_EDGE);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.CLAMP_TO_EDGE);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);

        self.gl.texImage2D(self.gl.TEXTURE_2D,
          0,
          self.gl.RGBA,
          self.gl.RGBA,
          self.gl.UNSIGNED_BYTE,
          img);

        var info = {w: img.width, h: img.height};
        var obj = {tex, info};
        self.textures.push(obj);
        resolve(obj);
      };

      img.onerror = function() {
        reject(new Error('could not load texture'));
      };

      img.src = url;
    });

  }

  Renderer.prototype.setTexture = function(idx) {
    if (idx > -1 && idx < this.textures.length) {
      var tex = this.gl[`TEXTURE${idx}`];
      var active = this.gl.getParameter(this.gl.ACTIVE_TEXTURE);
      if (tex !== active) {
        gl.activeTexture(tex);
        return this.textures[id];
      }
    }
  }

  Renderer.prototype._createBuffers = function() {
    this.vertexData = new Float32Array(Renderer.MIN_ELEMENTS * 30);

    this.vertexBuffer = this.gl.createBuffer();

    this.gl.enableVertexAttribArray(this.programInfo.a_position);
    this.gl.enableVertexAttribArray(this.programInfo.a_texCoord);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);

    var size = Float32Array.BYTES_PER_ELEMENT; // should be 4
    var elements = 5;
    var stride = size * elements;              // should be 20
    var offset = 3 * size;                     // should be 12

    this.gl.vertexAttribPointer(this.programInfo.a_position, 3, this.gl.FLOAT, false, stride, 0);
    this.gl.vertexAttribPointer(this.programInfo.a_texCoord, 2, this.gl.FLOAT, false, stride, offset);
  };

  Renderer.prototype.setViewMatrix = function(width, height) {
    var w = this.gl.canvas.clientWidth;
    var h = this.gl.canvas.clientHeight;
    if (w !== width || h !== h) {
      this.gl.canvas.width = width;
      this.gl.canvas.height = height;
      this.gl.viewport(0, 0, this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);
      this.viewMatrix[0] *= 1 / w;
      this.viewMatrix[5] *= -1 / h;
      this.gl.uniformMatrix4fv(this.programInfo.u_matrix, false, this.viewMatrix);
    }
  };

  Renderer.prototype.setClearColor = function(r, g, b, a) {
    this.gl.clearColor(r, g, b, a);
  }

  Renderer.prototype._drawSprites = function() {
    var sprites = this.sprites.elements;

    if (this.vertexData.length < sprites.length * 30) {
      this.vertexData = new Float32Array(sprites.length * 30);
    }

    var quads = 0;
    var quads30 = 0;

    for (var i = 0, l = sprites.length; i  < l; i++) {
      var sprite = sprites[i];

      if (sprite.allocated !== false) {
        var quads30i = quads30;
        var x = sprite.pos.x;
        var y = sprite.pos.y;
        var xx = x + sprite.size.x;
        var yy = y + sprite.size.y;

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

  Renderer.prototype.draw = function() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    var numQuads = this._drawSprites();
    if (numQuads > 1) {
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexData, this.gl.DYNAMIC_DRAW);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, numQuads);
    }
  };

  Renderer.prototype.addSprite = function(x, y, w, h, tex) {
    var min = -10;
    var max =  10;
    var velx = min + Math.random() * (max - min);
    var vely = min + Math.random() * (max - min);

    return this.sprites.getFree()
      .initialize(x, y, w, h)
      .setVel(velx, vely);
  };

  Renderer.prototype.updateTime = function() {
    var now = Date.now();
    var delta = now - this.startTime;
    this.startTime = now;
    this.gl.uniform1f(this.programInfo.u_time, now);
  };

  Renderer.prototype.removeSprite = function(sprite) {
    this.sprites.free(sprite);
  };

  Renderer.MIN_ELEMENTS = 500;

  window.Renderer = Renderer;


}(window));
