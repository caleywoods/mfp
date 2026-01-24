import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// DOM Elements
const canvas = document.getElementById('maze-container');
const instructions = document.getElementById('instructions');
const crosshair = document.getElementById('crosshair');

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 1.6, 2); // Player height ~1.6 units

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
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

// Pointer lock events
controls.addEventListener('lock', () => {
    instructions.classList.add('hidden');
    crosshair.classList.remove('hidden');
});

controls.addEventListener('unlock', () => {
    instructions.classList.remove('hidden');
    crosshair.classList.add('hidden');
});

// Click to start
instructions.addEventListener('click', () => {
    controls.lock();
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

// Placeholder: Create a simple test environment
// This will be replaced with actual maze geometry in Phase 3
function createTestEnvironment() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Sample walls to test navigation
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        roughness: 0.6
    });

    const wallGeometry = new THREE.BoxGeometry(1, 3, 0.2);
    
    // Create a few test walls
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

    // Start marker (green)
    const startGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const startMaterial = new THREE.MeshStandardMaterial({ color: 0x61D095 });
    const startMarker = new THREE.Mesh(startGeometry, startMaterial);
    startMarker.position.set(2, 0.05, 2);
    scene.add(startMarker);

    // End marker (red)
    const endGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const endMaterial = new THREE.MeshStandardMaterial({ color: 0xFB5D55 });
    const endMarker = new THREE.Mesh(endGeometry, endMaterial);
    endMarker.position.set(-2, 0.05, -2);
    scene.add(endMarker);
}

createTestEnvironment();

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

    if (controls.isLocked) {
        // Calculate movement direction
        direction.z = Number(moveState.forward) - Number(moveState.backward);
        direction.x = Number(moveState.right) - Number(moveState.left);
        direction.normalize();

        // Apply movement
        if (moveState.forward || moveState.backward) {
            velocity.z = direction.z * moveSpeed * delta;
            controls.moveForward(velocity.z);
        }
        if (moveState.left || moveState.right) {
            velocity.x = direction.x * moveSpeed * delta;
            controls.moveRight(velocity.x);
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}

animate();

console.log('3D Maze initialized. Click to start exploring!');
