LRU 算法，最近最少使用

```javascript
// LRU  双链表 +  hashMap

class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.hashMap = new Map();
    this.dummaryHead = new Node();
    this.dummaryTail = new Node();
    this.dummaryHead.next = this.dummaryTail;
    this.dummaryTail.prev = this.dummaryHead;
  }

  removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  add(node) {
    node.next = this.dummaryHead.next;
    node.prev = this.dummaryHead;
    this.dummaryHead.next.prev = node;
    this.dummaryHead.next = node;
  }

  get(key) {
    const node = this.hashMap.get(key);
    if (node === undefined) return -1;
    this.removeNode(node);
    this.add(node);
    return node.value;
  }
  put(key, value) {
    const node = this.hashMap.get(key);
    if (node) {
      node.value = value;
      this.removeNode(node);
      this.add(node);
      return;
    }
    if (this.hashMap.size >= this.capacity) {
      const lastNode = this.dummaryTail.prev;
      this.removeNode(lastNode);
      this.hashMap.delete(lastNode.key);
    }
    const newNode = new Node(key, value);
    this.add(newNode);
    this.hashMap.set(key, newNode);
  }
}
```
