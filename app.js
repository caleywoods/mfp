import Grid from './classes/Grid.js';

const gridConfig = {
    squareHeight: 100,
    squareWidth: 100
};

const maze = new Grid(8, 10, gridConfig);

maze.setStart(4, 1);
maze.setEnd(8, 10);

maze.draw();