import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

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

// Create procedural skybox - dark dungeon atmosphere
function createSkybox() {
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0a0a12) }, // Very dark blue-black
            bottomColor: { value: new THREE.Color(0x1a0a0a) }, // Dark reddish black
            offset: { value: 20 },
            exponent: { value: 0.6 }
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

// Fog - starts distant for top-down view, transitions to close dungeon fog
let fogNearTarget = 8;  // Final dungeon fog near
let fogFarTarget = 40;  // Final dungeon fog far
let fogNearStart = 50;  // Initial fog near (distant for top-down view)
let fogFarStart = 200;  // Initial fog far
scene.fog = new THREE.Fog(0x0a0808, fogNearStart, fogFarStart);

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

// Lighting - starts bright for top-down view, transitions to dungeon atmosphere
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Start bright
scene.add(ambientLight);
const ambientIntensityStart = 0.8;
const ambientIntensityTarget = 0.12; // Darker dungeon - wall torches provide extra light

// Overhead light - bright for overview, dim for dungeon
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
const directionalIntensityStart = 1.2;
const directionalIntensityTarget = 0.25; // Darker - rely more on torches
const directionalColorStart = new THREE.Color(0xffffff);
const directionalColorTarget = new THREE.Color(0x4466aa);
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
directionalLight.shadow.radius = 2;
scene.add(directionalLight);

// Player torch light (follows camera) - brighter for better visibility
const torchLight = new THREE.PointLight(0xff9955, 3.5, 22, 1.2);
torchLight.position.set(0, 0, 0);
camera.add(torchLight);

scene.add(camera); // Need to add camera to scene for child lights to work

// Controls
const controls = new PointerLockControls(camera, document.body);

// Movement state
const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false
};
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveSpeed = 5.0;
const sprintMultiplier = 1.6;

// Jump physics
let verticalVelocity = 0;
const GRAVITY = 20;
const JUMP_FORCE = 6;
let isOnGround = true;

// Collision detection
const wallBoundingBoxes = [];
const PLAYER_RADIUS = 0.3;

// Drop-in animation state
let isDropping = true;
let dropStartTime = 0;
const DROP_DURATION = 2.0; // seconds
let dropHeight = 25; // Will be calculated based on maze size
const PLAYER_HEIGHT = 1.6;
let targetPosition = new THREE.Vector3(2, PLAYER_HEIGHT, 2);
let dropStartPosition = new THREE.Vector3(2, 25, 2); // Starting position for drop-in
let spawnYaw = 0; // Rotation to face open corridor
let skipMenuAfterDrop = false; // Skip showing menu after regeneration

// Dungeon ambient music
const dungeonMusic = new Audio('/sounds/dungeon002.ogg');
dungeonMusic.loop = true;
dungeonMusic.volume = 0.4;
let musicPlaying = false;

function toggleMusic() {
    if (musicPlaying) {
        dungeonMusic.pause();
        musicPlaying = false;
        console.log('Music paused');
    } else {
        dungeonMusic.play().catch(e => console.log('Audio play failed:', e));
        musicPlaying = true;
        console.log('Music playing');
    }
}

// Walking sound effect
const walkingSound = new Audio('/sounds/walking.mp3');
walkingSound.loop = true;
walkingSound.volume = 0.5;
let isWalking = false;

// Victory sound effect
const victorySound = new Audio('/sounds/victory.mp3');
victorySound.volume = 0.7;
let hasWon = false;
let exitPosition = null; // Will be set when maze is built
let exitDirection = null; // Direction player must go to exit (north/south/east/west)

// Camera bob state
let bobTime = 0;
const BOB_SPEED = 12; // How fast the bob cycles
const BOB_AMOUNT = 0.06; // How much vertical movement

// Snow particle system
let snowParticles = null;
let snowEnabled = false;

function createSnowParticles() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = Math.random() * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        velocities[i] = 0.5 + Math.random() * 1.0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.userData.velocities = velocities;
    
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
    });
    
    snowParticles = new THREE.Points(geometry, material);
    snowParticles.visible = false;
    scene.add(snowParticles);
}

function toggleSnow() {
    snowEnabled = !snowEnabled;
    if (snowParticles) {
        snowParticles.visible = snowEnabled;
    }
    console.log('Snow:', snowEnabled ? 'enabled' : 'disabled');
}

function updateSnow() {
    if (!snowEnabled || !snowParticles) return;
    
    const positions = snowParticles.geometry.attributes.position.array;
    const velocities = snowParticles.geometry.userData.velocities;
    
    // Center snow around player
    const centerX = camera.position.x;
    const centerZ = camera.position.z;
    
    for (let i = 0; i < positions.length / 3; i++) {
        // Fall down
        positions[i * 3 + 1] -= velocities[i] * 0.1;
        
        // Slight drift
        positions[i * 3] += Math.sin(performance.now() * 0.001 + i) * 0.01;
        positions[i * 3 + 2] += Math.cos(performance.now() * 0.001 + i * 0.5) * 0.01;
        
        // Reset if below ground or too far from player
        if (positions[i * 3 + 1] < 0) {
            positions[i * 3] = centerX + (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = 30 + Math.random() * 20;
            positions[i * 3 + 2] = centerZ + (Math.random() - 0.5) * 100;
        }
    }
    
    snowParticles.geometry.attributes.position.needsUpdate = true;
}

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
    
    // Reset movement state when pointer lock is released
    // Prevents stuck movement if keys were held when ESC was pressed
    moveState.forward = false;
    moveState.backward = false;
    moveState.left = false;
    moveState.right = false;
    
    // Stop walking sound
    if (isWalking) {
        walkingSound.pause();
        walkingSound.currentTime = 0;
        isWalking = false;
    }
});

// Click to start
instructions.addEventListener('click', () => {
    if (isDropping) {
        // Start the drop animation
        dropStartTime = performance.now();
        instructions.classList.add('hidden');
        
        // Start music on first interaction (browsers require user gesture)
        if (!musicPlaying) {
            dungeonMusic.play().catch(e => console.log('Audio play failed:', e));
            musicPlaying = true;
        }
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
        case 'ShiftLeft':
        case 'ShiftRight':
            moveState.sprint = true;
            break;
        case 'Space':
            if (isOnGround) {
                verticalVelocity = JUMP_FORCE;
                isOnGround = false;
            }
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
        case 'ShiftLeft':
        case 'ShiftRight':
            moveState.sprint = false;
            break;
    }
});

// 3D Maze Configuration
const CELL_SIZE = 2;      // Size of each cell in world units
const WALL_HEIGHT = 3;    // Height of walls
const WALL_THICKNESS = 0.2;

// Minimap state
let minimapVisible = false;
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

// Solution path state
let solutionPath = [];
let solutionVisible = false;
let solutionMeshes = [];
let solutionMaterial = null; // Shader material for pulsing effect

// Hint state - wisp of light that travels along solution path
let hintVisible = false;
let hintTimeout = null;
let hintWisp = null; // Wisp mesh group
let hintWispPath = []; // Array of positions for wisp to follow
let hintWispProgress = 0; // Current progress along path (0-1)

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
    
    // Create procedural cobblestone floor texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 128;
    floorCanvas.height = 128;
    const floorCtx = floorCanvas.getContext('2d');
    
    // Dark mortar base
    floorCtx.fillStyle = '#1a1a1a';
    floorCtx.fillRect(0, 0, 128, 128);
    
    // Generate irregular cobblestones
    const stones = [];
    const stoneCount = 12 + Math.floor(Math.random() * 6);
    
    // Place stone centers with some randomness
    for (let i = 0; i < stoneCount; i++) {
        stones.push({
            x: (i % 4) * 32 + 8 + Math.random() * 16,
            y: Math.floor(i / 4) * 32 + 8 + Math.random() * 16,
            size: 18 + Math.random() * 12,
            shade: 0.5 + Math.random() * 0.3,
            vertices: 6 + Math.floor(Math.random() * 4)
        });
    }
    
    // Draw each cobblestone as irregular polygon
    stones.forEach(stone => {
        const baseGray = Math.floor(55 * stone.shade);
        
        // Draw stone shape
        floorCtx.beginPath();
        for (let v = 0; v < stone.vertices; v++) {
            const angle = (v / stone.vertices) * Math.PI * 2;
            const radiusVariation = 0.7 + Math.random() * 0.3;
            const px = stone.x + Math.cos(angle) * stone.size * 0.5 * radiusVariation;
            const py = stone.y + Math.sin(angle) * stone.size * 0.5 * radiusVariation;
            if (v === 0) floorCtx.moveTo(px, py);
            else floorCtx.lineTo(px, py);
        }
        floorCtx.closePath();
        
        // Fill with varied gray
        floorCtx.fillStyle = `rgb(${baseGray + 10}, ${baseGray + 8}, ${baseGray + 5})`;
        floorCtx.fill();
        
        // Darker edge/outline
        floorCtx.strokeStyle = `rgb(${baseGray - 15}, ${baseGray - 18}, ${baseGray - 20})`;
        floorCtx.lineWidth = 2;
        floorCtx.stroke();
        
        // Add surface texture - small specks
        for (let s = 0; s < 8; s++) {
            const sx = stone.x + (Math.random() - 0.5) * stone.size * 0.6;
            const sy = stone.y + (Math.random() - 0.5) * stone.size * 0.6;
            const speckBright = baseGray + (Math.random() - 0.5) * 25;
            floorCtx.fillStyle = `rgb(${speckBright}, ${speckBright - 2}, ${speckBright - 5})`;
            floorCtx.fillRect(sx, sy, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
    });
    
    // Add dirt/grime in mortar gaps
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const brown = 15 + Math.floor(Math.random() * 15);
        floorCtx.fillStyle = `rgba(${brown + 5}, ${brown}, ${brown - 5}, 0.6)`;
        floorCtx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    
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
    
    // Exterior ground (grass/dirt) around the maze - extends to forest
    const exteriorPadding = CELL_SIZE * 8; // How far the ground extends beyond maze
    const exteriorCanvas = document.createElement('canvas');
    exteriorCanvas.width = 128;
    exteriorCanvas.height = 128;
    const extCtx = exteriorCanvas.getContext('2d');
    
    // Base grass/dirt color
    extCtx.fillStyle = '#2a3a25';
    extCtx.fillRect(0, 0, 128, 128);
    
    // Add varied grass patches
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const green = 30 + Math.floor(Math.random() * 30);
        const brown = 20 + Math.floor(Math.random() * 15);
        extCtx.fillStyle = Math.random() > 0.3 
            ? `rgb(${brown}, ${green + 10}, ${brown - 5})`
            : `rgb(${brown + 10}, ${brown + 5}, ${brown - 10})`;
        extCtx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    
    // Add some darker patches (shadows/dirt)
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        extCtx.fillStyle = `rgba(15, 20, 12, 0.5)`;
        extCtx.beginPath();
        extCtx.arc(x, y, 3 + Math.random() * 8, 0, Math.PI * 2);
        extCtx.fill();
    }
    
    const exteriorTexture = new THREE.CanvasTexture(exteriorCanvas);
    exteriorTexture.wrapS = THREE.RepeatWrapping;
    exteriorTexture.wrapT = THREE.RepeatWrapping;
    exteriorTexture.repeat.set(8, 8);
    
    const exteriorMaterial = new THREE.MeshStandardMaterial({
        map: exteriorTexture,
        roughness: 1.0
    });
    
    // Create ground planes on all four sides of the maze
    const extWidth = floorWidth + exteriorPadding * 2;
    const extDepth = floorDepth + exteriorPadding * 2;
    const exteriorGeo = new THREE.PlaneGeometry(extWidth, extDepth);
    const exteriorGround = new THREE.Mesh(exteriorGeo, exteriorMaterial);
    exteriorGround.rotation.x = -Math.PI / 2;
    exteriorGround.position.set(floorWidth / 2, -0.01, floorDepth / 2); // Slightly below floor
    exteriorGround.receiveShadow = true;
    scene.add(exteriorGround);
    
    // Forest around the maze
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3525,
        roughness: 0.9
    });
    
    const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a4a2a,
        roughness: 0.8,
        flatShading: true
    });
    
    const darkFoliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x0f3318,
        roughness: 0.8,
        flatShading: true
    });
    
    const mazeCenterX = floorWidth / 2;
    const mazeCenterZ = floorDepth / 2;
    const forestMinDist = Math.max(floorWidth, floorDepth) * 0.55 + 3; // Start on grass near maze
    const forestMaxDist = Math.max(floorWidth, floorDepth) * 1.5;
    
    // Create forest around the maze
    const numTrees = 80;
    for (let i = 0; i < numTrees; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = forestMinDist + Math.random() * (forestMaxDist - forestMinDist);
        const x = mazeCenterX + Math.cos(angle) * dist;
        const z = mazeCenterZ + Math.sin(angle) * dist;
        
        const treeHeight = 4 + Math.random() * 8;
        const trunkHeight = treeHeight * 0.3;
        const trunkRadius = 0.15 + Math.random() * 0.15;
        
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
        trunk.position.set(x, trunkHeight / 2, z);
        scene.add(trunk);
        
        // Foliage - stacked cones for pine tree look
        const foliageMat = Math.random() > 0.5 ? foliageMaterial : darkFoliageMaterial;
        const numLayers = 2 + Math.floor(Math.random() * 2);
        for (let layer = 0; layer < numLayers; layer++) {
            const layerHeight = (treeHeight - trunkHeight) / numLayers;
            const layerRadius = (1.2 + Math.random() * 0.8) * (1 - layer * 0.25);
            const layerY = trunkHeight + layer * layerHeight * 0.7 + layerHeight / 2;
            
            const foliageGeo = new THREE.ConeGeometry(layerRadius, layerHeight, 6 + Math.floor(Math.random() * 3));
            const foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.position.set(x, layerY, z);
            foliage.rotation.y = Math.random() * Math.PI;
            scene.add(foliage);
        }
    }

    // Wall material - dark stone brick dungeon texture
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 128;
    wallCanvas.height = 128;
    const wallCtx = wallCanvas.getContext('2d');
    
    // Dark stone base
    wallCtx.fillStyle = '#2a2a2a';
    wallCtx.fillRect(0, 0, 128, 128);
    
    // Draw stone bricks
    const brickHeight = 32;
    const brickWidth = 64;
    wallCtx.strokeStyle = '#1a1a1a';
    wallCtx.lineWidth = 3;
    
    for (let row = 0; row < 4; row++) {
        const offset = (row % 2) * (brickWidth / 2);
        for (let col = -1; col < 3; col++) {
            const x = col * brickWidth + offset;
            const y = row * brickHeight;
            
            // Brick variation
            const shade = 0.15 + Math.random() * 0.15;
            wallCtx.fillStyle = `rgb(${Math.floor(42 * shade * 5)}, ${Math.floor(38 * shade * 5)}, ${Math.floor(35 * shade * 5)})`;
            wallCtx.fillRect(x + 2, y + 2, brickWidth - 4, brickHeight - 4);
            
            // Brick outline (mortar)
            wallCtx.strokeRect(x, y, brickWidth, brickHeight);
        }
    }
    
    // Add noise/weathering
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const brightness = Math.random() * 30;
        wallCtx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.3)`;
        wallCtx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    
    // Add dark streaks (soot/water damage) - vertical drips
    const streakCount = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < streakCount; i++) {
        const streakX = Math.random() * 128;
        const streakStartY = Math.random() * 40; // Start near top
        const streakLength = 40 + Math.random() * 80;
        const streakWidth = 3 + Math.random() * 8;
        
        // Draw streak with gradient fade
        for (let y = 0; y < streakLength; y++) {
            const progress = y / streakLength;
            const alpha = 0.15 * (1 - progress * 0.7); // Fade out towards bottom
            const wobble = Math.sin(y * 0.3) * 2; // Slight horizontal wobble
            const width = streakWidth * (1 - progress * 0.3); // Narrow towards bottom
            wallCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            wallCtx.fillRect(streakX + wobble - width/2, streakStartY + y, width, 1);
        }
    }
    
    // Add torch soot marks (darker areas where torches would be mounted)
    const sootCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < sootCount; i++) {
        const sootX = 20 + Math.random() * 88;
        const sootY = 10 + Math.random() * 30; // Upper portion of wall
        
        // Draw upward soot plume
        for (let dy = 0; dy < 35; dy++) {
            const spread = dy * 0.4;
            const alpha = 0.2 * (1 - dy / 35);
            for (let dx = -spread; dx <= spread; dx += 1) {
                if (Math.random() > 0.3) {
                    wallCtx.fillStyle = `rgba(0, 0, 0, ${alpha * Math.random()})`;
                    wallCtx.fillRect(sootX + dx + (Math.random() - 0.5) * 3, sootY - dy, 1, 1);
                }
            }
        }
    }
    
    // Add organic moss patches - clumps of green/brown pixels
    const mossClumpCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < mossClumpCount; i++) {
        // Moss tends to grow in lower, damper areas and in mortar cracks
        const clumpX = Math.random() * 128;
        const clumpY = 40 + Math.random() * 88; // Prefer lower half
        const clumpSize = 8 + Math.random() * 15;
        
        // Create organic clump shape with varied pixels
        const pixelCount = Math.floor(clumpSize * clumpSize * 0.4);
        for (let p = 0; p < pixelCount; p++) {
            // Organic distribution - denser in center
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * Math.random() * clumpSize; // Squared for center density
            const px = clumpX + Math.cos(angle) * dist;
            const py = clumpY + Math.sin(angle) * dist * 0.7; // Slightly flattened
            
            // Vary between greens and browns for organic look
            const colorChoice = Math.random();
            let r, g, b;
            if (colorChoice < 0.4) {
                // Dark green
                r = 20 + Math.floor(Math.random() * 25);
                g = 45 + Math.floor(Math.random() * 35);
                b = 15 + Math.floor(Math.random() * 20);
            } else if (colorChoice < 0.7) {
                // Olive/yellow-green
                r = 40 + Math.floor(Math.random() * 30);
                g = 50 + Math.floor(Math.random() * 30);
                b = 10 + Math.floor(Math.random() * 15);
            } else {
                // Brown/muddy
                r = 35 + Math.floor(Math.random() * 25);
                g = 30 + Math.floor(Math.random() * 20);
                b = 15 + Math.floor(Math.random() * 15);
            }
            
            // Vary alpha for depth
            const alpha = 0.5 + Math.random() * 0.5;
            wallCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            
            // Vary pixel size for texture
            const pixelSize = 1 + Math.floor(Math.random() * 2);
            wallCtx.fillRect(px, py, pixelSize, pixelSize);
        }
        
        // Add some scattered individual pixels around the clump for organic edges
        const scatterCount = Math.floor(pixelCount * 0.3);
        for (let s = 0; s < scatterCount; s++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = clumpSize + Math.random() * 6;
            const px = clumpX + Math.cos(angle) * dist;
            const py = clumpY + Math.sin(angle) * dist * 0.7;
            
            if (Math.random() > 0.5) {
                // Green scatter
                const g = 35 + Math.floor(Math.random() * 40);
                wallCtx.fillStyle = `rgba(25, ${g}, 15, ${0.3 + Math.random() * 0.4})`;
            } else {
                // Brown scatter
                wallCtx.fillStyle = `rgba(40, 32, 18, ${0.3 + Math.random() * 0.4})`;
            }
            wallCtx.fillRect(px, py, 1, 1);
        }
    }
    
    // Add moss in mortar lines (horizontal cracks between bricks)
    for (let row = 1; row < 4; row++) {
        const mortarY = row * brickHeight;
        if (Math.random() > 0.4) { // 60% chance per mortar line
            const startX = Math.random() * 60;
            const length = 20 + Math.random() * 50;
            for (let x = startX; x < startX + length; x += 1) {
                if (Math.random() > 0.4) {
                    const g = 40 + Math.floor(Math.random() * 35);
                    const yOffset = (Math.random() - 0.5) * 3;
                    wallCtx.fillStyle = `rgba(25, ${g}, 18, ${0.4 + Math.random() * 0.4})`;
                    wallCtx.fillRect(x, mortarY + yOffset, 1 + Math.random(), 1 + Math.random());
                }
            }
        }
    }
    
    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        roughness: 0.95,
        metalness: 0.05
    });

    // Create entrance lookup
    const entranceMap = new Map();
    entrances.forEach(e => entranceMap.set(e.cellId, e.direction));

    // Collect wall geometries for merging (performance optimization)
    const wallGeometries = [];
    const horizontalWallGeo = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    const verticalWallGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE);

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
            addWallGeometry(cellX, cellZ - CELL_SIZE / 2, 'horizontal');
        }

        // South wall (row + 1) - only on boundary
        if (row === rows - 1 && entranceDir !== 'south') {
            addWallGeometry(cellX, cellZ + CELL_SIZE / 2, 'horizontal');
        }

        // West wall (col - 1)
        const westId = col > 0 ? row * cols + (col - 1) : null;
        const hasWestLink = westId !== null && links.includes(westId);
        if (!hasWestLink && entranceDir !== 'west') {
            addWallGeometry(cellX - CELL_SIZE / 2, cellZ, 'vertical');
        }

        // East wall (col + 1) - only on boundary
        if (col === cols - 1 && entranceDir !== 'east') {
            addWallGeometry(cellX + CELL_SIZE / 2, cellZ, 'vertical');
        }

        // Add start/end markers
        if (isStart) {
            addMarker(cellX, cellZ, false);
            // Set target position for drop-in animation
            targetPosition.set(cellX, PLAYER_HEIGHT, cellZ);
            
            // Calculate drop height to see entire maze
            // Use FOV and maze dimensions to determine required height
            const mazeWidth = cols * CELL_SIZE;
            const mazeDepth = rows * CELL_SIZE;
            const maxDimension = Math.max(mazeWidth, mazeDepth);
            // With 75 degree FOV, we need height = dimension / (2 * tan(FOV/2))
            // Add some padding (1.2x) to ensure full visibility
            const fovRad = (75 / 2) * (Math.PI / 180);
            dropHeight = Math.max(25, (maxDimension / 2) / Math.tan(fovRad) * 1.2);
            
            // Adjust fog start values and targets for large mazes
            const requiredViewDistance = dropHeight * 1.5;
            if (requiredViewDistance > fogFarStart) {
                fogFarStart = requiredViewDistance + 50;
                fogNearStart = Math.max(30, dropHeight * 0.3);
                // Set initial fog for top-down view
                scene.fog.near = fogNearStart;
                scene.fog.far = fogFarStart;
                camera.far = Math.max(1000, fogFarStart + 100);
                camera.updateProjectionMatrix();
                console.log('Adjusted fog for large maze:', fogNearStart, '-', fogFarStart);
            }
            
            // Center camera over maze center for drop-in view
            const mazeCenterX = mazeWidth / 2;
            const mazeCenterZ = mazeDepth / 2;
            dropStartPosition.set(mazeCenterX, dropHeight, mazeCenterZ);
            
            camera.position.copy(dropStartPosition);
            camera.lookAt(mazeCenterX, 0, mazeCenterZ);
            
            // Spawn yaw will be set after solution path is loaded
            // to face along the solution path direction
        }
        if (isEnd) {
            addMarker(cellX, cellZ, true);
            // Store exit position and direction for victory detection
            exitPosition = new THREE.Vector3(cellX, PLAYER_HEIGHT, cellZ);
            exitDirection = entranceDir; // The direction the exit opens to
        }
    });

    // Helper to add wall geometry (for merging) and collision box
    function addWallGeometry(x, z, orientation) {
        let geometry;
        let halfWidth, halfDepth;
        if (orientation === 'horizontal') {
            geometry = horizontalWallGeo.clone();
            halfWidth = CELL_SIZE / 2;
            halfDepth = WALL_THICKNESS / 2;
        } else {
            geometry = verticalWallGeo.clone();
            halfWidth = WALL_THICKNESS / 2;
            halfDepth = CELL_SIZE / 2;
        }
        // Translate geometry to position (instead of mesh position)
        geometry.translate(x, WALL_HEIGHT / 2, z);
        wallGeometries.push(geometry);

        // Store bounding box for collision detection
        wallBoundingBoxes.push({
            minX: x - halfWidth,
            maxX: x + halfWidth,
            minZ: z - halfDepth,
            maxZ: z + halfDepth
        });
    }

    // Merge all wall geometries into a single mesh (huge performance boost)
    if (wallGeometries.length > 0) {
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(wallGeometries);
        const wallsMesh = new THREE.Mesh(mergedGeometry, wallMaterial);
        wallsMesh.castShadow = true;
        wallsMesh.receiveShadow = true;
        scene.add(wallsMesh);
        console.log('Merged', wallGeometries.length, 'walls into single mesh');
    }
    
    // Add random wall torches
    // Scale with maze size but cap at 15 to avoid overwhelming WebGL with point lights
    // For very large mazes, torches are spread out more
    const torchCount = Math.min(15, Math.max(4, Math.floor((rows * cols) / 20)));
    const torchPositions = [];
    
    // Collect valid wall positions for torches
    cells.forEach(cell => {
        const { row, col, links, isStart, isEnd } = cell;
        const cellX = col * CELL_SIZE + CELL_SIZE / 2;
        const cellZ = row * CELL_SIZE + CELL_SIZE / 2;
        const entranceDir = entranceMap.get(cell.id);
        
        // Skip entrance/exit cells entirely to avoid torches near rune markers
        if (isStart || isEnd) return;
        
        // Check each wall - add torch position if wall exists AND it's not an entrance opening
        const northId = row > 0 ? (row - 1) * cols + col : null;
        if ((northId === null || !links.includes(northId)) && entranceDir !== 'north') {
            torchPositions.push({ x: cellX, z: cellZ - CELL_SIZE / 2 + 0.3, side: 'north' });
        }
        const southId = row < rows - 1 ? (row + 1) * cols + col : null;
        if ((row === rows - 1 || (southId !== null && !links.includes(southId))) && entranceDir !== 'south') {
            torchPositions.push({ x: cellX, z: cellZ + CELL_SIZE / 2 - 0.3, side: 'south' });
        }
        const westId = col > 0 ? row * cols + (col - 1) : null;
        if ((westId === null || !links.includes(westId)) && entranceDir !== 'west') {
            torchPositions.push({ x: cellX - CELL_SIZE / 2 + 0.3, z: cellZ, side: 'west' });
        }
        const eastId = col < cols - 1 ? row * cols + (col + 1) : null;
        if ((col === cols - 1 || (eastId !== null && !links.includes(eastId))) && entranceDir !== 'east') {
            torchPositions.push({ x: cellX + CELL_SIZE / 2 - 0.3, z: cellZ, side: 'east' });
        }
    });
    
    // Randomly select torch positions
    const shuffled = torchPositions.sort(() => Math.random() - 0.5);
    const selectedTorches = shuffled.slice(0, torchCount);
    
    // Create torch meshes and lights
    const torchMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 0.9
    });
    const flameMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff4400,
        emissiveIntensity: 2.0
    });
    
    // Store flames and lights for animation
    const flameData = [];
    
    // First batch: torches WITH point lights (limited for performance)
    const litTorchCount = Math.min(12, selectedTorches.length);
    selectedTorches.slice(0, litTorchCount).forEach((pos, i) => {
        // Torch holder (small cylinder)
        const holderGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.3, 8);
        const holder = new THREE.Mesh(holderGeo, torchMaterial);
        holder.position.set(pos.x, 1.8, pos.z);
        scene.add(holder);
        
        // Flame (small sphere with emissive)
        const flameGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const flame = new THREE.Mesh(flameGeo, flameMaterial.clone());
        flame.position.set(pos.x, 2.0, pos.z);
        scene.add(flame);
        
        // Point light for the torch
        const wallTorchLight = new THREE.PointLight(0xff6622, 1.0, 8, 2);
        wallTorchLight.position.set(pos.x, 2.0, pos.z);
        scene.add(wallTorchLight);
        
        // Store for animation
        flameData.push({ flame, light: wallTorchLight, baseY: 2.0, phase: Math.random() * Math.PI * 2 });
    });
    
    // Additional visual-only torches for larger mazes (no point light, just emissive glow)
    const extraTorchCount = Math.min(25, Math.floor((rows * cols) / 12)) - litTorchCount;
    if (extraTorchCount > 0) {
        const extraTorches = shuffled.slice(litTorchCount, litTorchCount + extraTorchCount);
        extraTorches.forEach((pos, i) => {
            const holderGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.3, 8);
            const holder = new THREE.Mesh(holderGeo, torchMaterial);
            holder.position.set(pos.x, 1.8, pos.z);
            scene.add(holder);
            
            const flameGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const flame = new THREE.Mesh(flameGeo, flameMaterial.clone());
            flame.position.set(pos.x, 2.0, pos.z);
            scene.add(flame);
            
            // Store for animation (no light)
            flameData.push({ flame, light: null, baseY: 2.0, phase: Math.random() * Math.PI * 2 });
        });
        console.log('Added', litTorchCount, 'lit torches +', extraTorches.length, 'visual torches');
    } else {
        console.log('Added', litTorchCount, 'wall torches');
    }
    
    // Store flame data globally for animation
    window.flameData = flameData;

    function addMarker(x, z, isExit) {
        const markerGroup = new THREE.Group();
        
        if (isExit) {
            // Exit: Glowing rune circle with skull-like pattern
            // Stone ring base
            const ringGeo = new THREE.RingGeometry(0.5, 0.7, 32);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x2a2020,
                roughness: 0.9,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.02;
            markerGroup.add(ring);
            
            // Inner glowing circle
            const glowGeo = new THREE.CircleGeometry(0.45, 32);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x991111,
                transparent: true,
                opacity: 0.6
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.rotation.x = -Math.PI / 2;
            glow.position.y = 0.03;
            markerGroup.add(glow);
            
            // Rune symbols (simple crossed lines)
            const runeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
            const runeGeo = new THREE.BoxGeometry(0.6, 0.02, 0.05);
            const rune1 = new THREE.Mesh(runeGeo, runeMat);
            rune1.position.y = 0.04;
            markerGroup.add(rune1);
            const rune2 = new THREE.Mesh(runeGeo, runeMat);
            rune2.rotation.y = Math.PI / 2;
            rune2.position.y = 0.04;
            markerGroup.add(rune2);
            const rune3 = new THREE.Mesh(runeGeo, runeMat);
            rune3.rotation.y = Math.PI / 4;
            rune3.position.y = 0.04;
            markerGroup.add(rune3);
            const rune4 = new THREE.Mesh(runeGeo, runeMat);
            rune4.rotation.y = -Math.PI / 4;
            rune4.position.y = 0.04;
            markerGroup.add(rune4);
        } else {
            // Entrance: Glowing rune circle (similar style to exit but green/teal)
            // Stone ring base
            const ringGeo = new THREE.RingGeometry(0.5, 0.7, 32);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x252a25,
                roughness: 0.9,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.02;
            markerGroup.add(ring);
            
            // Inner glowing circle
            const glowGeo = new THREE.CircleGeometry(0.45, 32);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x115533,
                transparent: true,
                opacity: 0.6
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.rotation.x = -Math.PI / 2;
            glow.position.y = 0.03;
            markerGroup.add(glow);
            
            // Rune symbols (simple crossed lines) - green/teal
            const runeMat = new THREE.MeshBasicMaterial({ color: 0x33aa77 });
            const runeGeo = new THREE.BoxGeometry(0.6, 0.02, 0.05);
            const rune1 = new THREE.Mesh(runeGeo, runeMat);
            rune1.position.y = 0.04;
            markerGroup.add(rune1);
            const rune2 = new THREE.Mesh(runeGeo, runeMat);
            rune2.rotation.y = Math.PI / 2;
            rune2.position.y = 0.04;
            markerGroup.add(rune2);
            const rune3 = new THREE.Mesh(runeGeo, runeMat);
            rune3.rotation.y = Math.PI / 4;
            rune3.position.y = 0.04;
            markerGroup.add(rune3);
            const rune4 = new THREE.Mesh(runeGeo, runeMat);
            rune4.rotation.y = -Math.PI / 4;
            rune4.position.y = 0.04;
            markerGroup.add(rune4);
        }
        
        markerGroup.position.set(x, 0, z);
        scene.add(markerGroup);
    }

    console.log('Maze built:', rows, 'x', cols, 'cells');
    
    // Load precomputed solution path from mazeData (computed before navigation)
    if (mazeData.solutionPath && mazeData.solutionPath.length > 0) {
        // Convert cell IDs back to cell objects
        const cellMap = new Map();
        cells.forEach(c => cellMap.set(c.id, c));
        solutionPath = mazeData.solutionPath.map(id => cellMap.get(id)).filter(c => c);
        console.log('Solution path loaded:', solutionPath.length, 'cells');
    } else {
        // Fallback: compute if not precomputed (e.g., after regeneration)
        solutionPath = solveMaze();
        console.log('Solution path computed:', solutionPath.length, 'cells');
    }
    
    // Set spawn yaw to face along the solution path (into the maze)
    if (solutionPath.length >= 2) {
        const startCell = solutionPath[0];
        const nextCell = solutionPath[1];
        const startX = startCell.col * CELL_SIZE + CELL_SIZE / 2;
        const startZ = startCell.row * CELL_SIZE + CELL_SIZE / 2;
        const nextX = nextCell.col * CELL_SIZE + CELL_SIZE / 2;
        const nextZ = nextCell.row * CELL_SIZE + CELL_SIZE / 2;
        // atan2(x, z) gives angle from +Z axis, but camera looks down -Z
        // So we need to add PI to face the direction we want to go
        spawnYaw = Math.atan2(nextX - startX, nextZ - startZ) + Math.PI;
        console.log('Spawn yaw set to face solution path:', spawnYaw);
    }
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

    // Simple markers for test environment
    const startMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a32 });
    const startGeometry = new THREE.CylinderGeometry(0.5, 0.55, 0.08, 8);
    const startMarker = new THREE.Mesh(startGeometry, startMaterial);
    startMarker.position.set(2, 0.04, 2);
    scene.add(startMarker);

    const endMaterial = new THREE.MeshBasicMaterial({ color: 0x991111, transparent: true, opacity: 0.6 });
    const endGeometry = new THREE.CircleGeometry(0.5, 32);
    const endMarker = new THREE.Mesh(endGeometry, endMaterial);
    endMarker.rotation.x = -Math.PI / 2;
    endMarker.position.set(-2, 0.03, -2);
    scene.add(endMarker);
}

buildMaze();
createSnowParticles();

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
        
        // Interpolate camera position from center (dropStartPosition) to target (start cell)
        const currentX = dropStartPosition.x + (targetPosition.x - dropStartPosition.x) * eased;
        const currentY = dropHeight - (dropHeight - PLAYER_HEIGHT) * eased;
        const currentZ = dropStartPosition.z + (targetPosition.z - dropStartPosition.z) * eased;
        camera.position.set(currentX, currentY, currentZ);
        
        // Transition fog from distant (top-down view) to close (dungeon atmosphere)
        scene.fog.near = fogNearStart + (fogNearTarget - fogNearStart) * eased;
        scene.fog.far = fogFarStart + (fogFarTarget - fogFarStart) * eased;
        
        // Transition lighting from bright (overview) to dark (dungeon)
        ambientLight.intensity = ambientIntensityStart + (ambientIntensityTarget - ambientIntensityStart) * eased;
        directionalLight.intensity = directionalIntensityStart + (directionalIntensityTarget - directionalIntensityStart) * eased;
        directionalLight.color.lerpColors(directionalColorStart, directionalColorTarget, eased);
        
        // Gradually rotate camera from looking down to looking forward
        // Also smoothly rotate yaw towards the spawn direction
        const lookDownAngle = Math.PI / 2; // 90 degrees down
        const currentPitch = lookDownAngle * (1 - eased);
        const currentYaw = spawnYaw * eased; // Smoothly interpolate yaw from 0 to spawnYaw
        
        camera.rotation.order = 'YXZ'; // Ensure proper rotation order
        camera.rotation.x = -currentPitch;
        camera.rotation.y = currentYaw;
        
        if (progress >= 1) {
            isDropping = false;
            camera.position.set(targetPosition.x, PLAYER_HEIGHT, targetPosition.z);
            camera.rotation.set(0, spawnYaw, 0);
            
            if (skipMenuAfterDrop) {
                // After regeneration, auto-lock controls without showing menu
                skipMenuAfterDrop = false;
                controls.lock();
            } else {
                // Show instructions to click for pointer lock
                instructions.querySelector('h2').textContent = 'Ready!';
                instructions.querySelector('.click-prompt').textContent = 'Click to explore';
                instructions.classList.remove('hidden');
            }
        }
    }

    if (controls.isLocked && !isDropping) {
        // Calculate movement direction
        direction.z = Number(moveState.forward) - Number(moveState.backward);
        direction.x = Number(moveState.right) - Number(moveState.left);
        direction.normalize();
        
        // Check if player is moving
        const moving = moveState.forward || moveState.backward || moveState.left || moveState.right;
        
        // Walking sound with fade-out and sprint speed adjustment
        if (moving && !isWalking) {
            walkingSound.volume = 0.5;
            walkingSound.playbackRate = moveState.sprint ? 1.4 : 1.0;
            walkingSound.play().catch(e => {});
            isWalking = true;
        } else if (moving && isWalking) {
            // Adjust playback rate when sprint state changes
            walkingSound.playbackRate = moveState.sprint ? 1.4 : 1.0;
        } else if (!moving && isWalking) {
            // Fade out over ~50ms instead of abrupt stop
            const fadeOut = () => {
                if (walkingSound.volume > 0.05) {
                    walkingSound.volume -= 0.15;
                    setTimeout(fadeOut, 15);
                } else {
                    walkingSound.pause();
                    walkingSound.currentTime = 0;
                    walkingSound.volume = 0.5;
                }
            };
            fadeOut();
            isWalking = false;
        }
        
        // Jump physics
        if (!isOnGround) {
            verticalVelocity -= GRAVITY * delta;
            camera.position.y += verticalVelocity * delta;
            
            // Land on ground
            if (camera.position.y <= PLAYER_HEIGHT) {
                camera.position.y = PLAYER_HEIGHT;
                verticalVelocity = 0;
                isOnGround = true;
            }
        }
        
        // Camera bob when walking (only on ground)
        if (moving && isOnGround) {
            const bobSpeed = moveState.sprint ? BOB_SPEED * 1.5 : BOB_SPEED;
            bobTime += delta * bobSpeed;
            const bobOffset = Math.sin(bobTime) * BOB_AMOUNT;
            camera.position.y = PLAYER_HEIGHT + bobOffset;
        } else if (isOnGround) {
            // Smoothly return to normal height when stopped
            bobTime = 0;
            camera.position.y += (PLAYER_HEIGHT - camera.position.y) * 0.1;
        }

        // Store old position for collision resolution
        const oldX = camera.position.x;
        const oldZ = camera.position.z;

        // Calculate current speed (sprint or normal)
        const currentSpeed = moveState.sprint ? moveSpeed * sprintMultiplier : moveSpeed;

        // Apply movement
        if (moveState.forward || moveState.backward) {
            velocity.z = direction.z * currentSpeed * delta;
            controls.moveForward(velocity.z);
        }
        if (moveState.left || moveState.right) {
            velocity.x = direction.x * currentSpeed * delta;
            controls.moveRight(velocity.x);
        }

        // Collision detection - check new position against walls
        let posX = camera.position.x;
        let posZ = camera.position.z;
        let collisionResolved = false;

        for (const box of wallBoundingBoxes) {
            // Expand box by player radius for circle-box collision
            const expandedMinX = box.minX - PLAYER_RADIUS;
            const expandedMaxX = box.maxX + PLAYER_RADIUS;
            const expandedMinZ = box.minZ - PLAYER_RADIUS;
            const expandedMaxZ = box.maxZ + PLAYER_RADIUS;

            if (posX > expandedMinX && posX < expandedMaxX &&
                posZ > expandedMinZ && posZ < expandedMaxZ) {
                // Collision detected - resolve by pushing back
                // Try keeping X movement, revert Z
                const xOnlyCollides = posX > expandedMinX && posX < expandedMaxX &&
                                      oldZ > expandedMinZ && oldZ < expandedMaxZ;
                // Try keeping Z movement, revert X
                const zOnlyCollides = oldX > expandedMinX && oldX < expandedMaxX &&
                                      posZ > expandedMinZ && posZ < expandedMaxZ;
                
                if (!xOnlyCollides && zOnlyCollides) {
                    // X movement is safe, revert Z
                    posZ = oldZ;
                } else if (xOnlyCollides && !zOnlyCollides) {
                    // Z movement is safe, revert X
                    posX = oldX;
                } else {
                    // Both blocked or neither works, revert fully
                    posX = oldX;
                    posZ = oldZ;
                    collisionResolved = true;
                    break; // Can't move at all, stop checking
                }
            }
        }
        
        // Apply final position
        camera.position.x = posX;
        camera.position.z = posZ;
        
        // Check for victory (stepped through exit)
        if (!hasWon && exitPosition && exitDirection) {
            // Check if player has stepped past the exit boundary
            let steppedThrough = false;
            const margin = 0.5; // How far past the exit cell center
            
            switch (exitDirection) {
                case 'north':
                    steppedThrough = camera.position.z < exitPosition.z - CELL_SIZE / 2 - margin;
                    break;
                case 'south':
                    steppedThrough = camera.position.z > exitPosition.z + CELL_SIZE / 2 + margin;
                    break;
                case 'west':
                    steppedThrough = camera.position.x < exitPosition.x - CELL_SIZE / 2 - margin;
                    break;
                case 'east':
                    steppedThrough = camera.position.x > exitPosition.x + CELL_SIZE / 2 + margin;
                    break;
            }
            
            if (steppedThrough) {
                hasWon = true;
                victorySound.play().catch(e => console.log('Victory sound failed:', e));
                console.log('Victory! You escaped the dungeon!');
            }
        }
    }

    // Update minimap
    if (minimapVisible && minimapCtx && mazeData) {
        drawMinimap();
    }
    
    // Animate torch flames (cheap old-school flickering)
    if (window.flameData) {
        const flameTime = time * 0.005; // Slow down animation
        window.flameData.forEach(data => {
            const { flame, light, baseY, phase } = data;
            
            // Subtle vertical bobbing
            const bob = Math.sin(flameTime * 3 + phase) * 0.03;
            flame.position.y = baseY + bob;
            
            // Scale flickering (squash and stretch)
            const scaleFlicker = 0.9 + Math.sin(flameTime * 8 + phase) * 0.15;
            flame.scale.set(scaleFlicker, 1.1 / scaleFlicker, scaleFlicker);
            
            // Emissive intensity flicker
            const intensityFlicker = 1.8 + Math.sin(flameTime * 6 + phase * 2) * 0.4;
            flame.material.emissiveIntensity = intensityFlicker;
            
            // Light intensity flicker (if has light)
            if (light) {
                light.intensity = 0.8 + Math.sin(flameTime * 5 + phase) * 0.3;
            }
        });
    }
    
    // Animate solution path fuse effect
    if (solutionVisible && solutionMaterial && window.solutionCurve) {
        solutionMaterial.uniforms.time.value = time * 0.001;
        
        // Find player's position along the solution curve
        const playerPos = new THREE.Vector3(camera.position.x, 0.15, camera.position.z);
        const curve = window.solutionCurve;
        
        // Sample curve to find closest point (approximate)
        let closestT = 0;
        let closestDist = Infinity;
        const samples = 50;
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const point = curve.getPoint(t);
            const dist = playerPos.distanceToSquared(point);
            if (dist < closestDist) {
                closestDist = dist;
                closestT = t;
            }
        }
        
        // Smooth interpolation to avoid jankiness when player moves
        const currentT = solutionMaterial.uniforms.playerT.value;
        const lerpSpeed = 3.0 * delta; // Smooth follow
        const smoothedT = currentT + (closestT - currentT) * Math.min(lerpSpeed, 1.0);
        solutionMaterial.uniforms.playerT.value = smoothedT;
    }
    
    // Update hint wisp
    updateHintWisp();
    
    // Update snow particles
    updateSnow();

    prevTime = time;
    renderer.render(scene, camera);
}

animate();

// Minimap drawing with zoom for large mazes
const MINIMAP_VISIBLE_CELLS = 12; // Number of cells to show when zoomed

function drawMinimap() {
    const { rows, cols, cells, entrances } = mazeData;
    const mapSize = minimapCanvas.width;
    const maxDimension = Math.max(rows, cols);
    
    // Determine if we need to zoom (large maze)
    const needsZoom = maxDimension > MINIMAP_VISIBLE_CELLS;
    
    // Calculate cell size based on zoom level
    const cellSize = needsZoom 
        ? mapSize / MINIMAP_VISIBLE_CELLS 
        : mapSize / maxDimension;
    
    // Get player position in cell coordinates
    const playerCellX = camera.position.x / CELL_SIZE;
    const playerCellZ = camera.position.z / CELL_SIZE;
    
    // Calculate view offset for zoomed minimap (center on player)
    let offsetX = 0;
    let offsetZ = 0;
    if (needsZoom) {
        offsetX = playerCellX - MINIMAP_VISIBLE_CELLS / 2;
        offsetZ = playerCellZ - MINIMAP_VISIBLE_CELLS / 2;
        // Clamp to maze bounds
        offsetX = Math.max(0, Math.min(offsetX, cols - MINIMAP_VISIBLE_CELLS));
        offsetZ = Math.max(0, Math.min(offsetZ, rows - MINIMAP_VISIBLE_CELLS));
    }
    
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
        
        // Skip cells outside visible area when zoomed
        if (needsZoom) {
            if (col < offsetX - 1 || col > offsetX + MINIMAP_VISIBLE_CELLS + 1) return;
            if (row < offsetZ - 1 || row > offsetZ + MINIMAP_VISIBLE_CELLS + 1) return;
        }
        
        const entranceDir = entranceMap.get(cell.id);
        const x = (col - offsetX) * cellSize;
        const y = (row - offsetZ) * cellSize;

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

    // Draw player position (adjusted for offset)
    const playerMapX = (playerCellX - offsetX) * cellSize;
    const playerMapZ = (playerCellZ - offsetZ) * cellSize;

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
    // Show hint with H key
    if (event.code === 'KeyH') {
        showHint();
    }
    // Toggle music with N key
    if (event.code === 'KeyN') {
        toggleMusic();
    }
    // Toggle snow with F key
    if (event.code === 'KeyF') {
        toggleSnow();
    }
    // Regenerate maze with R key
    if (event.code === 'KeyR') {
        regenerateMaze();
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

// Create 3D path visualization - glowing path with directional pulse
function createSolutionMeshes(path) {
    // Clear existing meshes
    solutionMeshes.forEach(mesh => scene.remove(mesh));
    solutionMeshes = [];
    solutionMaterial = null;
    
    if (path.length < 2) return;
    
    // Create points for the path - use all points to respect maze walls
    const points = path.map(cell => new THREE.Vector3(
        cell.col * CELL_SIZE + CELL_SIZE / 2,
        0.15, // Close to ground for ethereal glow
        cell.row * CELL_SIZE + CELL_SIZE / 2
    ));
    
    // Use lower tension for tighter corners that stay within corridors
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.15);
    
    // More segments for smoother appearance
    const tubeSegments = Math.max(path.length * 12, 96);
    const tubeGeometry = new THREE.TubeGeometry(curve, tubeSegments, 0.08, 6, false);
    
    // Calculate path length for UV mapping
    const pathLength = curve.getLength();
    
    // Shader material for lit fuse effect - beam travels from player position ahead
    solutionMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            playerT: { value: 0 }, // Player position along curve (0-1)
            travelLength: { value: 0.15 }, // How far ahead the fuse travels (fraction of path)
            baseColor: { value: new THREE.Color(0x0a2218) }, // Very dim base (unlit)
            fuseColor: { value: new THREE.Color(0x66ffcc) }, // Bright traveling light
            trailColor: { value: new THREE.Color(0x22aa66) } // Glowing trail behind
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float playerT;
            uniform float travelLength;
            uniform vec3 baseColor;
            uniform vec3 fuseColor;
            uniform vec3 trailColor;
            varying vec2 vUv;
            
            void main() {
                // Fuse travels from player position to some cells ahead, then resets
                float cycleTime = 2.5; // Seconds per cycle
                float cycleProgress = fract(time / cycleTime);
                
                // Fuse position: starts at playerT, travels travelLength ahead
                float fuseStart = playerT;
                float fuseEnd = playerT + travelLength;
                float fusePos = fuseStart + cycleProgress * travelLength;
                
                // Distance from the fuse head
                float distFromFuse = vUv.x - fusePos;
                
                // Only show effect in the active region (from player to ahead)
                float inRegion = step(fuseStart - 0.02, vUv.x) * step(vUv.x, fuseEnd + 0.02);
                
                // Bright fuse head
                float fuseHead = smoothstep(0.02, 0.0, abs(distFromFuse)) * 1.8;
                
                // Trail behind fuse (within active region)
                float behindFuse = step(vUv.x, fusePos);
                float aheadOfStart = step(fuseStart, vUv.x);
                float trail = behindFuse * aheadOfStart * 0.7;
                
                // Dim portion ahead of fuse but in region
                float ahead = step(fusePos, vUv.x) * step(vUv.x, fuseEnd) * 0.25;
                
                // Very dim outside active region
                float outside = (1.0 - inRegion) * 0.1;
                
                // Combine
                float brightness = inRegion * max(fuseHead, max(trail, ahead)) + outside;
                
                // Colors
                vec3 color = baseColor;
                color = mix(color, trailColor, trail * inRegion);
                color = mix(color, fuseColor, fuseHead * inRegion);
                
                // Edge softness
                float edgeFade = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 2.0);
                
                float alpha = brightness * edgeFade * 0.85;
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    const tube = new THREE.Mesh(tubeGeometry, solutionMaterial);
    scene.add(tube);
    solutionMeshes.push(tube);
    
    // Store curve for player position tracking
    window.solutionCurve = curve;
    
    console.log('Solution path created:', path.length, 'cells');
}

// Toggle solution visibility
function toggleSolutionPath() {
    solutionVisible = !solutionVisible;
    
    if (solutionVisible) {
        // Create meshes if not already created
        if (solutionMeshes.length === 0 && solutionPath.length > 0) {
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

// Show a hint - wisp of light that travels along the solution path
function showHint() {
    if (solutionPath.length === 0) return;
    
    // Find which cell the player is closest to on the solution path
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    const playerCol = Math.floor(playerX / CELL_SIZE);
    const playerRow = Math.floor(playerZ / CELL_SIZE);
    
    // Find player's closest position in solution path
    let pathIndex = -1;
    let minDist = Infinity;
    for (let i = 0; i < solutionPath.length; i++) {
        const cell = solutionPath[i];
        const dist = Math.abs(cell.row - playerRow) + Math.abs(cell.col - playerCol);
        if (dist < minDist) {
            minDist = dist;
            pathIndex = i;
        }
    }
    
    if (hintTimeout) {
        clearTimeout(hintTimeout);
    }
    
    // Build path for wisp to follow (starting just in front of player, then along solution path)
    const endIndex = Math.min(pathIndex + 5, solutionPath.length - 1);
    hintWispPath = [];
    
    // First point: just in front of the player
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    hintWispPath.push(new THREE.Vector3(
        camera.position.x + forward.x * 1.5,
        1.2,
        camera.position.z + forward.z * 1.5
    ));
    
    // Then follow the solution path
    for (let i = pathIndex; i <= endIndex; i++) {
        const cell = solutionPath[i];
        hintWispPath.push(new THREE.Vector3(
            cell.col * CELL_SIZE + CELL_SIZE / 2,
            1.2, // Float at about waist height
            cell.row * CELL_SIZE + CELL_SIZE / 2
        ));
    }
    
    hintWispProgress = 0;
    hintVisible = true;
    
    // Hide after 5 seconds
    hintTimeout = setTimeout(() => {
        hintVisible = false;
        hintWispPath = [];
    }, 5000);
    
    console.log('Hint: Wisp traveling from cell', pathIndex, 'to', endIndex);
}

// Update wisp position and appearance (called from animate loop)
function updateHintWisp() {
    if (!hintVisible || hintWispPath.length < 2) {
        if (hintWisp) hintWisp.visible = false;
        return;
    }
    
    // Create wisp if it doesn't exist
    if (!hintWisp) {
        hintWisp = new THREE.Group();
        
        // Core glow sphere (smaller)
        const coreGeo = new THREE.SphereGeometry(0.06, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xaaffee,
            transparent: true,
            opacity: 0.9
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.name = 'core';
        hintWisp.add(core);
        
        // Outer glow (smaller, more transparent)
        const glowGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x44ffaa,
            transparent: true,
            opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.name = 'glow';
        hintWisp.add(glow);
        
        // Point light for the wisp (dimmer, shorter range)
        const wispLight = new THREE.PointLight(0x44ffaa, 0.8, 4);
        wispLight.name = 'light';
        hintWisp.add(wispLight);
        
        scene.add(hintWisp);
    }
    
    hintWisp.visible = true;
    
    // Check if player is moving forward (not backwards)
    const playerMovingForward = moveState.forward || moveState.left || moveState.right;
    
    // Advance wisp along path only when player is moving forward
    if (playerMovingForward && !moveState.backward) {
        hintWispProgress += 0.003; // Slower speed of wisp travel
        if (hintWispProgress > 1) hintWispProgress = 0; // Loop
    }
    
    // Interpolate position along path
    const totalSegments = hintWispPath.length - 1;
    const progressAlongPath = hintWispProgress * totalSegments;
    const segmentIndex = Math.floor(progressAlongPath);
    const segmentProgress = progressAlongPath - segmentIndex;
    
    let wispX, wispZ;
    if (segmentIndex < totalSegments) {
        const p1 = hintWispPath[segmentIndex];
        const p2 = hintWispPath[segmentIndex + 1];
        
        // Smooth interpolation
        wispX = p1.x + (p2.x - p1.x) * segmentProgress;
        wispZ = p1.z + (p2.z - p1.z) * segmentProgress;
    } else {
        // At end of path
        const lastPoint = hintWispPath[hintWispPath.length - 1];
        wispX = lastPoint.x;
        wispZ = lastPoint.z;
    }
    
    // Check if wisp is behind the player - if so, keep it in front
    const toWisp = new THREE.Vector3(wispX - camera.position.x, 0, wispZ - camera.position.z);
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();
    
    const dot = toWisp.x * cameraForward.x + toWisp.z * cameraForward.z;
    
    // If wisp is behind player (dot < 0), place it in front instead
    if (dot < 0.5) {
        wispX = camera.position.x + cameraForward.x * 2.0;
        wispZ = camera.position.z + cameraForward.z * 2.0;
    }
    
    // Gentle bobbing motion
    const time = performance.now() * 0.003;
    const bobY = Math.sin(time * 2) * 0.1;
    const bobX = Math.sin(time * 1.3) * 0.05;
    
    // Smooth lerp to target position to avoid jerkiness
    const targetX = wispX + bobX;
    const targetZ = wispZ;
    const targetY = 1.2 + bobY;
    
    const lerpFactor = 0.08; // Smooth follow speed
    hintWisp.position.x += (targetX - hintWisp.position.x) * lerpFactor;
    hintWisp.position.y += (targetY - hintWisp.position.y) * lerpFactor;
    hintWisp.position.z += (targetZ - hintWisp.position.z) * lerpFactor;
    
    // Pulsing glow effect
    const pulse = 0.7 + 0.3 * Math.sin(performance.now() * 0.008);
    const core = hintWisp.getObjectByName('core');
    const glow = hintWisp.getObjectByName('glow');
    const light = hintWisp.getObjectByName('light');
    
    if (core) core.material.opacity = pulse;
    if (glow) {
        glow.material.opacity = 0.3 + 0.2 * pulse;
        glow.scale.setScalar(1 + 0.2 * Math.sin(performance.now() * 0.006));
    }
    if (light) light.intensity = 1.0 + 0.5 * pulse;
}

// Regenerate maze in 3D view
function regenerateMaze() {
    if (!mazeData) return;
    
    const { rows, cols } = mazeData;
    
    // Generate new maze using Wilson's algorithm (simplified version)
    // Build fresh cell data
    const newCells = [];
    const totalCells = rows * cols;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const id = row * cols + col;
            newCells.push({
                id,
                row,
                col,
                isStart: false,
                isEnd: false,
                links: []
            });
        }
    }
    
    // Create cell lookup
    const cellMap = new Map();
    newCells.forEach(c => cellMap.set(c.id, c));
    
    // Helper to get neighbor id
    const getNeighborId = (row, col) => {
        if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
        return row * cols + col;
    };
    
    // Wilson's algorithm
    const inMaze = new Set();
    // Start with random cell in maze
    const firstId = Math.floor(Math.random() * totalCells);
    inMaze.add(firstId);
    
    while (inMaze.size < totalCells) {
        // Pick random cell not in maze
        let startId;
        do {
            startId = Math.floor(Math.random() * totalCells);
        } while (inMaze.has(startId));
        
        // Random walk until we hit the maze
        const walk = [startId];
        let currentId = startId;
        
        while (!inMaze.has(currentId)) {
            const current = cellMap.get(currentId);
            const neighbors = [];
            
            const northId = getNeighborId(current.row - 1, current.col);
            const southId = getNeighborId(current.row + 1, current.col);
            const eastId = getNeighborId(current.row, current.col + 1);
            const westId = getNeighborId(current.row, current.col - 1);
            
            if (northId !== null) neighbors.push(northId);
            if (southId !== null) neighbors.push(southId);
            if (eastId !== null) neighbors.push(eastId);
            if (westId !== null) neighbors.push(westId);
            
            const nextId = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            // Check for loop
            const loopIdx = walk.indexOf(nextId);
            if (loopIdx !== -1) {
                // Erase loop
                walk.length = loopIdx + 1;
            } else {
                walk.push(nextId);
            }
            currentId = nextId;
        }
        
        // Add walk to maze with links
        for (let i = 0; i < walk.length - 1; i++) {
            const cellA = cellMap.get(walk[i]);
            const cellB = cellMap.get(walk[i + 1]);
            if (!cellA.links.includes(cellB.id)) cellA.links.push(cellB.id);
            if (!cellB.links.includes(cellA.id)) cellB.links.push(cellA.id);
            inMaze.add(walk[i]);
        }
    }
    
    // Choose entrances (north/south or east/west)
    const entrances = [];
    if (Math.random() < 0.5) {
        // North/South
        const northCol = Math.floor(Math.random() * cols);
        const southCol = Math.floor(Math.random() * cols);
        const northCell = cellMap.get(northCol);
        const southCell = cellMap.get((rows - 1) * cols + southCol);
        northCell.isStart = true;
        southCell.isEnd = true;
        entrances.push({ cellId: northCell.id, direction: 'north' });
        entrances.push({ cellId: southCell.id, direction: 'south' });
    } else {
        // East/West
        const westRow = Math.floor(Math.random() * rows);
        const eastRow = Math.floor(Math.random() * rows);
        const westCell = cellMap.get(westRow * cols);
        const eastCell = cellMap.get(eastRow * cols + (cols - 1));
        westCell.isStart = true;
        eastCell.isEnd = true;
        entrances.push({ cellId: westCell.id, direction: 'west' });
        entrances.push({ cellId: eastCell.id, direction: 'east' });
    }
    
    // Update mazeData
    mazeData = {
        rows,
        cols,
        cells: newCells,
        entrances
    };
    
    // Save to localStorage
    localStorage.setItem('mazeData', JSON.stringify(mazeData));
    
    // Clear existing 3D objects (except skybox, lights, and snow)
    const objectsToRemove = [];
    scene.traverse((obj) => {
        if ((obj.isMesh || obj.isGroup) && obj !== skybox && obj !== snowParticles && obj.parent === scene) {
            objectsToRemove.push(obj);
        }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));
    
    // Clear collision boxes
    wallBoundingBoxes.length = 0;
    
    // Clear solution path
    solutionPath = [];
    solutionMeshes = [];
    solutionMaterial = null;
    solutionVisible = false;
    
    // Clear hint state
    hintVisible = false;
    hintWispPath = [];
    hintWispProgress = 0;
    if (hintTimeout) {
        clearTimeout(hintTimeout);
        hintTimeout = null;
    }
    if (hintWisp) {
        hintWisp.visible = false;
    }
    
    // Reset victory state
    hasWon = false;
    exitPosition = null;
    exitDirection = null;
    
    // Stop walking sound
    if (isWalking) {
        walkingSound.pause();
        walkingSound.currentTime = 0;
        walkingSound.volume = 0.5;
        isWalking = false;
    }
    
    // Rebuild maze
    buildMaze();
    
    // Check if we were already in top-down view (not yet dropped in)
    const wasInTopDownView = isDropping && dropStartTime === 0;
    
    // Reset drop-in animation
    isDropping = true;
    
    if (wasInTopDownView) {
        // Stay in top-down view, don't auto-drop
        dropStartTime = 0;
        instructions.classList.remove('hidden');
        skipMenuAfterDrop = false;
    } else {
        // Was playing, auto-drop into new maze
        dropStartTime = performance.now();
        skipMenuAfterDrop = true;
        instructions.classList.add('hidden');
    }
    
    console.log('Maze regenerated!');
}

console.log('3D Maze initialized. Press M for minimap, P for solution path, R to regenerate.');
