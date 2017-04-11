
class DoublyLinkedList {
  constructor() {
    this._head = null;
    this._tail = null;
    this._length = 0;
  }

  add(data) {
    const node = {
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
  }

  remove(index) {
    if (index > -1 && index < this._length) {
      let current = this._head;
      let i = 0;

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
  }

  size() { return this._length; }

  toArray() {
    let result = [];
    let current = this._head;

    while (current !== null) {
      result.push(current.data);
      current = current.next;
    }
    return result;
  }
}

export default DoublyLinkedList;
