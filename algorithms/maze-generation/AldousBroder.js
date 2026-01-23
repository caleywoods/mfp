import Grid from '../../classes/Grid.js';
import { getRandomNumber } from '../../utils/utils.js';

export default class AldousBroder extends Grid {
    constructor(_rows, _cols, config = null) {
        super(_rows, _cols, config);
    }

    create() {
        const row = getRandomNumber(0, this.rows - 1);
        const col = getRandomNumber(0, this.cols - 1);
        let cell = this.cells[row][col];
        let unvisited = this.rows * this.cols - 1;
        while (unvisited > 0) {
            const cellNeighbors = cell.validNeighbors;

            const idx = Math.floor(Math.random() * cellNeighbors.length);
            const neighbor = cellNeighbors[idx];

            if (neighbor && neighbor.links.size === 0) {
                cell.link(neighbor);
                unvisited--;
            }

            cell = neighbor;
        }

        this.draw();
    }

}
