class TreeNode {
    constructor(val) {
        this.val = val;
        this.left = null;
        this.right = null;
    }
}

function insertNode(root, val) {
    if (root === null) {
        root = new TreeNode(val);
        return root;
    }
    if (val === root.val) return root;
    if (val < root.val) root.left = insertNode(root.left, val)
    if (val > root.val) root.right = insertNode(root.right, val)
    return root;
}

function createTree(arr) {
    if (arr.length === 0) return null;
    let root = new TreeNode(arr[0]);
    for (let i = 1; i < arr.length; i++) {
        insertNode(root, arr[i]);
        console.log(root);
    }
    return root;
}

const testNode = createTree([8, 4, 12, 3, 1, 5, 2, 6, 7, 9, 10, 11, 12, 13, 14, 15]);


function findMin(node) {
    while (node.left) {
        node = node.left;
    }
    return node;
}

function deleteNode(root, key) {
    if (!root) return null;
    if (root.val > key) {
        root.left = deleteNode(root.left, key);
        console.log(root);
    } else if (root.val < key) {
        root.right = deleteNode(root.right, key);

    } else {
        if (!root.right && !root.left) return null;
        if (!root.left) {
            return root.right;
        }
        if (!root.right) {
            return root.left;
        }
        const minNode = findMin(root.right);
        root.val = minNode.val;
        root.right = deleteNode(root.right, minNode.val);
        console.log(root.right);
    }
    return root;
}



const a = deleteNode(testNode, 2)

const result = []
function inOrder(root) {
    if (root === null) return;
    inOrder(root.left)
    result.push(root.val)
    inOrder(root.right)
    return result;
}



console.log(inOrder(a));