const cloneGraphDFS = (startNode) => {
    const visited = new Map();

    const clone = (node) => {
        if (node == null) return null;
        if (visited.has(node.val)) return visited.get(node.val);

        const clonedNode = new _Node(node.val, []);
        visited.set(node.val, clonedNode);

        for (const neighborNode of node.neighbors) {
            const clonedNeighborNode = clone(neighborNode);
            clonedNode.neighbors.push(clonedNeighborNode);
        }
        return clonedNode;
    };

    return clone(startNode);
};



const cloneGraphBFS = (startNode) => {
    if (startNode == null) return null;
    const visited = new Map();

    const queue = [];
    queue.push(startNode);

    const clonedStartNode = new _Node(startNode.val, []);
    visited.set(startNode.val, clonedStartNode);

    while (queue.length) {
        const curNode = queue.shift();

        for (const neighborNode of curNode.neighbors) {
            if (!visited.has(neighborNode.val)) {
                queue.push(neighborNode);
                const clonedNeighborNode = new _Node(neighborNode.val, []);
                visited.set(neighborNode.val, clonedNeighborNode);
            }
            const curClonedNode = visited.get(curNode.val);
            const clonedNeighborNode = visited.get(neighborNode.val);
            curClonedNode.neighbors.push(clonedNeighborNode);
        }
    }

    return clonedStartNode;
};


function _Node(val, neighbors) {
    this.val = val === undefined ? 0 : val;
    this.neighbors = neighbors === undefined ? [] : neighbors;
};

