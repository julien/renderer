import DoublyLinkedList from './doubly-linked-list';
import Sprite from './sprite';

class SpritePool {
  constructor(growthRate = 1) {
    this.elements = [];
    this.freeElements = new DoublyLinkedList();

    this.growthRate = growthRate;
    this.grow(this.growthRate);
  }

  grow() {
    const oldsize  = this.elements.length;
    const newsize = (oldsize + this.growthRate + 1) << 0;

    this.elements.length = newsize;

    for (let i = oldsize; i < newsize; i++) {
      // Create new sprite and add it's index
      // to the freeElements linked-list
      this.elements[i] = new Sprite(i);
      this.freeElements.add(i);
    }
  }

  getFree() {
    if (this.freeElements.size() === 0) {
      this.grow();
    }

    // Remove and get head from linked-list
    const index = this.freeElements.remove(0);
    // Get the corresponding sprite
    const sprite = this.elements[index];
    // Mark it as allocated so it will be used when iterating
    sprite.allocated = true;
    return sprite;
  }

  free(sprite) {
    if (sprite.allocated === true) {
      sprite.allocated = false;
      sprite.reset();
      this.freeElements.add(sprite._poolindex);
    }
  }
}

export default SpritePool;
