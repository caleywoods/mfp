import Grid from './classes/Grid.js';

const gridConfig = {
    squareHeight: 100,
    squareWidth: 100
};

const maze = new Grid(4,4, gridConfig);

maze.setStart(4,1);
maze.setEnd(1, 4);

maze.draw();