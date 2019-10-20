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