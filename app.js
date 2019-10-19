import Grid from './classes/Grid.js';
import BinaryTree from './algorithms/maze-generation/BinaryTree.js';

// Cell size in pixels
const gridConfig = {
    squareHeight: 20,
    squareWidth: 20
};

// const maze = new Grid(10, 10, gridConfig);
const maze = new BinaryTree(25, 35, gridConfig);

// @TODO: Make these able to be set via mouse click
// maze.setStart(4, 1);
// maze.setEnd(1, 4);

maze.draw();