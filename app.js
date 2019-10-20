import Grid from './classes/Grid.js';
import BinaryTree from './algorithms/maze-generation/BinaryTree.js';
import Sidewinder from './algorithms/maze-generation/Sidewinder.js';

// Cell size in pixels
const gridConfig = {
    squareHeight: 25,
    squareWidth: 25
};

// const maze = new BinaryTree(25, 35, gridConfig);
const maze = new Sidewinder(25, 35, gridConfig);

maze.create();