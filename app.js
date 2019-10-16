import Grid from './classes/Grid.js';

const gridConfig = {
    squareHeight: 50,
    squareWidth: 50
};

const maze = new Grid(10, 10, gridConfig);
console.log(maze);

// @TODO: Make these able to be set via mouse click
// maze.setStart(4, 1);
// maze.setEnd(1, 4);

maze.draw();