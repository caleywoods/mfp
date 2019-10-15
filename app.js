const maze_canvas = document.querySelector('#maze');
const context     = maze_canvas.getContext('2d');

const wh = [100,100];

context.strokeStyle = 'blue';
context.lineWidth = 5;

// Column 1
context.strokeRect(50,50,...wh);
context.strokeRect(50,150, ...wh);
context.strokeRect(50,250,...wh);
context.strokeRect(50,350,...wh);

// Column 2
context.strokeRect(150,50,...wh);
context.strokeRect(150,150, ...wh);
context.strokeRect(150,250, ...wh);
context.strokeRect(150,350, ...wh);

// Column 3
context.strokeRect(250,50,...wh);
context.strokeRect(250,150,...wh);
context.strokeRect(250,250,...wh);
context.strokeRect(250,350,...wh);

// Column 4
context.strokeRect(350,50,...wh);
context.strokeRect(350,150,...wh);
context.strokeRect(350,250,...wh);
context.strokeRect(350,350,...wh);

console.log(maze_canvas);
console.log(context);