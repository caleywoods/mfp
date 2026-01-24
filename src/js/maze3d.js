import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// DOM Elements
const canvas = document.getElementById('maze-container');
const instructions = document.getElementById('instructions');
const crosshair = document.getElementById('crosshair');

// Load maze data from localStorage
const mazeDataString = localStorage.getItem('mazeData');
let mazeData = null;

if (mazeDataString) {
    try {
        mazeData = JSON.parse(mazeDataString);
        console.log('Loaded maze:', mazeData.rows, 'x', mazeData.cols);
    } catch (e) {
        console.error('Failed to parse maze data:', e);
    }
}

// Scene setup
const scene = new THREE.Scene();

// Create procedural skybox
function createSkybox() {
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0077be) },
            bottomColor: { value: new THREE.Color(0x1a1a2e) },
            offset: { value: 20 },
            exponent: { value: 0.4 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    return new THREE.Mesh(skyGeo, skyMat);
}

const skybox = createSkybox();
scene.add(skybox);

// Fog that matches sky gradient
scene.fog = new THREE.Fog(0x1a1a2e, 15, 80);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 1.6, 2); // Player height ~1.6 units

// Renderer with improved antialiasing
const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; // Higher quality shadows
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 30, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 150;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.bias = -0.0001;
directionalLight.shadow.radius = 2; // Soft shadow edges
scene.add(directionalLight);

// Controls
const controls = new PointerLockControls(camera, document.body);

// Movement state
const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false
};
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveSpeed = 5.0;

// Collision detection
const wallBoundingBoxes = [];
const PLAYER_RADIUS = 0.3;

// Drop-in animation state
let isDropping = true;
let dropStartTime = 0;
const DROP_DURATION = 2.0; // seconds
const DROP_HEIGHT = 25;
const PLAYER_HEIGHT = 1.6;
let targetPosition = new THREE.Vector3(2, PLAYER_HEIGHT, 2);
let spawnYaw = 0; // Rotation to face open corridor

// Pointer lock events
controls.addEventListener('lock', () => {
    if (!isDropping) {
        instructions.classList.add('hidden');
        crosshair.classList.remove('hidden');
    }
});

controls.addEventListener('unlock', () => {
    instructions.classList.remove('hidden');
    crosshair.classList.add('hidden');
});

// Click to start
instructions.addEventListener('click', () => {
    if (isDropping) {
        // Start the drop animation
        dropStartTime = performance.now();
        instructions.classList.add('hidden');
    } else {
        controls.lock();
    }
});

// Keyboard controls
document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveState.forward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveState.backward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveState.left = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveState.right = true;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveState.forward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveState.backward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveState.left = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveState.right = false;
            break;
    }
});

// 3D Maze Configuration
const CELL_SIZE = 2;      // Size of each cell in world units
const WALL_HEIGHT = 3;    // Height of walls
const WALL_THICKNESS = 0.2;

// Minimap state
let minimapVisible = true;
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

// Solution path state
let solutionPath = [];
let solutionVisible = false;
let solutionMeshes = [];

// Build maze from loaded data or create test environment
function buildMaze() {
    if (!mazeData) {
        console.warn('No maze data found, creating test environment');
        createTestEnvironment();
        return;
    }

    const { rows, cols, cells, entrances } = mazeData;
    
    // Create a lookup map for cells by id
    const cellMap = new Map();
    cells.forEach(cell => cellMap.set(cell.id, cell));

    // Floor with texture pattern
    const floorWidth = cols * CELL_SIZE;
    const floorDepth = rows * CELL_SIZE;
    const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth);
    
    // Create procedural floor texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 128;
    floorCanvas.height = 128;
    const floorCtx = floorCanvas.getContext('2d');
    floorCtx.fillStyle = '#3a3a3a';
    floorCtx.fillRect(0, 0, 128, 128);
    floorCtx.fillStyle = '#444444';
    floorCtx.fillRect(2, 2, 60, 60);
    floorCtx.fillRect(66, 66, 60, 60);
    floorCtx.fillStyle = '#4a4a4a';
    floorCtx.fillRect(66, 2, 60, 60);
    floorCtx.fillRect(2, 66, 60, 60);
    
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(cols, rows);
    
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        roughness: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(floorWidth / 2, 0, floorDepth / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Wall material with procedural texture
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 64;
    wallCanvas.height = 128;
    const wallCtx = wallCanvas.getContext('2d');
    // Stone-like gradient
    const gradient = wallCtx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, '#7a7a7a');
    gradient.addColorStop(0.5, '#666666');
    gradient.addColorStop(1, '#555555');
    wallCtx.fillStyle = gradient;
    wallCtx.fillRect(0, 0, 64, 128);
    // Add some noise/texture
    wallCtx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 64;
        const y = Math.random() * 128;
        wallCtx.fillRect(x, y, 2, 2);
    }
    // Horizontal lines for bricks
    wallCtx.strokeStyle = 'rgba(0,0,0,0.2)';
    wallCtx.lineWidth = 1;
    for (let y = 0; y < 128; y += 32) {
        wallCtx.beginPath();
        wallCtx.moveTo(0, y);
        wallCtx.lineTo(64, y);
        wallCtx.stroke();
    }
    
    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        roughness: 0.8
    });

    // Create entrance lookup
    const entranceMap = new Map();
    entrances.forEach(e => entranceMap.set(e.cellId, e.direction));

    // Build walls for each cell
    cells.forEach(cell => {
        const { row, col, links, isStart, isEnd } = cell;
        const entranceDir = entranceMap.get(cell.id);
        
        // Cell center position in 3D space
        // Note: row 0 is at the "top" (north) in 2D, maps to z=0 in 3D
        const cellX = col * CELL_SIZE + CELL_SIZE / 2;
        const cellZ = row * CELL_SIZE + CELL_SIZE / 2;

        // Check each direction for walls
        // North wall (row - 1)
        const northId = row > 0 ? (row - 1) * cols + col : null;
        const hasNorthLink = northId !== null && links.includes(northId);
        if (!hasNorthLink && entranceDir !== 'north') {
            addWall(cellX, cellZ - CELL_SIZE / 2, 'horizontal');
        }

        // South wall (row + 1) - only on boundary
        if (row === rows - 1 && entranceDir !== 'south') {
            addWall(cellX, cellZ + CELL_SIZE / 2, 'horizontal');
        }

        // West wall (col - 1)
        const westId = col > 0 ? row * cols + (col - 1) : null;
        const hasWestLink = westId !== null && links.includes(westId);
        if (!hasWestLink && entranceDir !== 'west') {
            addWall(cellX - CELL_SIZE / 2, cellZ, 'vertical');
        }

        // East wall (col + 1) - only on boundary
        if (col === cols - 1 && entranceDir !== 'east') {
            addWall(cellX + CELL_SIZE / 2, cellZ, 'vertical');
        }

        // Add start/end markers
        if (isStart) {
            addMarker(cellX, cellZ, 0x61D095);
            // Set target position for drop-in animation
            targetPosition.set(cellX, PLAYER_HEIGHT, cellZ);
            // Position camera high above for drop-in
            camera.position.set(cellX, DROP_HEIGHT, cellZ);
            camera.lookAt(cellX, 0, cellZ);
            
            // Determine which direction has an open corridor
            // Check links to find an open passage
            const startCell = cell;
            if (links.includes(cell.id - 1) && col > 0) {
                // West is open
                spawnYaw = Math.PI / 2;
            } else if (links.includes(cell.id + 1) && col < cols - 1) {
                // East is open
                spawnYaw = -Math.PI / 2;
            } else if (links.includes(cell.id - cols) && row > 0) {
                // North is open
                spawnYaw = Math.PI;
            } else if (links.includes(cell.id + cols) && row < rows - 1) {
                // South is open
                spawnYaw = 0;
            } else if (entranceDir === 'north') {
                // Entrance is north, face south (into maze)
                spawnYaw = 0;
            } else if (entranceDir === 'south') {
                // Entrance is south, face north
                spawnYaw = Math.PI;
            } else if (entranceDir === 'west') {
                // Entrance is west, face east
                spawnYaw = -Math.PI / 2;
            } else if (entranceDir === 'east') {
                // Entrance is east, face west
                spawnYaw = Math.PI / 2;
            }
        }
        if (isEnd) {
            addMarker(cellX, cellZ, 0xFB5D55);
        }
    });

    function addWall(x, z, orientation) {
        let geometry;
        let halfWidth, halfDepth;
        if (orientation === 'horizontal') {
            geometry = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
            halfWidth = CELL_SIZE / 2;
            halfDepth = WALL_THICKNESS / 2;
        } else {
            geometry = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE);
            halfWidth = WALL_THICKNESS / 2;
            halfDepth = CELL_SIZE / 2;
        }
        const wall = new THREE.Mesh(geometry, wallMaterial);
        wall.position.set(x, WALL_HEIGHT / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);

        // Store bounding box for collision detection
        wallBoundingBoxes.push({
            minX: x - halfWidth,
            maxX: x + halfWidth,
            minZ: z - halfDepth,
            maxZ: z + halfDepth
        });
    }

    function addMarker(x, z, color) {
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const material = new THREE.MeshStandardMaterial({ color });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(x, 0.05, z);
        scene.add(marker);
    }

    console.log('Maze built:', rows, 'x', cols, 'cells');
}

// Fallback test environment
function createTestEnvironment() {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        roughness: 0.6
    });

    const wallGeometry = new THREE.BoxGeometry(1, 3, 0.2);
    
    const wallPositions = [
        { x: 5, z: 0, rotY: 0 },
        { x: -5, z: 0, rotY: 0 },
        { x: 0, z: 5, rotY: Math.PI / 2 },
        { x: 0, z: -5, rotY: Math.PI / 2 },
    ];

    wallPositions.forEach(pos => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(pos.x, 1.5, pos.z);
        wall.rotation.y = pos.rotY;
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
    });

    const startGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const startMaterial = new THREE.MeshStandardMaterial({ color: 0x61D095 });
    const startMarker = new THREE.Mesh(startGeometry, startMaterial);
    startMarker.position.set(2, 0.05, 2);
    scene.add(startMarker);

    const endGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const endMaterial = new THREE.MeshStandardMaterial({ color: 0xFB5D55 });
    const endMarker = new THREE.Mesh(endGeometry, endMaterial);
    endMarker.position.set(-2, 0.05, -2);
    scene.add(endMarker);
}

buildMaze();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let prevTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Handle drop-in animation
    if (isDropping && dropStartTime > 0) {
        const elapsed = (time - dropStartTime) / 1000;
        const progress = Math.min(elapsed / DROP_DURATION, 1);
        
        // Easing function (ease out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate camera position
        const currentY = DROP_HEIGHT - (DROP_HEIGHT - PLAYER_HEIGHT) * eased;
        camera.position.y = currentY;
        
        // Gradually rotate camera from looking down to looking forward
        const lookDownAngle = Math.PI / 2; // 90 degrees down
        const currentAngle = lookDownAngle * (1 - eased);
        camera.rotation.x = -currentAngle;
        
        if (progress >= 1) {
            isDropping = false;
            camera.position.y = PLAYER_HEIGHT;
            camera.rotation.set(0, spawnYaw, 0);
            // Show instructions to click for pointer lock
            instructions.querySelector('h2').textContent = 'Ready!';
            instructions.querySelector('.click-prompt').textContent = 'Click to explore';
            instructions.classList.remove('hidden');
        }
    }

    if (controls.isLocked && !isDropping) {
        // Calculate movement direction
        direction.z = Number(moveState.forward) - Number(moveState.backward);
        direction.x = Number(moveState.right) - Number(moveState.left);
        direction.normalize();

        // Store old position for collision resolution
        const oldX = camera.position.x;
        const oldZ = camera.position.z;

        // Apply movement
        if (moveState.forward || moveState.backward) {
            velocity.z = direction.z * moveSpeed * delta;
            controls.moveForward(velocity.z);
        }
        if (moveState.left || moveState.right) {
            velocity.x = direction.x * moveSpeed * delta;
            controls.moveRight(velocity.x);
        }

        // Collision detection - check new position against walls
        const newX = camera.position.x;
        const newZ = camera.position.z;

        for (const box of wallBoundingBoxes) {
            // Expand box by player radius for circle-box collision
            const expandedMinX = box.minX - PLAYER_RADIUS;
            const expandedMaxX = box.maxX + PLAYER_RADIUS;
            const expandedMinZ = box.minZ - PLAYER_RADIUS;
            const expandedMaxZ = box.maxZ + PLAYER_RADIUS;

            if (newX > expandedMinX && newX < expandedMaxX &&
                newZ > expandedMinZ && newZ < expandedMaxZ) {
                // Collision detected - resolve by pushing back
                // Try X-only movement
                if (!(newX > expandedMinX && newX < expandedMaxX &&
                      oldZ > expandedMinZ && oldZ < expandedMaxZ)) {
                    camera.position.z = oldZ;
                }
                // Try Z-only movement
                else if (!(oldX > expandedMinX && oldX < expandedMaxX &&
                           newZ > expandedMinZ && newZ < expandedMaxZ)) {
                    camera.position.x = oldX;
                }
                // Both blocked, revert fully
                else {
                    camera.position.x = oldX;
                    camera.position.z = oldZ;
                }
            }
        }
    }

    // Update minimap
    if (minimapVisible && minimapCtx && mazeData) {
        drawMinimap();
    }

    prevTime = time;
    renderer.render(scene, camera);
}

animate();

// Minimap drawing
function drawMinimap() {
    const { rows, cols, cells, entrances } = mazeData;
    const mapSize = minimapCanvas.width;
    const cellSize = mapSize / Math.max(rows, cols);
    
    // Clear
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, mapSize, mapSize);

    // Create entrance lookup
    const entranceMap = new Map();
    entrances.forEach(e => entranceMap.set(e.cellId, e.direction));

    // Draw walls
    minimapCtx.strokeStyle = '#888';
    minimapCtx.lineWidth = 1;
    minimapCtx.beginPath();

    cells.forEach(cell => {
        const { row, col, links, isStart, isEnd } = cell;
        const entranceDir = entranceMap.get(cell.id);
        const x = col * cellSize;
        const y = row * cellSize;

        // North wall
        const northId = row > 0 ? (row - 1) * cols + col : null;
        const hasNorthLink = northId !== null && links.includes(northId);
        if (!hasNorthLink && entranceDir !== 'north') {
            minimapCtx.moveTo(x, y);
            minimapCtx.lineTo(x + cellSize, y);
        }

        // South wall (boundary only)
        if (row === rows - 1 && entranceDir !== 'south') {
            minimapCtx.moveTo(x, y + cellSize);
            minimapCtx.lineTo(x + cellSize, y + cellSize);
        }

        // West wall
        const westId = col > 0 ? row * cols + (col - 1) : null;
        const hasWestLink = westId !== null && links.includes(westId);
        if (!hasWestLink && entranceDir !== 'west') {
            minimapCtx.moveTo(x, y);
            minimapCtx.lineTo(x, y + cellSize);
        }

        // East wall (boundary only)
        if (col === cols - 1 && entranceDir !== 'east') {
            minimapCtx.moveTo(x + cellSize, y);
            minimapCtx.lineTo(x + cellSize, y + cellSize);
        }

        // Draw start/end markers
        if (isStart) {
            minimapCtx.fillStyle = '#61D095';
            minimapCtx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }
        if (isEnd) {
            minimapCtx.fillStyle = '#FB5D55';
            minimapCtx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }
    });

    minimapCtx.stroke();

    // Draw player position
    const playerMapX = (camera.position.x / CELL_SIZE) * cellSize;
    const playerMapZ = (camera.position.z / CELL_SIZE) * cellSize;

    // Player direction indicator
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    const angle = Math.atan2(dir.x, -dir.z);

    minimapCtx.save();
    minimapCtx.translate(playerMapX, playerMapZ);
    minimapCtx.rotate(angle);

    // Draw player as triangle
    minimapCtx.fillStyle = '#fff';
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, -cellSize * 0.4);
    minimapCtx.lineTo(-cellSize * 0.25, cellSize * 0.2);
    minimapCtx.lineTo(cellSize * 0.25, cellSize * 0.2);
    minimapCtx.closePath();
    minimapCtx.fill();

    minimapCtx.restore();
}

// Toggle minimap with M key
document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') {
        minimapVisible = !minimapVisible;
        if (minimapCanvas) {
            minimapCanvas.style.display = minimapVisible ? 'block' : 'none';
        }
    }
    // Toggle solution path with P key
    if (event.code === 'KeyP') {
        toggleSolutionPath();
    }
});

// Solve maze using Dijkstra and return path
function solveMaze() {
    if (!mazeData) return [];
    
    const { rows, cols, cells, entrances } = mazeData;
    
    // Build adjacency from cell links
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
    
    // Reconstruct path
    const path = [];
    let current = endCell.id;
    while (current !== undefined) {
        const cell = cellMap.get(current);
        if (cell) path.unshift(cell);
        current = previous.get(current);
    }
    
    return path;
}

// Create 3D path visualization
function createSolutionMeshes(path) {
    // Clear existing meshes
    solutionMeshes.forEach(mesh => scene.remove(mesh));
    solutionMeshes = [];
    
    if (path.length === 0) return;
    
    const pathMaterial = new THREE.MeshStandardMaterial({
        color: 0x61D095,
        transparent: true,
        opacity: 0.6,
        emissive: 0x61D095,
        emissiveIntensity: 0.3
    });
    
    // Create path segments
    for (let i = 0; i < path.length; i++) {
        const cell = path[i];
        const x = cell.col * CELL_SIZE + CELL_SIZE / 2;
        const z = cell.row * CELL_SIZE + CELL_SIZE / 2;
        
        // Create a flat box for each cell in path
        const geometry = new THREE.BoxGeometry(CELL_SIZE * 0.6, 0.05, CELL_SIZE * 0.6);
        const mesh = new THREE.Mesh(geometry, pathMaterial);
        mesh.position.set(x, 0.03, z);
        mesh.receiveShadow = true;
        scene.add(mesh);
        solutionMeshes.push(mesh);
        
        // Add connecting segments between cells
        if (i < path.length - 1) {
            const nextCell = path[i + 1];
            const nextX = nextCell.col * CELL_SIZE + CELL_SIZE / 2;
            const nextZ = nextCell.row * CELL_SIZE + CELL_SIZE / 2;
            
            const midX = (x + nextX) / 2;
            const midZ = (z + nextZ) / 2;
            const dx = nextX - x;
            const dz = nextZ - z;
            const length = Math.sqrt(dx * dx + dz * dz);
            
            const connectorGeo = new THREE.BoxGeometry(
                dx !== 0 ? length * 0.3 : CELL_SIZE * 0.3,
                0.05,
                dz !== 0 ? length * 0.3 : CELL_SIZE * 0.3
            );
            const connector = new THREE.Mesh(connectorGeo, pathMaterial);
            connector.position.set(midX, 0.03, midZ);
            scene.add(connector);
            solutionMeshes.push(connector);
        }
    }
    
    console.log('Solution path created:', path.length, 'cells');
}

// Toggle solution visibility
function toggleSolutionPath() {
    solutionVisible = !solutionVisible;
    
    if (solutionVisible) {
        if (solutionPath.length === 0) {
            solutionPath = solveMaze();
            createSolutionMeshes(solutionPath);
        } else {
            // Show existing meshes
            solutionMeshes.forEach(mesh => mesh.visible = true);
        }
    } else {
        // Hide meshes
        solutionMeshes.forEach(mesh => mesh.visible = false);
    }
    
    console.log('Solution path:', solutionVisible ? 'visible' : 'hidden');
}

console.log('3D Maze initialized. Click to start exploring! Press M for minimap, P for solution path.');
