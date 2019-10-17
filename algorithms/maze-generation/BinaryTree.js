/**
 * In this algorithm, for each cell in your grid you must decide whether to
 * create a path North or East by "erasing" the wall in that direction
 *
 * At each cell let's generate a random number between 1 and 10, for any number
 * above 5 we will erase North otherwise we will erase East.
 *
 * The exception to the above rule in the first pass is that we want to avoid
 * going "out of bounds" so if we're in a cell whose Eastern side is the edge
 * of our grid/maze then we must erase North. Conversly if our cells Northern
 * wall is the Northern edge of the grid then we must go East. This also has the
 * effect that once you reach a cell whose Eastern wall is the Eastern border of
 * the grid we can just erase all North walls walking up the cells until we
 * reach the one in the Northeast corner. At the Northeast corner we have no
 * moves/erases to make so we need to choose another cell.
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
        const wh = [100, 100];

        context.strokeStyle = '#222529';
        context.moveTo(this.squareWidth, this.squareHeight);
        context.beginPath();
        let x = 0;
        let y = 0;
        for (let row = 0; row < this.rows; row++) {
            x = this.squareWidth;
            y += this.squareHeight;
            for (let col = 0; col < this.cols; col++) {
                context.moveTo(x, y);
                const cell = this.cells[row][col];

                const cellNeighbors = [];

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

                Object.entries(cell.neighbors).forEach(neighbor => {
                    const [direction, neighborCell] = neighbor;

                    // If there's no neighbor in this direction, we can draw a wall
                    if (neighborCell === null) {
                        switch(direction) {
                            case 'north':
                                context.lineTo(x + this.squareWidth, y);
                                break;
                            case 'east':
                                context.moveTo(x + this.squareWidth,y);
                                context.lineTo(x + (this.squareWidth) , y + this.squareHeight);
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
                });

                x += this.squareWidth;
            }
        }
        console.log(this.cells);
        context.stroke();
    }

}