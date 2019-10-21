export default class Walker {
    constructor(_grid, _config) {
        this.grid = _grid;

        if (_config) {
            Object.entries(_config).forEach(entry => {
                const [prop, val] = entry;

                this[prop] = val;
            });
        }
    }

    draw() {
        // Draw the solution into the maze
    }
}