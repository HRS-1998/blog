// @ts-nocheck
/** js 链表操作 */
//1.定义单向链表的节点类
class Node {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

//2.定义单向链表类
class SingleLinked {
    constructor() {
        this.size = 0;
        this.head = new Node('head');
        this.tail = this.head; // 维护尾节点指针
    }

    //获取链表长度
    getLength() {
        return this.size;
    }

    //判断是否为空
    isEmpty() {
        return this.size === 0;
    }

    //遍历链表
    displayList() {
        let list = '';
        let currentNode = this.head; //指向链表的头指针
        while (currentNode) {
            list += currentNode.data;
            currentNode = currentNode.next;
            if (currentNode) {
                list += '->';
            }
        }
        console.log(list);
    }

    //获取链表最后一个节点
    findLast() {
        return this.tail;
    }

    //采用尾插法给链表插入元素
    appendNode(element) {
        let newNode = new Node(element);
        this.tail.next = newNode;
        this.tail = newNode;
        this.size++;
    }

    //查找节点
    findNode(element) {
        let currentNode = this.head;
        while (currentNode && currentNode.data !== element) {
            currentNode = currentNode.next;
        }
        return currentNode;
    }

    //删除节点
    removeNode(element) {
        let currentNode = this.head;
        let previousNode = null;

        while (currentNode && currentNode.data !== element) {
            previousNode = currentNode;
            currentNode = currentNode.next;
        }

        if (!currentNode) {
            return '节点不存在';
        }

        if (previousNode) {
            previousNode.next = currentNode.next;
        } else {
            this.head = currentNode.next;
        }

        if (currentNode === this.tail) {
            this.tail = previousNode;
        }

        this.size--;
        return '节点已删除';
    }
}