import Cell from './Cell.js';
import { getRandomNumber } from '../utils/utils.js';

export default class Grid {
    constructor(_rows, _cols, config = null) {
        this.cols = _cols;
        this.rows = _rows;
        this.cells = [];
        this.gridCells = new Map();
        this.entrances = new Map();

        if (config) {
            Object.entries(config).forEach(entry => {
                const [prop, val] = entry;

                this[prop] = val;
            });
        }

        this.buildGrid();
        this.configureCells();
    }

    // Build a 2D array to hold our cell information
    buildGrid() {
        let id = 0;
        for (let row = 0; row < this.rows; row++) {
            this.cells[row] = [];
            for (let col = 0; col < this.cols; col++) {
                const cell = new Cell(id, row, col);
                this.cells[row][col] = cell;
                this.gridCells.set(cell.id, cell);
                id++;
            }
        }
    }

    // Set each cells neighbors
    configureCells() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.cells[r][c];
                const row = cell.row;
                const col = cell.col;

                cell.neighbors.north = this.getNeighbor(row - 1, col);
                cell.neighbors.south = this.getNeighbor(row + 1, col);
                cell.neighbors.west = this.getNeighbor(row, col - 1);
                cell.neighbors.east = this.getNeighbor(row, col + 1);
            }
        }
    }

    // Protect from going out of bounds when accessing rows/cols
    getNeighbor(row, col) {
        if ((row < 0 || col < 0) || (row > this.rows - 1 || col > this.cols - 1)) {
            return null;
        }

        return this.cells[row][col];
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

    create() {
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

    // Actually draw our grid to the screen using Canvas API
    draw() {
        this.chooseEntrances();
        const maze_canvas = document.querySelector('#maze');
        const context = maze_canvas.getContext('2d');

        context.strokeStyle = '#222529';
        context.moveTo(this.squareWidth, this.squareHeight);
        context.beginPath();
        let x = 0;
        let y = 0;

        for (let row = 0; row < this.rows; row++) {
            x = this.squareWidth;
            y += this.squareHeight;

            for (let col = 0; col < this.cols; col++) {
                const cell = this.cells[row][col];
                context.moveTo(x,y);

                // Fill our cells with an ID for easy....well ID
                if (this.showIDs) {
                    if (cell.isStart) {
                        context.fillStyle = '#61D095';
                    } else if (cell.isEnd) {
                        context.fillStyle = '#FB5D55';
                    } else {
                        context.fillStyle = '#222529';
                    }

                    if (cell.id > 99) {
                        context.fillText(cell.id, x + this.squareWidth * .15, y + this.squareHeight * .65);
                    } else if (cell.id > 9) {
                        context.fillText(cell.id, x + this.squareWidth * .285, y + this.squareHeight * .65);
                    } else {
                        context.fillText(cell.id, x + this.squareWidth * .4, y + this.squareHeight * .65);
                    }
                }

                for (const entry of Object.entries(cell.neighbors)) {
                    const [direction, neighborCell] = entry;

                    // Skip drawing walls for our cells that serve as entrances
                    if (this.entrances.has(cell.id)) {
                        let entrance = this.entrances.get(cell.id);
                        entrance = entrance.direction;
                        if (entrance === direction) {
                            continue;
                        }
                    }

                    // If there's no neighbor in this direction, we can draw a wall
                    if (neighborCell === null) {
                        switch (direction) {
                            case 'north':
                                context.lineTo(x + this.squareWidth, y);
                                break;
                            case 'east':
                                context.moveTo(x + this.squareWidth, y);
                                context.lineTo(x + (this.squareWidth), y + this.squareHeight);
                                break;
                            case 'south':
                                context.moveTo(x, y + this.squareHeight);
                                context.lineTo(x + this.squareWidth, y + this.squareHeight);
                                break;
                            case 'west':
                                context.moveTo(x, y);
                                context.lineTo(x, y + this.squareHeight);
                                break;
                        }
                    } else {
                        // If the neighbor is not linked, stroke
                        const drawWall = !cell.isLinked(neighborCell);

                        if (drawWall) {
                            switch (direction) {
                                case 'north':
                                    context.lineTo(x + this.squareWidth, y);
                                    break;
                                case 'east':
                                    context.moveTo(x + this.squareWidth, y);
                                    context.lineTo(x + this.squareWidth, y + this.squareHeight);
                                    break;
                            }
                        }
                    }
                }

                x += this.squareWidth;
            }
        }

        context.stroke();
    }

    /**
     * Pick our entrances, either North/South or West/East
     * Return a 2 element map where the key is a cell.id with a boolean true
     * as the value just for quick lookup when drawing.
     */
    chooseEntrances() {
        const borders = ['north', 'west'];
        const entranceSides = [borders[Math.floor(Math.random() * borders.length)]];

        if (entranceSides[0] === 'north') {
            const northEntrance = getRandomNumber(0, this.cols - 1);
            const southEntrance = getRandomNumber(0, this.cols - 1);
            const northCell = this.cells[0][northEntrance];
            const southCell = this.cells[this.rows -1][southEntrance];
            northCell.isStart = true;
            southCell.isEnd = true;
            this.entrances.set(northCell.id, {direction: 'north', cell: northCell});
            this.entrances.set(southCell.id, {direction: 'south', cell: southCell});
        } else {
            const eastEntrance = getRandomNumber(0, this.rows - 1);
            const westEntrance = getRandomNumber(0, this.rows - 1);
            const eastCell = this.cells[eastEntrance][this.cols - 1];
            const westCell = this.cells[westEntrance][0]
            westCell.isStart = true;
            eastCell.isEnd = true;
            this.entrances.set(westCell.id, {direction: 'west', cell: westCell});
            this.entrances.set(eastCell.id, {direction: 'east', cell: eastCell});
        }
    }
}