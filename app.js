import Grid from './classes/Grid.js';

const maze = new Grid(4,4);
maze.setStart(4,1);
console.log(maze);

maze.draw();