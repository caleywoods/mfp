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
    }

    setStart(row, col) {
        // Subtract 1 fron row and col to allow "human" input, meaning first row is 1, etc
        const node = this.nodes[row - 1][col - 1];
        node.isStart = true;
    }

    setEnd(row, col) {
        // Subtract 1 fron row and col to allow "human" input, meaning first row is 1, etc
        const node = this.nodes[row - 1][col - 1];
        node.isEnd = true;
    }

    // Actually draw our grid to the screen using Canvas API
    draw() {
        const maze_canvas = document.querySelector('#maze');
        const context = maze_canvas.getContext('2d');
        // width and height of our grid squares
        const wh = [100, 100];
        context.strokeStyle = 'blue';
        context.lineWidth = 5;
        let x = 50;
        for (let row = 0; row < this.rows; row++) {

            if (row > 0) {
                x += 100;
            }
            let y = 50;
            for (let col = 0; col < this.cols; col++) {

                if (col > 0) {
                    y += 100;
                }

                const node = this.nodes[row][col];
                // if (node.isStart) {
                //     context.fillStyle = 'green';
                //     context.fillRect(x + (context.lineWidth / 2), y + (context.lineWidth / 2), 100 - context.lineWidth, 100 - context.lineWidth);
                // } else if (node.isEnd) {
                //     context.fillStyle = 'red';
                    // context.fillRect(x, y, ...wh);
                // } else {
                    context.strokeRect(x, y, ...wh);
                // }
            }
        }
    }
}