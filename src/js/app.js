import AldousBroder from '../../algorithms/maze-generation/AldousBroder.js';
import BinaryTree from '../../algorithms/maze-generation/BinaryTree.js';
import Sidewinder from '../../algorithms/maze-generation/Sidewinder.js';
import Wilson from '../../algorithms/maze-generation/Wilson.js';
import Dijkstra from '../../algorithms/maze-traversal/Dijkstra.js';

// Cell size in pixels
const gridConfig = {
    cols: 10,
    rows: 10,
    showIDs: false,
    squareHeight: 20,
    squareWidth: 20
};

const solverConfig = {
    drawSpeed: 100,
    showWeightedScores: false,
    slowMo: true
};

let maze = new Wilson(gridConfig.rows, gridConfig.cols, gridConfig);
maze.create()

document.querySelector('#solve-btn').addEventListener('click', () => {
    new Dijkstra(maze, solverConfig);
});

const generateMaze = (algo) => {
    const maze_canvas = document.querySelector('#maze');
    const context = maze_canvas.getContext('2d');

    context.clearRect(0, 0, maze_canvas.width, maze_canvas.height);

    switch(algo) {
        case 'Aldous Broder':
            maze = new AldousBroder(gridConfig.rows, gridConfig.cols, gridConfig);
            break;
        case 'Binary Tree':
            maze = new BinaryTree(gridConfig.rows, gridConfig.cols, gridConfig);
            break;
        case 'Sidewinder':
            maze = new Sidewinder(gridConfig.rows, gridConfig.cols, gridConfig);
            break;
        case 'Wilson':
            maze = new Wilson(gridConfig.rows, gridConfig.cols, gridConfig);
            break;
        default:
            maze = new Wilson(gridConfig.rows, gridConfig.cols, gridConfig);
    }

    maze.create();
};

document.querySelector('#generate-btn').addEventListener('click', () => {
    const generatorAlgo = document.querySelector('#maze-gen-algo').selectedOptions[0].value;
    generateMaze(generatorAlgo);
});

document.querySelector('#options-btn').addEventListener('click', () => {
    const modal = document.querySelector('.modal');
    modal.classList.add('is-active');
});

const modalClosers = Array.from(document.querySelectorAll('.modal-card-head button, #cancel-options-btn'));

modalClosers.forEach(element => {
    element.addEventListener('click', () => {
        const modal = document.querySelector('.modal');
        modal.classList.remove('is-active');
    });
});

document.querySelector('#save-options-btn').addEventListener('click', () => {
    // Maze options
    const generatorAlgo = document.querySelector('#maze-gen-algo').selectedOptions[0].value;
    const rows = document.querySelector('#rows').value;
    const cols = document.querySelector('#cols').value;
    const cellSize = document.querySelector('#cell-pixel-size').value;
    const showIDs = document.querySelector('#show-ids').checked;

    gridConfig.rows = Number(rows) || 43;
    gridConfig.cols = Number(cols) || 75;
    gridConfig.squareHeight = Number(cellSize) || 20;
    gridConfig.squareWidth = Number(cellSize) || 20;
    gridConfig.showIDs = showIDs;

    // Solve options
    const slowMode = document.querySelector('#slow-mode').checked;
    const showWeights = document.querySelector('#show-weights').checked;
    let drawSpeed = document.querySelector('#solve-speed').selectedOptions[0].value;

    switch (drawSpeed) {
        case 'Fast':
            drawSpeed = 25;
            break;
        case 'Medium':
            drawSpeed = 50;
            break;
        case 'Sloth-like':
            drawSpeed = 1000;
            break;
        case 'Slow':
            drawSpeed = 100;
            break;
        case 'Ludicrous':
            drawSpeed = 1;
            break;
        default:
            drawSpeed = 100;
    }

    console.log('Draw speed: ', drawSpeed);

    solverConfig.drawSpeed = drawSpeed;
    solverConfig.showWeightedScores = showWeights;
    solverConfig.slowMo = slowMode;

    generateMaze(generatorAlgo);

    const modal = document.querySelector('.modal');
    modal.classList.remove('is-active');
});

const quickCellSizeButtons = Array.from(document.querySelectorAll('.cell-size-increase'));

quickCellSizeButtons.forEach(element => {
    element.addEventListener('click', () => {
        const cellSizeInput = document.querySelector('#cell-pixel-size');
        cellSizeInput.value = element.dataset.amount;
    });
});

const saveAsImage = () => {
    canvasToImage('maze', {
        name: `Maze-${Math.floor(Math.random() * 1000)}`,
        type: 'png',
        quality: 1
    });
}
