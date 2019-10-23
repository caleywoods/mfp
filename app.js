import Grid from './classes/Grid.js';
import BinaryTree from './algorithms/maze-generation/BinaryTree.js';
import Sidewinder from './algorithms/maze-generation/Sidewinder.js';
import Dijkstra from './algorithms/maze-traversal/Dijkstra.js';

// Cell size in pixels
const gridConfig = {
    showIDs: false,
    squareHeight: 30,
    squareWidth: 30
};

const maze = new Sidewinder(10, 10, gridConfig);

const solverConfig = {
    showWeightedScores: false,
    slowMo: true
};

maze.create();
// const solver = new Dijkstra(maze, solverConfig);

const saveAsImage = () => {
    canvasToImage('maze', {
        name: `Maze-${Math.floor(Math.random() * 1000)}`,
        type: 'png',
        quality: 1
    });
}

const saveBtn = document.querySelector('#save-maze-btn');
saveBtn.addEventListener('click', saveAsImage, false);