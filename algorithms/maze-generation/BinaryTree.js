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

import getRandomNumber from '../../utils/utils.js';

class BinaryTree {
    generate(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const randomNumber = this.getRandomNumber(0,10);

            if (randomNumber > 5) {
                // Erase North unless that makes an entrance or exit
            } else {
                // Erase East unless that makes an extrance of exit
            }
        }
    }

}