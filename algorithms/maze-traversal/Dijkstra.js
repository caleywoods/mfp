import Walker from '../../classes/Walker.js';

export default class Dijkstra extends Walker {
    constructor(_grid, _config) {
        super(_grid, _config);
        this.visited = new Map();
        this.canvas = document.querySelector('#maze');
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = '#61D095';
        this.context.globalAlpha = .6;
        this.stagger = this.drawSpeed;
        this.solve();
    }

    solve() {
        const startTime = performance.now();

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

        this.assignDistance(startCell, 0);
        const endScore = this.visited.get(endCell.id);

        // Collect path from end to start, then reverse to get start -> end order
        const path = this.collectPath(endCell, endScore - 1);
        path.reverse();

        // Record metrics
        this.metrics.cellsVisited = this.visited.size;
        this.metrics.pathLength = path.length;
        this.metrics.timeMs = performance.now() - startTime;
        if (!this.skipDraw) {
            if (!this.skipMetricsDisplay) {
                this.displayMetrics();
            }
            this.drawPath(path);
        }
    }

    assignDistance(cell, distance) {
        if (!this.visited.has(cell.id)) {
            this.visited.set(cell.id, distance);

            if (this.showWeightedScores) {
                const x = (this.grid.squareWidth * cell.col) + this.grid.squareWidth;
                const y = (this.grid.squareHeight * cell.row) + this.grid.squareHeight;

                this.context.fillStyle = '#222529';
                this.context.globalAlpha = 1;

                if (distance > 99) {
                    this.context.fillText(distance, x + this.grid.squareWidth * .005, y + this.grid.squareHeight * .65);
                } else if (distance > 9) {
                    this.context.fillText(distance, x + this.grid.squareWidth * .1, y + this.grid.squareHeight * .65);
                } else {
                    this.context.font = '8px sans-serif';
                    this.context.fillText(distance, x + this.grid.squareWidth * .4, y + this.grid.squareHeight * .65);
                }
            }

            for (const link of cell.links.keys()) {
                this.assignDistance(link, distance + 1);
            }
        }

        if (this.showWeightedScores) {
            this.context.fillStyle = '#61D095';
            this.context.globalAlpha = .6;
        }
    }

    collectPath(cell, targetScore, path = []) {
        path.push(cell);

        for (const [link] of cell.links) {
            const cellScore = this.visited.get(link.id);
            if (cellScore === targetScore) {
                this.collectPath(link, targetScore - 1, path);
                break;
            }
        }

        return path;
    }

    drawPath(path) {
        const entrances = Array.from(this.grid.entrances.values());
        const startDirection = entrances.find(e => e.cell.isStart)?.direction;
        const endDirection = entrances.find(e => e.cell.isEnd)?.direction;

        for (let i = 0; i < path.length; i++) {
            const cell = path[i];
            const x = (this.grid.squareWidth * cell.col) + this.grid.squareWidth + 1;
            const y = (this.grid.squareHeight * cell.row) + this.grid.squareHeight + 1;
            const isStart = i === 0;
            const isEnd = i === path.length - 1;

            if (this.slowMo) {
                setTimeout(() => {
                    this.context.fillRect(x, y, this.grid.squareWidth, this.grid.squareHeight);
                    if (isStart && startDirection) {
                        this.drawArrow(this.context, x, y, startDirection, this.grid.squareWidth, true);
                    }
                    if (isEnd && endDirection) {
                        this.drawArrow(this.context, x, y, endDirection, this.grid.squareWidth, false);
                    }
                }, this.stagger);
                this.stagger += this.drawSpeed;
            } else {
                this.context.fillRect(x, y, this.grid.squareWidth, this.grid.squareHeight);
                if (isStart && startDirection) {
                    this.drawArrow(this.context, x, y, startDirection, this.grid.squareWidth, true);
                }
                if (isEnd && endDirection) {
                    this.drawArrow(this.context, x, y, endDirection, this.grid.squareWidth, false);
                }
            }
        }
    }
}
