import Walker from '../../classes/Walker.js';

export default class AStar extends Walker {
    constructor(_grid, _config) {
        super(_grid, _config);
        this.canvas = document.querySelector('#maze');
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = '#61D095';
        this.context.globalAlpha = .6;
        this.stagger = this.drawSpeed;
        this.solve();
    }

    solve() {
        const startTime = performance.now();

        const [start, end] = Array.from(this.grid.entrances.entries());
        const {cell: startCell} = start[1];
        const {cell: endCell} = end[1];

        // A* data structures
        const openSet = new Set([startCell]);
        const cameFrom = new Map();
        const gScore = new Map(); // Cost from start to node
        const fScore = new Map(); // gScore + heuristic

        gScore.set(startCell.id, 0);
        fScore.set(startCell.id, this.heuristic(startCell, endCell));

        let cellsVisited = 0;

        while (openSet.size > 0) {
            // Get node with lowest fScore
            let current = null;
            let lowestF = Infinity;
            for (const cell of openSet) {
                const f = fScore.get(cell.id) ?? Infinity;
                if (f < lowestF) {
                    lowestF = f;
                    current = cell;
                }
            }

            cellsVisited++;

            if (current === endCell) {
                // Reconstruct path
                const path = this.reconstructPath(cameFrom, current);

                // Record metrics
                this.metrics.cellsVisited = cellsVisited;
                this.metrics.pathLength = path.length;
                this.metrics.timeMs = performance.now() - startTime;
                if (!this.skipDraw) {
                    if (!this.skipMetricsDisplay) {
                        this.displayMetrics();
                    }
                    this.drawPath(path);
                }
                return;
            }

            openSet.delete(current);

            // Check all linked neighbors
            for (const neighbor of current.links.keys()) {
                const tentativeG = (gScore.get(current.id) ?? Infinity) + 1;

                if (tentativeG < (gScore.get(neighbor.id) ?? Infinity)) {
                    cameFrom.set(neighbor.id, current);
                    gScore.set(neighbor.id, tentativeG);
                    fScore.set(neighbor.id, tentativeG + this.heuristic(neighbor, endCell));

                    if (!openSet.has(neighbor)) {
                        openSet.add(neighbor);
                    }
                }
            }
        }

        // No path found
        console.error('A* could not find a path');
    }

    heuristic(cell, goal) {
        // Manhattan distance
        return Math.abs(cell.row - goal.row) + Math.abs(cell.col - goal.col);
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(current.id)) {
            current = cameFrom.get(current.id);
            path.unshift(current);
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
