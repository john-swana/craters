# Craters
[![CI commit action](https://github.com/john-swana/craters/actions/workflows/commit.yml/badge.svg)](https://github.com/john-swana/craters/actions/workflows/commit.yml)
[![Release publish action](https://github.com/john-swana/craters/actions/workflows/release.yml/badge.svg)](https://github.com/john-swana/craters/actions/workflows/release.yml)
![craters logo](https://john-swana.github.io/craters/media/craters.gif)
> _Craters is a modular JavaScript framework reimplemented in TypeScript for rapid HTML5 game development_

## Documentation
[Read documentation](https://john-swana.github.io/craters/index.html)

## Features
*   **Entity Component System (ECS):** A robust, functional ECS architecture for managing game logic (`World`, `Entity`, `System`, `Query`).
*   **Rendering:**
    *   **WebGLRenderer:** High-performance sprite batching.
    *   **Canvas2DRenderer:** Fallback or simple 2D rendering.
*   **Input Management:** Unified keyboard input handling using modern `KeyboardEvent.code`.
*   **Sound:** Web Audio API wrapper for sound effects and music.
*   **Asset Management:** Simple loader for images and other resources.
*   **Tilemaps:** Support for loading and rendering tilemaps.

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
_(Nothing yet)_

## License
Copyright (c) 2021 John Swana 
Licensed under the MIT license.
