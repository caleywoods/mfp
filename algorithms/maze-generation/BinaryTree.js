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
        const visited = [];
        const maze_canvas = document.querySelector('#maze');
        const context = maze_canvas.getContext('2d');
        const wh = [100, 100];

        context.strokeStyle = '#222529';
        context.beginPath();
        context.moveTo(50,50);
        let y = this.squareWidth || wh[0];
        for (let row = 0; row < this.rows; row++) {
            const northConstrained = row === 0;
            const southBorder = row === this.rows - 1;
            const pixelsWide = this.squareWidth * this.cols;
            const pixelsHigh = this.squareHeight * this.rows;

            if (row > 0) {
                y += this.squareHeight || wh[1];
            }
            // Draw northern border
            if (northConstrained) {
                context.lineTo(pixelsWide, 50);
            }

            // Draw southern border
            if (southBorder) {
                context.moveTo(this.squareWidth, pixelsHigh);
                context.lineTo(pixelsWide, pixelsWide);
            }

            let x = this.squareWidth || wh[1];
            for (let col = 0; col < this.cols; col++) {
                const eastConstrained = col === this.cols - 1;
                const westConstrained = col === 0;

                if (col > 0) {
                    x += this.squareWidth || wh[0];
                }

                // Draw western border
                if (westConstrained) {
                    context.moveTo(this.squareWidth, this.squareHeight);
                    context.lineTo(this.squareWidth, pixelsHigh);
                    //continue;
                }

                // Draw eastern border
                if (eastConstrained) {
                    //context.moveTo(pixelsWide, this.squareHeight);
                    //context.lineTo(pixelsWide, pixelsHigh);
                    //continue;
                }

                const cell = this.cells[row][col];
                visited.push(cell.id);

                const randomNumber = getRandomNumber(0, 10);
                context.moveTo(x, y);
                if (randomNumber > 5) {
                    // draw west/east
                    if (!southBorder && !northConstrained) {
                        context.lineTo(x, y + this.squareHeight);
                    }
                } else {
                    // draw north/south
                    if (!eastConstrained && !southBorder) {
                        if (col !== this.cols - 2) {
                            context.lineTo(x + this.squareWidth, y);
                        }
                    }
                }
            }
        }
        context.stroke();
    }

}