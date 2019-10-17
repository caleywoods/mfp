import Grid from './classes/Grid.js';
import BinaryTree from './algorithms/maze-generation/BinaryTree.js';

const gridConfig = {
    squareHeight: 50,
    squareWidth: 50
};

// const maze = new Grid(10, 10, gridConfig);
const maze = new BinaryTree(4, 4, gridConfig);
// console.log(maze);

// @TODO: Make these able to be set via mouse click
// maze.setStart(4, 1);
// maze.setEnd(1, 4);

// maze.draw();

// const maze_canvas = document.querySelector('#maze');
// const context = maze_canvas.getContext('2d');
// let wh = [100, 100];
// context.strokeStyle = '#222529';

// To stroke a vertical line our X argument will remain constant and only the Y axis changes
// context.beginPath();


// // Stroke West
// context.moveTo(50,50);
// context.lineTo(50,150);

// // Stroke East
// context.moveTo(100, 100);
// context.lineTo(100, 50);

// context.moveTo(100, 100);
// context.lineTo(150, 100);

// // Stroke North
// context.moveTo(100, 50);
// context.lineTo(50, 50)

// // Reposition in lower left corner
// context.moveTo(50, 100);

// context.moveTo(50, 150);
// context.lineTo(150, 150);

// context.moveTo(150, 150);
// context.lineTo(150, 200);

// context.lineTo(200, 200);

// context.lineTo(200, 100);
// context.lineTo(150, 100);

// // Actually draw on the canvas
// context.stroke();