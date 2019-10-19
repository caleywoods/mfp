/**
 * In this algorithm, for each cell in your grid you must decide whether to
 * create a link to the North or East neighbor. During the drawing process we
 * then skip drawing walls between linked neighbors.
 *
 * The exception to the above rule in the first pass is that we want to avoid
 * going "out of bounds" so if we're in a cell whose Eastern side is the edge
 * of our grid/maze then we must erase North. Conversly if our cells Northern
 * wall is the Northern edge of the grid then we must go East.
 *
 * This results in all Binary Tree generated mazes having a "texture" where the
 * very first row (Northernmost) is always empty as well as the last column
 * (Easternmost).
 */

import { getRandomNumber } from '../../utils/utils.js';
import Grid from '../../classes/Grid.js';

export default class BinaryTree extends Grid {
    constructor(_rows, _cols, config = null) {
        super(_rows, _cols, config);
    }

    draw() {
        const maze_canvas = document.querySelector('#maze');
        const context = maze_canvas.getContext('2d');
        const entrances = this.chooseEntrances();

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
                const cellNeighbors = [];

                context.moveTo(x, y);

                if (cell.neighbors.north) {
                    cellNeighbors.push(cell.neighbors.north);
                }

                if (cell.neighbors.east) {
                    cellNeighbors.push(cell.neighbors.east);
                }

                const idx = Math.floor(Math.random() * cellNeighbors.length);
                const neighbor = cellNeighbors[idx];

                if (neighbor) {
                    cell.link(neighbor);
                }

                for (const entry of Object.entries(cell.neighbors)) {
                    // Skip drawing walls for our cells that serve as entrances
                    if (entrances.has(cell.id)) continue;

                    const [direction, neighborCell] = entry;

                    // If there's no neighbor in this direction, we can draw a wall
                    if (neighborCell === null) {
                        switch(direction) {
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
                            switch(direction) {
                                case 'north':
                                    context.lineTo(x + this.squareWidth, y);
                                    break;
                                case 'east':
                                    context.moveTo(x + this.squareWidth, y);
                                    context.lineTo(x + (this.squareWidth), y + this.squareHeight);
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
        const entrances = new Map();

        if (entranceSides[0] === 'north') {
            const northEntrance = getRandomNumber(0, this.cols - 1);
            const southEntrance = getRandomNumber(0, this.cols - 1);
            const northCell = this.cells[0][northEntrance];
            const southCell = this.cells[this.rows -1][southEntrance];
            entrances.set(northCell.id, true);
            entrances.set(southCell.id, true);
        } else {
            const eastEntrance = getRandomNumber(0, this.rows - 1);
            const westEntrance = getRandomNumber(0, this.rows - 1);
            const eastCell = this.cells[eastEntrance][this.cols - 1];
            const westCell = this.cells[westEntrance][0]
            entrances.set(eastCell.id, true);
            entrances.set(westCell.id, true);
        }

        return entrances;
    }
}