import Wilson from '../../algorithms/maze-generation/Wilson.js';
import Dijkstra from '../../algorithms/maze-traversal/Dijkstra.js';

// Cell size in pixels
const gridConfig = {
    cols: 75,
    rows: 43,
    showIDs: false,
    squareHeight: 20,
    squareWidth: 20
};

const solverConfig = {
    showWeightedScores: false,
    slowMo: true
};

let maze = new Wilson(gridConfig.rows, gridConfig.cols, gridConfig);
maze.create()

document.querySelector('#solve-btn').addEventListener('click', () => {
    new Dijkstra(maze, solverConfig);
});

document.querySelector('#generate-btn').addEventListener('click', () => {
    const maze_canvas = document.querySelector('#maze');
    const context = maze_canvas.getContext('2d');

    context.clearRect(0, 0, maze_canvas.width, maze_canvas.height);

    maze = new Wilson(gridConfig.rows, gridConfig.cols, gridConfig);
    maze.create();
});

const saveAsImage = () => {
    canvasToImage('maze', {
        name: `Maze-${Math.floor(Math.random() * 1000)}`,
        type: 'png',
        quality: 1
    });
}
