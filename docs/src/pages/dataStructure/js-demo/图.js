class Graph {
    constructor() {
        this.vertices = []; // 顶点列表
        this.adjMatrix = []; // 邻接矩阵
    }

    // 添加顶点
    addVertex(vertex) {
        if (!this.vertices.includes(vertex)) {
            this.vertices.push(vertex);
            const len = this.vertices.length;
            for (let i = 0; i < len - 1; i++) {
                this.adjMatrix[i].push(0); // 新增列
            }
            const row = new Array(len).fill(0); // 新增行
            this.adjMatrix.push(row);
        }
    }

    // 添加边
    addEdge(vertex1, vertex2, weight = 1) {
        const index1 = this.vertices.indexOf(vertex1);
        const index2 = this.vertices.indexOf(vertex2);
        if (index1 !== -1 && index2 !== -1) {
            this.adjMatrix[index1][index2] = weight;
            this.adjMatrix[index2][index1] = weight; // 无向图
        }
    }

    // 删除边
    removeEdge(vertex1, vertex2) {
        const index1 = this.vertices.indexOf(vertex1);
        const index2 = this.vertices.indexOf(vertex2);
        if (index1 !== -1 && index2 !== -1) {
            this.adjMatrix[index1][index2] = 0;
            this.adjMatrix[index2][index1] = 0; // 无向图
        }
    }

    // 获取邻接矩阵
    getAdjMatrix() {
        return this.adjMatrix;
    }

    // 打印邻接矩阵
    printAdjMatrix() {
        console.log("邻接矩阵:");
        console.log("   " + this.vertices.join(" "));
        for (let i = 0; i < this.vertices.length; i++) {
            console.log(this.vertices[i] + " " + this.adjMatrix[i].join(" "));
        }
    }
}

// 示例用法
const graph = new Graph();
graph.addVertex("A");
graph.addVertex("B");
graph.addVertex("C");
graph.addVertex("D");

graph.addEdge("A", "B", 1);
graph.addEdge("A", "C", 2);
graph.addEdge("B", "D", 3);
graph.addEdge("C", "D", 4);

graph.printAdjMatrix();