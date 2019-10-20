/**
 * In the Sidewinder algorithm, as we walk each cell we push it into an array
 * which we call a run. We check at each cell whether we should close this run
 * of cells, we always close the run when we reach the Eastern border.
 *
 * If we elect to close the run, we look back at all the cells in the run and
 * choose one at random, from this random cell in our run we link to its
 * northern neighbor (if we can) and then clear the run to start clean with the
 * next cell.
 *
 * If we choose to continue the run then we link to the cells eastern neighbor.
 */
import { getRandomNumber } from '../../utils/utils.js';
import Grid from '../../classes/Grid.js';

export default class Sidewinder extends Grid {
    constructor(_rows, _cols, config = null) {
        super(_rows, _cols, config);
    }

    create() {
        for (let row = 0; row < this.rows; row++) {
            let run = [];

            for (let col = 0; col < this.cols; col++) {
                const cell = this.cells[row][col];

                run.push(cell);

                const atEasternBorder = !cell.neighbors.east;
                const atNorthernBorder = !cell.neighbors.north;
                const shouldCloseRun = atEasternBorder || (!atNorthernBorder && getRandomNumber(0, 1) === 0);

                if (shouldCloseRun) {
                    const idx = Math.floor(Math.random() * run.length);
                    const member = run[idx];

                    if (member.neighbors.north) {
                        member.link(member.neighbors.north);
                    }

                    run = [];
                } else {
                    cell.link(cell.neighbors.east);
                }
            }
        }

        this.draw();
    }
}