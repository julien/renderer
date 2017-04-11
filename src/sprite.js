
class Sprite {
  constructor(poolindex) {
    this._poolindex = poolindex;
    this.allocated = false;

    this.pos = {x: 0, y: 0};
    this.acc = {x: 0, y: 0};
    this.vel = {x: 0, y: 0};
    this.size = {x: 0, y: 0};
    this.life = 0;
  }

  initialize(x, y, w, h) {
    this.pos.x = x;
    this.pos.y = y;
    this.size.x = w;
    this.size.y = h;
    return this;
  }

  setVel(x, y) {
    this.vel.x = x;
    this.vel.y = y;
    return this;
  }

  reset() {
    this.initialize(0, 0, 0, 0);
    this.setVel(0, 0);
    this.acc.x = 0;
    this.acc.y = 0;
    this.life = 0;
    return this;
  }
}

export default Sprite;
