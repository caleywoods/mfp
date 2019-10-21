import Grid from './classes/Grid.js';
import BinaryTree from './algorithms/maze-generation/BinaryTree.js';
import Sidewinder from './algorithms/maze-generation/Sidewinder.js';
import Dijkstra from './algorithms/maze-traversal/Dijkstra.js';

// Cell size in pixels
const gridConfig = {
    showIDs: false,
    squareHeight: 15,
    squareWidth: 15
};

const maze = new Sidewinder(40, 40, gridConfig);

const solverConfig = {
    showWeightedScores: false
};

maze.create();
const solver = new Dijkstra(maze, solverConfig);