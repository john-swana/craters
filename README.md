# Craters
[![CI commit action](https://github.com/john-swana/craters/actions/workflows/commit.yml/badge.svg)](https://github.com/john-swana/craters/actions/workflows/commit.yml)
[![Release publish action](https://github.com/john-swana/craters/actions/workflows/release.yml/badge.svg)](https://github.com/john-swana/craters/actions/workflows/release.yml)
![craters logo](https://john-swana.github.io/craters/media/craters.gif)
> _Craters is a modular JavaScript framework reimplemented in TypeScript for rapid HTML5 game development_

## Documentation
[Read documentation](https://john-swana.github.io/craters/index.html)

## Features
*   **Entity Component System (ECS):** A robust, functional ECS architecture for managing game logic (`World`, `Entity`, `System`, `Query`).
*   **Physics:**
    *   **RigidBody:** Impulse-based 2D physics with forces, damping, friction, restitution, and a sleep system. See [guides/rigidbody.md](guides/rigidbody.md).
    *   **Vector:** 2D vector math — add, sub, scale, dot, normalize, rotate, reflect, and more.
*   **Collision Detection:**
    *   **SAT Library:** Separating Axis Theorem implementation for accurate collision detection between circles and convex polygons.
    *   **QuadTree:** Spatial partitioning data structure for efficient broad-phase collision detection.
*   **Rendering:**
    *   **WebGLRenderer:** High-performance sprite batching.
    *   **Canvas2DRenderer:** Fallback or simple 2D rendering with primitive drawing support.
    *   **Tile:** Fundamental graphic unit — draws a rectangular region from any image or canvas.
    *   **Sprite:** Animated spritesheet support built on top of `Tile`.
    *   **FontManager:** Bitmap font rendering from any loaded typeface.
    *   **TilemapManager:** Loads and renders Tiled-format JSON tilemaps.
*   **Particles:** `ParticleSystem` — sprite-based particle effects with per-particle gravity, drag, tinting, and directional bias. See [guides/particle.md](guides/particle.md).
*   **Input Management:** Unified keyboard, mouse, and touch input handling using modern `KeyboardEvent.code`.
*   **Sound:** Web Audio API wrapper (`SoundManager`, `Sound`) for sound effects and music with play/pause/stop/volume control.
*   **Asset Management:** `AssetsManager` — async loaders for images, JSON, text, binary blobs, and fonts.
*   **Tilemaps:** `TilemapManager` — loads Tiled JSON maps and renders them via `Sprite`.

## Usage Guides

Detailed guides for every module:

| Module | Guide |
|---|---|
| ECS (`World`, `Entity`, `System`, `Query`) | [guides/ecs.md](guides/ecs.md) |
| RigidBody | [guides/rigidbody.md](guides/rigidbody.md) |
| Vector | [guides/vector.md](guides/vector.md) |
| SAT Collision (`Box`, `Polygon`, `Circle`) | [guides/sat.md](guides/sat.md) |
| QuadTree | [guides/quadtree.md](guides/quadtree.md) |
| Canvas2DRenderer | [guides/canvas-2d-renderer.md](guides/canvas-2d-renderer.md) |
| WebGLRenderer | [guides/webgl-renderer.md](guides/webgl-renderer.md) |
| Tile | [guides/tile.md](guides/tile.md) |
| Sprite | [guides/sprite.md](guides/sprite.md) |
| FontManager | [guides/font-manager.md](guides/font-manager.md) |
| TilemapManager | [guides/tilemap-manager.md](guides/tilemap-manager.md) |
| ParticleSystem | [guides/particle.md](guides/particle.md) |
| Input | [guides/input.md](guides/input.md) |
| SoundManager / Sound | [guides/sound.md](guides/sound.md) |
| AssetsManager | [guides/assets-manager.md](guides/assets-manager.md) |
| RenderLoop | [guides/render-loop.md](guides/render-loop.md) |

## Installation
```bash
npm install craters
```

## Usage
### Basic ECS Setup
```typescript
import { EntityComponentSystem as ECS, RenderLoop } from "craters";

// 1. Define Components
class Position extends ECS.Component {
  constructor(public x: number, public y: number) { super(); }
}

class Velocity extends ECS.Component {
  constructor(public dx: number, public dy: number) { super(); }
}

// 2. Define System
class MovementSystem extends ECS.System {
  public execute(delta: number): void {
    // Query entities with Position and Velocity
    const query = this.world.createQuery([Position, Velocity]);
    
    query.entities.forEach(entity => {
      const pos = entity.getComponent(Position);
      const vel = entity.getComponent(Velocity);
      pos.x += vel.dx * delta;
      pos.y += vel.dy * delta;
    });
  }
}

// 3. Setup World
const world = new ECS.World();
world.registerSystem(new MovementSystem());

// 4. Create Entity
const player = world.createEntity();
player.addComponent(new Position(0, 0));
player.addComponent(new Velocity(1, 0));

// 5. Run Loop
const loop = new RenderLoop((delta) => {
  world.execute(delta);
});
```

## Examples
[Play craters sandbox](https://john-swana.github.io/craters-sandbox/)

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

_Also, please don't edit files in the "dist" subdirectory as they are generated via Grunt. You'll find source code in the "src" subdirectory!_

## Release History
See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## License
Copyright (c) 2021 John Swana 
Licensed under the MIT license.
