import Grid from './classes/Grid.js';
import BinaryTree from './algorithms/maze-generation/BinaryTree.js';
import Sidewinder from './algorithms/maze-generation/Sidewinder.js';

// Cell size in pixels
const gridConfig = {
    squareHeight: 25,
    squareWidth: 25
};

const maze = new BinaryTree(25, 35, gridConfig);

// @TODO: Make these able to be set via mouse click
// maze.setStart(4, 1);
// maze.setEnd(1, 4);

maze.create();