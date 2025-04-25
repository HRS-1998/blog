class SegmentTreeNode {
    constructor(start, end, sum) {
        this.start = start; // 区间开始
        this.end = end;     // 区间结束
        this.sum = sum;     // 区间和
        this.left = null;   // 左子节点
        this.right = null;  // 右子节点
    }
}

class SegmentTree {
    constructor(nums) {
        this.root = this.build(nums, 0, nums.length - 1);
    }

    // 构建线段树
    build(nums, start, end) {
        if (start > end) return null;
        const node = new SegmentTreeNode(start, end, 0);
        if (start === end) {
            node.sum = nums[start];
        } else {
            const mid = Math.floor((start + end) / 2);
            node.left = this.build(nums, start, mid);
            node.right = this.build(nums, mid + 1, end);
            node.sum = node.left.sum + node.right.sum;
        }
        return node;
    }

    // 查询区间 [left, right] 的和
    query(left, right) {
        return this.queryNode(this.root, left, right);
    }

    // 递归查询
    queryNode(node, left, right) {
        if (left > node.end || right < node.start) return 0; // 区间不重叠
        if (left <= node.start && right >= node.end) return node.sum; // 区间完全包含
        const mid = Math.floor((node.start + node.end) / 2);
        let sum = 0;
        if (left <= mid) sum += this.queryNode(node.left, left, right);
        if (right > mid) sum += this.queryNode(node.right, left, right);
        return sum;
    }

    // 更新位置 index 的值为 val
    update(index, val) {
        this.updateNode(this.root, index, val);
    }

    // 递归更新
    updateNode(node, index, val) {
        if (node.start === node.end) {
            node.sum = val;
            return;
        }
        const mid = Math.floor((node.start + node.end) / 2);
        if (index <= mid) {
            this.updateNode(node.left, index, val);
        } else {
            this.updateNode(node.right, index, val);
        }
        node.sum = node.left.sum + node.right.sum;
    }
}

// 示例用法
const nums = [1, 3, 5, 7, 9, 11];
const segmentTree = new SegmentTree(nums);

console.log(segmentTree.query(1, 3)); // 输出 15 (3 + 5 + 7)
segmentTree.update(1, 10); // 更新位置 1 的值为 10
console.log(segmentTree.query(1, 3)); // 输出 22 (10 + 5 + 7)