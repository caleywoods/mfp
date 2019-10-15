import Node from './Node.js';

export default class Grid {
    constructor(_rows, _cols, config = null) {
        this.cols = _cols;
        this.rows = _rows;
        this.nodes = [];

        if (config) {
            Object.entries(config).forEach(entry => {
                const [prop, val] = entry;

                this[prop] = val;
            });
        }

        this.buildGrid();
    }

    // Build a 2D array to hold our node information
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
        // Subtract 1 from row and col to allow "human" input, meaning first row is 1, etc
        const node = this.nodes[row - 1][col - 1];
        node.isStart = true;
    }

    setEnd(row, col) {
        // Subtract 1 from row and col to allow "human" input, meaning first row is 1, etc
        const node = this.nodes[row - 1][col - 1];
        node.isEnd = true;
    }

    // Actually draw our grid to the screen using Canvas API
    draw() {
        const maze_canvas = document.querySelector('#maze');
        const context = maze_canvas.getContext('2d');
        const squareSizeSet = this.squareWidth && this.squareHeight;
        let wh = [100, 100];

        /**
         * @TODO: X/Y below need configured to dynamically use these values or
         * the grid looks whack AF
         */
        if (squareSizeSet) {
            wh = [this.squareHeight, this.squareWidth];
        }

        context.strokeStyle = '#222529';
        context.lineWidth = 5;
        let x = 50;
        for (let col = 0; col < this.cols; col++) {
            if (col > 0) {
                x += 100;
            }

            let y = 50;
            for (let row = 0; row < this.rows; row++) {
                if (row > 0) {
                    y += 100;
                }

                const node = this.nodes[row][col];
                if (node.isStart) {
                    context.fillStyle = '#61D095';
                    context.fillRect(x + (context.lineWidth / 2), y + (context.lineWidth / 2), 100 - context.lineWidth, 100 - context.lineWidth);
                } else if (node.isEnd) {
                    context.fillStyle = '#FB5D55';
                    context.fillRect(x, y, ...wh);
                }

                context.strokeRect(x, y, ...wh);
            }
        }
    }
}