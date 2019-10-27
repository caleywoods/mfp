import Wilson from '../../algorithms/maze-generation/Wilson.js';

// Cell size in pixels
const gridConfig = {
    showIDs: false,
    squareHeight: 30,
    squareWidth: 30
};

const maze = new Wilson(30, 45, gridConfig);

maze.create();

const saveAsImage = () => {
    canvasToImage('maze', {
        name: `Maze-${Math.floor(Math.random() * 1000)}`,
        type: 'png',
        quality: 1
    });
}
