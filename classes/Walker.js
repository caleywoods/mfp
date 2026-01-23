export default class Walker {
    constructor(_grid, _config) {
        this.grid = _grid;
        this.metrics = {
            algorithm: this.constructor.name,
            cellsVisited: 0,
            pathLength: 0,
            timeMs: 0
        };

        if (_config) {
            Object.entries(_config).forEach(entry => {
                const [prop, val] = entry;

                this[prop] = val;
            });
        }
    }

    getEfficiency() {
        if (this.metrics.cellsVisited === 0) return 0;
        return (this.metrics.pathLength / this.metrics.cellsVisited * 100).toFixed(1);
    }

    displayMetrics() {
        const statsEl = document.querySelector('#solver-stats');
        if (!statsEl) return;

        // Reveal the stats bar with transition
        statsEl.classList.remove('max-h-0', 'opacity-0');
        statsEl.classList.add('max-h-12', 'opacity-100');

        statsEl.innerHTML = `
            <span class="font-semibold">${this.metrics.algorithm}</span>
            <span class="text-slate-500">|</span>
            <span class="cursor-help" title="Total cells explored to find the path. Lower is better — smarter algorithms explore fewer cells.">Cells visited: <span class="font-medium">${this.metrics.cellsVisited}</span></span>
            <span class="text-slate-500">|</span>
            <span class="cursor-help" title="Number of cells in the solution path. Lower means a shorter route.">Path length: <span class="font-medium">${this.metrics.pathLength}</span></span>
            <span class="text-slate-500">|</span>
            <span class="cursor-help" title="Percentage of visited cells that ended up in the final path. Higher means less wasted exploration.">Efficiency: <span class="font-medium">${this.getEfficiency()}%</span></span>
            <span class="text-slate-500">|</span>
            <span class="cursor-help" title="Time to compute the solution. Lower is faster.">Time: <span class="font-medium">${this.metrics.timeMs.toFixed(2)}ms</span></span>
        `;
    }

    draw() {
        // Draw the solution into the maze
    }

    drawArrow(ctx, x, y, direction, size, isEntrance = false) {
        const halfSize = size / 2;
        const arrowSize = size * 0.4;
        // Add 0.5px offset for crisp rendering on pixel boundaries
        let centerX = Math.floor(x + halfSize) + 0.5;
        let centerY = Math.floor(y + halfSize) + 0.5;

        // For entrance arrows, position outside the cell and point inward
        if (isEntrance) {
            switch (direction) {
                case 'north':
                    centerY = Math.floor(y - halfSize) + 0.5; // Above the cell
                    break;
                case 'south':
                    centerY = Math.floor(y + size + halfSize) + 0.5; // Below the cell
                    break;
                case 'east':
                    centerX = Math.floor(x + size + halfSize) + 0.5; // Right of the cell
                    break;
                case 'west':
                    centerX = Math.floor(x - halfSize) + 0.5; // Left of the cell
                    break;
            }
        }

        ctx.save();
        // High contrast: dark color with stroke for visibility
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();

        // For entrance, flip direction to point toward exit (into the maze)
        const drawDirection = isEntrance ? this.getOppositeDirection(direction) : direction;

        switch (drawDirection) {
            case 'north':
                ctx.moveTo(centerX, centerY - arrowSize);
                ctx.lineTo(centerX - arrowSize, centerY + arrowSize * 0.5);
                ctx.lineTo(centerX + arrowSize, centerY + arrowSize * 0.5);
                break;
            case 'south':
                ctx.moveTo(centerX, centerY + arrowSize);
                ctx.lineTo(centerX - arrowSize, centerY - arrowSize * 0.5);
                ctx.lineTo(centerX + arrowSize, centerY - arrowSize * 0.5);
                break;
            case 'east':
                ctx.moveTo(centerX + arrowSize, centerY);
                ctx.lineTo(centerX - arrowSize * 0.5, centerY - arrowSize);
                ctx.lineTo(centerX - arrowSize * 0.5, centerY + arrowSize);
                break;
            case 'west':
                ctx.moveTo(centerX - arrowSize, centerY);
                ctx.lineTo(centerX + arrowSize * 0.5, centerY - arrowSize);
                ctx.lineTo(centerX + arrowSize * 0.5, centerY + arrowSize);
                break;
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    getOppositeDirection(direction) {
        const opposites = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east'
        };
        return opposites[direction];
    }
}