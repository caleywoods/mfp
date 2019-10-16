import Cell from './Cell.js';

export default class Grid {
    constructor(_rows, _cols, config = null) {
        this.cols = _cols;
        this.rows = _rows;
        this.cells = [];

        if (config) {
            Object.entries(config).forEach(entry => {
                const [prop, val] = entry;

                this[prop] = val;
            });
        }

        this.buildGrid();
    }

    // Build a 2D array to hold our cell information
    buildGrid() {
        let id = 0;
        for (let row = 0; row < this.rows; row++) {
            this.cells[row] = [];
            for (let col = 0; col < this.cols; col++) {
                const cell = new Cell(id);
                this.cells[row][col] = cell;
                id++;
            }
        }
    }

    setStart(row, col) {
        // Subtract 1 from row and col to allow "human" input, meaning first row is 1, etc
        const cell = this.cells[row - 1][col - 1];
        cell.isStart = true;
    }

    setEnd(row, col) {
        // Subtract 1 from row and col to allow "human" input, meaning first row is 1, etc
        const cell = this.cells[row - 1][col - 1];
        cell.isEnd = true;
    }

    // Actually draw our grid to the screen using Canvas API
    draw() {
        const maze_canvas = document.querySelector('#maze');
        const context = maze_canvas.getContext('2d');
        const squareSizeSet = this.squareWidth && this.squareHeight;
        let wh = [100, 100];

        if (squareSizeSet) {
            wh = [this.squareHeight, this.squareWidth];
        }

        context.strokeStyle = '#222529';
        context.lineWidth = 5;
        context.font = '20px sans-serif';
        let x = this.squareWidth / 2 || wh[0] / 2;
        for (let col = 0; col < this.cols; col++) {
            if (col > 0) {
                x += this.squareWidth || wh[0];
            }

            let y = this.squareWidth / 2 || wh[1] / 2;
            for (let row = 0; row < this.rows; row++) {
                if (row > 0) {
                    y += this.squareHeight || wh[1];
                }

                const cell = this.cells[row][col];
                if (cell.isStart) {
                    context.fillStyle = '#61D095';
                    context.fillRect(x + (context.lineWidth / 2), y + (context.lineWidth / 2), 100 - context.lineWidth, 100 - context.lineWidth);
                } else if (cell.isEnd) {
                    context.fillStyle = '#FB5D55';
                    context.fillRect(x, y, ...wh);
                }

                context.strokeRect(x, y, ...wh);

                // Fill our cells with an ID for easy....well ID
                if (cell.id > 99) {
                    context.fillText(cell.id, x + this.squareWidth * .15, y + this.squareHeight * .65);
                } else if (cell.id > 9) {
                    context.fillText(cell.id, x + this.squareWidth * .285, y + this.squareHeight * .65);
                } else {
                    context.fillText(cell.id, x + this.squareWidth * .4, y + this.squareHeight * .65);
                }
            }
        }
    }
}