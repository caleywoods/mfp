import Grid from '../../classes/Grid.js';

// https://www.youtube.com/watch?v=dNLvRN2GUbg
export default class Wilson extends Grid {
    constructor(_rows, _cols, config = null) {
        super(_rows, _cols, config);
    }

    create() {
        let unvisited = this.gridCells;

        const idx = Math.floor(Math.random() * unvisited.size);
        const firstCell = unvisited.get(idx);

        unvisited.delete(firstCell.id);

        while (unvisited.size > 0) {
            const cellArr = Array.from(unvisited.values());
            const idx = Math.floor(Math.random() * cellArr.length);
            let cell = cellArr[idx];
            let walk = [cell];

            while (unvisited.has(cell.id)) {
                const cellNeighbors = Array.from(Object.values(cell.neighbors)).filter(neighbor => neighbor);
                const idx = Math.floor(Math.random() * cellNeighbors.length);
                cell = cellNeighbors[idx];
                const pos = walk.indexOf(cell);

                /**
                 * If our walk contains the randomly selected neighbor this
                 * means we've managed to walk a loop back to this random cell.
                 *
                 * An important part of Wilson's algorith is the "loop-erased"
                 * random walk, this is the erasing part, we keep only the cells
                 * in our walk that were no part of the loop we just made.
                 */
                if (pos > -1) {
                    walk = walk.slice(0, pos + 1);
                } else {
                    walk.push(cell);
                }
            }

            for (let i = 0; i < walk.length - 1; i++) {
                walk[i].link(walk[i + 1]);
                unvisited.delete(walk[i].id);
            }
        }

        this.draw();
    }
}
