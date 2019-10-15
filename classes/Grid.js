import Node from './Node.js';

export default class Grid {
    constructor(_rows, _cols) {
        this.cols = _cols;
        this.rows = _rows;
        this.nodes = [];
        this.buildGrid();
    }

    buildGrid() {
        for (let row = 0; row < this.rows; row++) {
            this.nodes[row] = [];
            for (let col = 0; col < this.cols; col++) {
                const node = new Node();
                this.nodes[row][col] = node;
            }
        }
        console.log('Grid has been constructed: ', this.nodes);
    }

    addNode(node) {
        this.nodes.push(node);
    }

    setStart(row, col) {
        const node = this.nodes[row][col];
        node.isStart = true;
    }
}