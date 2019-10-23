import Walker from '../../classes/Walker.js';

export default class Dijkstra extends Walker {
    constructor(_grid, _config) {
        super(_grid, _config);
        this.visited = new Map();
        this.canvas = document.querySelector('#maze');
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = '#61D095';
        this.context.globalAlpha = .6;
        this.stagger = 100;
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

    assignDistance(cell, startDistance) {
        if (!this.visited.has(cell.id)) {
            this.visited.set(cell.id, startDistance);

            if (this.showWeightedScores) {
                const x = (this.grid.squareWidth * cell.col) + this.grid.squareWidth;
                const y = (this.grid.squareHeight * cell.row) + this.grid.squareHeight;

                this.context.fillStyle = '#222529';
                this.context.globalAlpha = 1;

                if (startDistance > 99) {
                    this.context.fillText(startDistance, x + this.grid.squareWidth * .005, y + this.grid.squareHeight * .65);
                } else if (startDistance > 9) {
                    this.context.fillText(startDistance, x + this.grid.squareWidth * .1, y + this.grid.squareHeight * .65);
                } else {
                    this.context.font = '8px sans-serif';
                    this.context.fillText(startDistance, x + this.grid.squareWidth * .4, y + this.grid.squareHeight * .65);
                }
            }

            for (const link of cell.links.keys()) {
                this.assignDistance(link, startDistance + 1, false);
            }
        }

        if (this.showWeightedScores) {
            this.context.fillStyle = '#61D095';
            this.context.globalAlpha = .6;
        }
    }

    fillShortestPath(cell, targetScore) {
        if (cell.isEnd) {
            const x = (this.grid.squareWidth * cell.col) + this.grid.squareWidth;
            const y = (this.grid.squareHeight * cell.row) + this.grid.squareHeight;
            this.context.fillRect(x + 1, y + 1, this.grid.squareWidth, this.grid.squareHeight);
        }
        for (let link of cell.links) {
            [link] = link
            const cellScore = this.visited.get(link.id);
            const x = (this.grid.squareWidth * link.col + 1) + this.grid.squareWidth;
            const y = (this.grid.squareHeight * link.row + 1) + this.grid.squareHeight;
            if (cellScore === targetScore) {
                if (this.slowMo) {
                    setTimeout(() => {
                        this.context.fillRect(x, y, this.grid.squareWidth, this.grid.squareHeight);
                    }, this.stagger);
                    this.stagger += 100;
                } else {
                    this.context.fillRect(x, y, this.grid.squareWidth, this.grid.squareHeight);
                }
                this.fillShortestPath(link, targetScore - 1);
            }
        }
    }
}