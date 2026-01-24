import AldousBroder from '../../algorithms/maze-generation/AldousBroder.js';
import BinaryTree from '../../algorithms/maze-generation/BinaryTree.js';
import Sidewinder from '../../algorithms/maze-generation/Sidewinder.js';
import Wilson from '../../algorithms/maze-generation/Wilson.js';
import Dijkstra from '../../algorithms/maze-traversal/Dijkstra.js';
import AStar from '../../algorithms/maze-traversal/AStar.js';

// Cell size in pixels
const gridConfig = {
    cols: 10,
    rows: 10,
    showIDs: false,
    squareHeight: 20,
    squareWidth: 20
};

const solverConfig = {
    algorithm: 'Dijkstra',
    drawSpeed: 100,
    showWeightedScores: false,
    slowMo: true
};

const resizeMazeCanvas = (config) => {
    const maze_canvas = document.querySelector('#maze');

    const cellW = Number(config.squareWidth) || 20;
    const cellH = Number(config.squareHeight) || 20;
    const cols = Number(config.cols) || 10;
    const rows = Number(config.rows) || 10;

    const paddingX = cellW;
    const paddingY = cellH;

    const nextWidth = (cols * cellW) + paddingX;
    const nextHeight = (rows * cellH) + paddingY;

    if (maze_canvas.width !== nextWidth) {
        maze_canvas.width = nextWidth;
    }

    if (maze_canvas.height !== nextHeight) {
        maze_canvas.height = nextHeight;
    }
};

let maze = null;

// Check if returning from 3D view with existing maze data
const savedMazeData = localStorage.getItem('mazeData');
if (savedMazeData) {
    // Restore the saved maze instead of generating a new one
    try {
        const mazeJson = JSON.parse(savedMazeData);
        // Update gridConfig to match saved maze
        gridConfig.rows = mazeJson.rows;
        gridConfig.cols = mazeJson.cols;
        
        // Create maze with saved dimensions
        maze = new Wilson(gridConfig.rows, gridConfig.cols, gridConfig);
        resizeMazeCanvas(gridConfig);
        
        // Rebuild the links from saved data
        const cellMap = new Map();
        maze.cells.flat().forEach(cell => cellMap.set(cell.id, cell));
        
        mazeJson.cells.forEach(savedCell => {
            const cell = cellMap.get(savedCell.id);
            if (cell) {
                cell.isStart = savedCell.isStart;
                cell.isEnd = savedCell.isEnd;
                // Restore links
                savedCell.links.forEach(linkedId => {
                    const linkedCell = cellMap.get(linkedId);
                    if (linkedCell && !cell.links.has(linkedCell)) {
                        cell.link(linkedCell);
                    }
                });
            }
        });
        
        // Restore entrances
        mazeJson.entrances.forEach(entrance => {
            const cell = cellMap.get(entrance.cellId);
            if (cell) {
                maze.entrances.set(entrance.cellId, { direction: entrance.direction, cell });
            }
        });
        
        maze.draw();
        console.log('Restored maze from localStorage');
    } catch (e) {
        console.error('Failed to restore maze:', e);
        // Fall back to generating new maze
        maze = new Wilson(gridConfig.rows, gridConfig.cols, gridConfig);
        resizeMazeCanvas(gridConfig);
        maze.create();
    }
} else {
    // No saved maze, generate a new one
    maze = new Wilson(gridConfig.rows, gridConfig.cols, gridConfig);
    resizeMazeCanvas(gridConfig);
    maze.create();
}

document.querySelector('#solve-btn').addEventListener('click', () => {
    // Redraw the maze to clear any previous solution
    const maze_canvas = document.querySelector('#maze');
    const context = maze_canvas.getContext('2d');
    context.clearRect(0, 0, maze_canvas.width, maze_canvas.height);
    maze.draw();

    // Hide comparison table, will show single solver stats
    const comparisonTable = document.querySelector('#comparison-table');
    comparisonTable.classList.add('max-h-0', 'opacity-0');
    comparisonTable.classList.remove('max-h-96', 'opacity-100');

    // Get algorithm from quick dropdown
    const algorithm = document.querySelector('#quick-solve-algo').value;

    switch (algorithm) {
        case 'A*':
            new AStar(maze, solverConfig);
            break;
        case 'Dijkstra':
        default:
            new Dijkstra(maze, solverConfig);
            break;
    }
});

const generateMaze = (algo) => {
    // Clear saved maze data when generating a new one
    localStorage.removeItem('mazeData');
    
    // Hide comparison table and solver stats when generating new maze
    const comparisonTable = document.querySelector('#comparison-table');
    comparisonTable.classList.add('max-h-0', 'opacity-0');
    comparisonTable.classList.remove('max-h-96', 'opacity-100');

    const statsEl = document.querySelector('#solver-stats');
    statsEl.classList.add('max-h-0', 'opacity-0');
    statsEl.classList.remove('max-h-12', 'opacity-100');

    const maze_canvas = document.querySelector('#maze');
    resizeMazeCanvas(gridConfig);
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

document.querySelector('#compare-btn').addEventListener('click', () => {
    // Hide single solver stats, show comparison table
    const statsEl = document.querySelector('#solver-stats');
    statsEl.classList.add('max-h-0', 'opacity-0');
    statsEl.classList.remove('max-h-12', 'opacity-100');

    const comparisonTable = document.querySelector('#comparison-table');
    const comparisonBody = document.querySelector('#comparison-body');

    // Clear previous results
    comparisonBody.innerHTML = '';

    // Config for comparison (no animation, no drawing)
    const compareConfig = {
        ...solverConfig,
        slowMo: false,
        skipDraw: true
    };

    const algorithms = [
        { name: 'Dijkstra', solver: Dijkstra },
        { name: 'A*', solver: AStar }
    ];

    const results = [];
    let winningSolver = null;
    let bestCellsVisited = Infinity;

    for (const algo of algorithms) {
        // Clear and redraw maze for fair comparison
        const maze_canvas = document.querySelector('#maze');
        const context = maze_canvas.getContext('2d');
        context.clearRect(0, 0, maze_canvas.width, maze_canvas.height);
        maze.draw();

        const solver = new algo.solver(maze, compareConfig);
        results.push({
            name: algo.name,
            ...solver.metrics
        });

        // Track the winner (fewest cells visited)
        if (solver.metrics.cellsVisited < bestCellsVisited) {
            bestCellsVisited = solver.metrics.cellsVisited;
            winningSolver = algo.solver;
        }
    }

    // Find best values for highlighting
    const bestVisited = Math.min(...results.map(r => r.cellsVisited));
    const bestPath = Math.min(...results.map(r => r.pathLength));
    const bestEfficiency = Math.max(...results.map(r => r.pathLength / r.cellsVisited));
    const bestTime = Math.min(...results.map(r => r.timeMs));

    // Sort results by cells visited (winner on top)
    results.sort((a, b) => a.cellsVisited - b.cellsVisited);

    // Render results
    for (const result of results) {
        const efficiency = (result.pathLength / result.cellsVisited * 100).toFixed(1);
        const isEfficiencyBest = (result.pathLength / result.cellsVisited) === bestEfficiency;

        const row = document.createElement('tr');
        row.className = 'border-t border-slate-200';
        row.innerHTML = `
            <td class="px-4 py-2 font-medium">${result.name}</td>
            <td class="px-4 py-2 ${result.cellsVisited === bestVisited ? 'text-emerald-600 font-semibold' : ''}">${result.cellsVisited}</td>
            <td class="px-4 py-2 ${result.pathLength === bestPath ? 'text-emerald-600 font-semibold' : ''}">${result.pathLength}</td>
            <td class="px-4 py-2 ${isEfficiencyBest ? 'text-emerald-600 font-semibold' : ''}">${efficiency}%</td>
            <td class="px-4 py-2 ${result.timeMs === bestTime ? 'text-emerald-600 font-semibold' : ''}">${result.timeMs.toFixed(2)}</td>
        `;
        comparisonBody.appendChild(row);
    }

    // Reveal comparison table
    comparisonTable.classList.remove('max-h-0', 'opacity-0');
    comparisonTable.classList.add('max-h-96', 'opacity-100');

    // Draw the solution path from the winning algorithm (but don't show single solver stats)
    if (winningSolver) {
        const drawConfig = {
            ...solverConfig,
            skipDraw: false,
            skipMetricsDisplay: true
        };
        new winningSolver(maze, drawConfig);
    }
});

document.querySelector('#options-btn').addEventListener('click', () => {
    const modal = document.querySelector('.modal');
    modal.classList.remove('hidden');
});

const modalClosers = Array.from(document.querySelectorAll('.modal-card-head button, .modal-background, #cancel-options-btn'));

modalClosers.forEach(element => {
    element.addEventListener('click', () => {
        const modal = document.querySelector('.modal');
        modal.classList.add('hidden');
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
    modal.classList.add('hidden');
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

// Enter Maze 3D button
document.querySelector('#enter-maze-btn').addEventListener('click', () => {
    if (!maze) {
        alert('Please generate a maze first!');
        return;
    }
    
    // Serialize maze data to localStorage
    const mazeData = maze.toJSON();
    
    // Precompute solution path using Dijkstra before navigating
    const solutionPath = computeSolutionPath(mazeData);
    mazeData.solutionPath = solutionPath;
    
    localStorage.setItem('mazeData', JSON.stringify(mazeData));
    
    // Navigate to 3D maze page
    window.location.href = '/maze3d.html';
});

// Compute solution path using Dijkstra's algorithm
function computeSolutionPath(mazeData) {
    const { rows, cols, cells } = mazeData;
    
    // Build cell lookup
    const cellMap = new Map();
    cells.forEach(c => cellMap.set(c.id, c));
    
    // Find start and end cells
    let startCell = null;
    let endCell = null;
    cells.forEach(c => {
        if (c.isStart) startCell = c;
        if (c.isEnd) endCell = c;
    });
    
    if (!startCell || !endCell) {
        console.warn('No start or end cell found');
        return [];
    }
    
    // Dijkstra's algorithm
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set(cells.map(c => c.id));
    
    distances.set(startCell.id, 0);
    
    while (unvisited.size > 0) {
        // Find unvisited cell with smallest distance
        let currentId = null;
        let minDist = Infinity;
        for (const id of unvisited) {
            const dist = distances.get(id) ?? Infinity;
            if (dist < minDist) {
                minDist = dist;
                currentId = id;
            }
        }
        
        if (currentId === null || minDist === Infinity) break;
        if (currentId === endCell.id) break;
        
        unvisited.delete(currentId);
        const current = cellMap.get(currentId);
        
        // Check all linked neighbors
        for (const linkedId of current.links) {
            if (!unvisited.has(linkedId)) continue;
            const alt = minDist + 1;
            const existingDist = distances.get(linkedId) ?? Infinity;
            if (alt < existingDist) {
                distances.set(linkedId, alt);
                previous.set(linkedId, currentId);
            }
        }
    }
    
    // Reconstruct path (just store cell IDs for efficiency)
    const path = [];
    let current = endCell.id;
    while (current !== undefined) {
        path.unshift(current);
        current = previous.get(current);
    }
    
    console.log('Solution path computed:', path.length, 'cells');
    return path;
}
