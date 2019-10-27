'use strict';

var _AldousBroder = require('../algorithms/maze-generation/AldousBroder.js');

var _AldousBroder2 = _interopRequireDefault(_AldousBroder);

var _BinaryTree = require('../algorithms/maze-generation/BinaryTree.js');

var _BinaryTree2 = _interopRequireDefault(_BinaryTree);

var _Dijkstra = require('../algorithms/maze-traversal/Dijkstra.js');

var _Dijkstra2 = _interopRequireDefault(_Dijkstra);

var _Grid = require('../classes/Grid.js');

var _Grid2 = _interopRequireDefault(_Grid);

var _Sidewinder = require('../algorithms/maze-generation/Sidewinder.js');

var _Sidewinder2 = _interopRequireDefault(_Sidewinder);

var _Wilson = require('../algorithms/maze-generation/Wilson.js');

var _Wilson2 = _interopRequireDefault(_Wilson);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Cell size in pixels
var gridConfig = {
    showIDs: false,
    squareHeight: 30,
    squareWidth: 30
};

var maze = new _Wilson2.default(30, 45, gridConfig);

var solverConfig = {
    showWeightedScores: false,
    slowMo: true
};

maze.create();
var solver = new _Dijkstra2.default(maze, solverConfig);

var saveAsImage = function saveAsImage() {
    canvasToImage('maze', {
        name: 'Maze-' + Math.floor(Math.random() * 1000),
        type: 'png',
        quality: 1
    });
};

var saveBtn = document.querySelector('#save-maze-btn');
saveBtn.addEventListener('click', saveAsImage, false);