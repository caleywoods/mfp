import Grid from './classes/Grid.js';
import BinaryTree from './algorithms/maze-generation/BinaryTree.js';
import Sidewinder from './algorithms/maze-generation/Sidewinder.js';
import Dijkstra from './algorithms/maze-traversal/Dijkstra.js';

// Cell size in pixels
const gridConfig = {
    showIDs: false,
    squareHeight: 25,
    squareWidth: 25
};

// const maze = new BinaryTree(175, 300, gridConfig);
const maze = new Sidewinder(10, 10, gridConfig);

maze.create();
const solver = new Dijkstra(maze);