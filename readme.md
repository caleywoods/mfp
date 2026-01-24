# Mazes For Programmers

A maze generation and exploration app inspired by the book [Mazes For Programmers](https://pragprog.com/book/jbmaze/mazes-for-programmers) by Jamis Buck. Generate mazes using various algorithms, visualize them in 2D, and explore them in an immersive 3D first-person dungeon view.

![Maze Examples](https://i.imgur.com/LKWZHuR.png)

## Features

### 2D Maze View
- **Multiple generation algorithms**: Binary Tree, Sidewinder, Aldous-Broder, Wilson's
- **Multiple solving algorithms**: Dijkstra, A*
- **Configurable size**: Adjust rows, columns, and cell size
- **Solver comparison**: Compare algorithm efficiency side-by-side
- **Export**: Save maze as PNG image

### 3D Dungeon Explorer
- **First-person exploration**: WASD movement, mouse look, jump with Space, sprint with Shift
- **Atmospheric environment**: Procedural stone brick walls with moss and weathering, cobblestone floors, flickering wall torches, fog, and dynamic lighting
- **Drop-in animation**: Bird's eye view of the entire maze before descending to start
- **Navigation aids**: Minimap, solution path visualization, directional hint system
- **Audio**: Ambient dungeon music and footstep sounds

## Running This Repo

```bash
git clone <repo-url>
npm install
npm run dev    # Development server with hot reload
npm start      # Production build served locally
```

## Controls

### 2D View
| Action | Control |
|--------|---------|
| Generate new maze | **Generate** button |
| Configure options | **Options** button (algorithm, size, display settings) |
| Solve maze | Select algorithm + **Solve** button |
| Compare solvers | **Compare All** button |
| Save as image | **Save Image** button |
| Enter 3D view | **Enter Maze** button |

### 3D Dungeon View
| Action | Control |
|--------|---------|
| Move | W / A / S / D or Arrow keys |
| Look around | Mouse |
| Sprint | Hold Shift |
| Jump | Space |
| Toggle minimap | M |
| Show solution path | P |
| Get directional hint | H |
| Toggle music | N |
| Regenerate maze | R |
| Return to 2D | Click **Exit Maze** link (top left) |

## Configuration

Edit `gridConfig` in `src/js/app.js` to customize maze generation:

```javascript
const gridConfig = {
    rows: 15,        // Number of rows
    cols: 15,        // Number of columns  
    cellSize: 30     // Pixel size of each cell in 2D view
};
```

## Technical Notes

### Performance Optimizations
- **Geometry merging**: All walls merged into single mesh for minimal draw calls
- **Frustum culling**: Only visible objects rendered (handled by Three.js)
- **Limited point lights**: Wall torches capped at 12 with lights, extras are emissive-only
- **Capped pixel ratio**: Limited to 2x to prevent GPU strain on high-DPI displays
- **Fog culling**: Distant geometry naturally hidden by atmospheric fog

### Architecture
- `src/js/app.js` - Main 2D application, maze generation, UI controls
- `src/js/maze3d.js` - 3D dungeon renderer using Three.js
- `classes/` - Grid and Cell data structures
- `algorithms/maze-generation/` - Generation algorithm implementations
- `algorithms/maze-traversal/` - Pathfinding algorithm implementations
