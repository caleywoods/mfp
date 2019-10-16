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
        for (let row = 0; row < this.rows; row++) {
            const northConstrained = row === 0;
            for (let col = 0; col < this.cols; col++) {
                const eastConstrained = col === this.cols - 1;
                const cell = this.cells[row][col];
                visited.push(cell.id);

                if (northConstrained) {
                    if (!eastConstrained) {
                        // Erase east
                        /**
                         * - call clearRect at this cells x,y to totally clear that rectangle
                         * - We also need to clearRect at the next cell to the right, otherwise we're left with the strokeWidth from that cell
                         *   "blocking" our path
                         * - We then need to use lineTo() to draw the North, West, and Southern "walls" back in place
                         * - We also need to then use lineTo() to draw the North, East, and Southern "walls" of our cell to the East back in place
                         *   we have to eliminate its western wall so that the these two cells are now open or "connected"
                         */
                    }
                    continue;
                }

                const randomNumber = getRandomNumber(0, 10);
                if (randomNumber > 5) {
                    // Erase North

                } else {
                    // Erase East
                }
            }
        }
    }

}