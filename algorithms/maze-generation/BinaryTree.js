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
import Grid from '../../classes/Grid.js';

export default class BinaryTree extends Grid {
    constructor(_rows, _cols, config = null) {
        super(_rows, _cols, config);
    }

    create() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
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
            }
        }

        this.draw();
    }
}