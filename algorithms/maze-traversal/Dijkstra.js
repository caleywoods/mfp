import Walker from '../../classes/Walker.js';

export default class Dijkstra extends Walker {
    constructor(_grid, _config) {
        super(_grid, _config);
        this.visited = new Map();
        this.canvas = document.querySelector('#maze');
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = '#61D095';
        this.context.globalAlpha = .6;
        this.solve();
    }

    solve() {
        /**
         * Start and End are 2 element arrays with the shape:
         *     [0] - Cell ID
         *     [1] - Object{}, keys are 'direction' and 'cell'
         *     'cell' is a reference to the cell itself which is what we want so
         *     that we can get the row and column number to start at and the row
         *     and column of our finishing cell.
         */
        const [start, end] = Array.from(this.grid.entrances.entries());
        const {cell: startCell} = start[1];
        const {cell: endCell} = end[1];

        this.assignDistance(startCell, 0, true);
        const endScore = this.visited.get(endCell.id);

        this.fillShortestPath(endCell, endScore - 1);
    }

    assignDistance(cell, startDistance, startCell = false) {
        if (!this.visited.has(cell.id)) {
            this.visited.set(cell.id, startDistance);
            for (const link of cell.links.keys()) {
                this.assignDistance(link, startDistance + 1, false);
            }
        }
    }

    fillShortestPath(cell, targetScore) {
        if (cell.isStart) {
            const x = (this.grid.squareWidth * cell.col) + this.grid.squareWidth;
            const y = (this.grid.squareHeight * cell.row) + this.grid.squareHeight;
            this.context.fillRect(x + 1, y - 1, this.grid.squareWidth, this.grid.squareHeight);
        }
        for (let link of cell.links) {
            [link] = link
            const cellScore = this.visited.get(link.id);
            const x = (this.grid.squareWidth * cell.col + 1) + this.grid.squareWidth;
            const y = (this.grid.squareHeight * cell.row + 1) + this.grid.squareHeight;
            if (cellScore === targetScore) {
                this.context.fillRect(x, y, this.grid.squareWidth, this.grid.squareHeight);
                this.fillShortestPath(link, targetScore - 1);
            }
        }
    }
}