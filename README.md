# Craters
[![CI commit action](https://github.com/john-swana/craters/actions/workflows/commit.yml/badge.svg)](https://github.com/john-swana/craters/actions/workflows/commit.yml)
[![Release publish action](https://github.com/john-swana/craters/actions/workflows/release.yml/badge.svg)](https://github.com/john-swana/craters/actions/workflows/release.yml)
![craters logo](https://john-swana.github.io/craters/media/craters.gif)
> _Craters is a modular JavaScript framework reimplemented in TypeScript for rapid HTML5 game development_

## Documentation
[Read documentation](https://john-swana.github.io/craters/index.html)

## Features
*   **Entity Component System (ECS):** A robust, functional ECS architecture for managing game logic (`World`, `Entity`, `System`, `Query`).
*   **Physics** (exported under the `SAT` namespace, e.g. `SAT.RigidBody`, `SAT.Vector`):
    *   **RigidBody:** Impulse-based 2D physics with forces, damping, friction, restitution, and a sleep system. Bodies translate only; collisions do not rotate them. See [guides/rigidbody.md](guides/rigidbody.md).
    *   **Vector:** 2D vector math — add, sub, scale, dot, normalize, rotate, reflect, and more.
*   **Collision Detection:**
    *   **SAT Library:** Separating Axis Theorem implementation for accurate collision detection between circles and convex polygons.
    *   **QuadTree:** Spatial partitioning data structure for efficient broad-phase collision detection.
*   **Rendering:**
    *   **WebGLRenderer:** GPU renderer implementing the same `Renderer` interface as `Canvas2DRenderer` for `Tile`, `Sprite` and `TilemapManager` (one draw call per image; no batching).
    *   **Canvas2DRenderer:** Simple 2D rendering with primitive drawing support (rects, circles, polygons, lines).
    *   **Tile:** Fundamental graphic unit — draws a rectangular region from any image or canvas.
    *   **Sprite:** Animated spritesheet support built on top of `Tile`.
    *   **FontManager:** Bitmap text — bakes the characters of a CSS font into a glyph atlas and draws strings from it (Canvas2D).
    *   **TilemapManager:** Loads JSON tilemaps in Craters' own `map2d` format (not Tiled JSON) and draws their layers with `Sprite`.
*   **Particles:** `ParticleSystem` — sprite-based particle effects with per-particle gravity, drag, tinting, and directional bias. See [guides/particle.md](guides/particle.md).
*   **Game Loop:** `RenderLoop` — fixed-timestep loop on `requestAnimationFrame`, with an optional per-frame render callback for smooth interpolation. See [guides/render-loop.md](guides/render-loop.md).
*   **Input Management:** Unified keyboard, mouse, and touch input handling using modern `KeyboardEvent.code`, with a 3-state press model (call `input.update()` once per step). Pointer input can be scoped to the game canvas.
*   **Sound:** Web Audio API wrapper (`SoundManager`, `Sound`) for sound effects and music: play, overlapping one-shots, stop, volume, and global suspend/resume. Unlocks audio on the first user gesture, including taps.
*   **Asset Management:** `AssetsManager` — async loaders for images, JSON, text, binary blobs, and fonts.

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
  constructor(public dx: number, public dy: number) { super(); } // px per second
}

// 2. Define System
class MovementSystem extends ECS.System {
  private query!: ECS.Query;

  // Create persistent queries once, here — never inside execute(),
  // where each call would register (and leak) a new query every frame.
  public initialize(): void {
    this.query = this.world!.createQuery([Position, Velocity]);
  }

  public execute(delta: number): void { // delta in seconds
    this.query.entities.forEach(entity => {
      const pos = entity.getComponent(Position)!;
      const vel = entity.getComponent(Velocity)!;
      pos.x += vel.dx * delta;
      pos.y += vel.dy * delta;
    });
  }
}

// 3. Setup World
const world = new ECS.World();
world.registerSystem(new MovementSystem());

// 4. Create Entity — add its components *before* adding it to the world:
// queries only re-check an entity on addEntity/removeEntity, or when you
// call world.updateEntity(entity) after changing its components.
const player = new ECS.Entity();
player.addComponent(new Position(0, 0));
player.addComponent(new Velocity(60, 0));
world.addEntity(player);

// 5. Run Loop — starts immediately. The callback receives the RenderLoop and
// runs once per fixed step (60 per second by default).
const loop = new RenderLoop((current) => {
  world.execute(current.deltaSeconds); // seconds, so Velocity is in px/s
});
```

See [guides/ecs.md](guides/ecs.md) and [guides/render-loop.md](guides/render-loop.md) for details.

## Examples
[Play craters sandbox](https://john-swana.github.io/craters-sandbox/)

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality.

*   **Test:** `npm test` (Karma + Mocha in headless Chrome).
*   **Build:** `npm run build:dev` / `npm run build:prod` ([Grunt](http://gruntjs.com/) + webpack, output in `dist/`).
*   **Docs:** `npm run build:docs` (TypeDoc site in `docs/`, built from the TSDoc comments in `src/` plus the guides in `guides/`).

_Also, please don't edit files in the "dist" subdirectory as they are generated by the build. You'll find source code in the "src" subdirectory!_

## Release History
See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## License
Copyright (c) 2019 John Swana
Licensed under the MIT license.
