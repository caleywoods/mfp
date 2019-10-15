
export default class Grid {
    constructor(_rows, _cols) {
        this.cols = _cols;
        this.rows = _rows;
        this.nodes = [];
    }

    addNode(node) {
        this.nodes.push(node);
    }
}