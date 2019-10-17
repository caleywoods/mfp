export default class Cell {
    constructor(id, row, col) {
        this.isStart = false;
        this.isEnd = false;
        this.id = id;
        this.neighbors = {
            'north': null,
            'east': null,
            'south': null,
            'west': null
        };
        this.row = row;
        this.col = col;
        this.links = new Map();
    }

    link(cell, bidirectional = true) {
        this.links.set(cell, true);

        if (bidirectional) {
            // Link this cell to the other one, passing bidirectional false to avoid a loop.
            cell.link(this, false);
        }
    }

    unlink(cell, bidirectional = true) {
        this.links.delete(cell);

        if (bidirectional) {
            cell.unlink(this, false);
        }
    }

    isLinked(cell) {
        return this.links.has(cell);
    }
}