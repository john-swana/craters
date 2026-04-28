## ARCHITECTURE

Craters mainly consists of:

*   **Renderers:** `Canvas2DRenderer`, `WebGLRenderer`
*   **Core Loop:** `RenderLoop`
*   **ECS:** `World`, `System`, `Entity`, `Component`, `Query`
*   **Physics:** `RigidBody`, `Vector`
*   **Collision Detection:** `SAT` (Separating Axis Theorem), `QuadTree` (Spatial Partitioning)
*   **Graphics:** `Tile`, `Sprite`, `TilemapManager`, `FontManager`
*   **Particles:** `ParticleSystem`
*   **Input:** `Input` (Keyboard, Mouse, and Touch handling)
*   **Audio:** `SoundManager`, `Sound`
*   **Assets:** `AssetsManager`

Most modules are modular and can be used independently or together.

### DESIGN

*   **ECS:** The game logic is driven by an Entity Component System. `Entities` are containers for data (`Components`). `Systems` iterate over entities that match specific criteria (`Queries`) to perform logic (movement, rendering, collision) every frame.

*   **Physics:** `RigidBody` provides impulse-based 2D physics — forces, damping, friction, and restitution — integrated with the `SAT` collision system. `Vector` is the shared 2D math primitive used across physics, collision, and rendering.

*   **Collision Detection:** The `SAT` library provides accurate narrow-phase collision detection using the Separating Axis Theorem for circles and convex polygons. The `QuadTree` data structure enables efficient broad-phase collision detection by spatially partitioning objects, reducing the number of collision checks needed.

*   **Graphics:** A `Tile` is the fundamental graphic unit — it draws a rectangular region from any image or canvas element. `Sprites` extend this to handle animations (sequences of tile-grid frames). `TilemapManager` loads Tiled-format JSON maps and renders layers using `Sprite`. `FontManager` rasterises a string of characters from any loaded `FontFace` into a texture atlas and draws text via `Tile`.

*   **Particles:** `ParticleSystem` maintains a pool of short-lived sprite particles. Each particle has independent position, velocity, gravity, drag, rotation speed, tint color, and lifetime. Tinted sprite canvases are cached per (image, color, size) tuple. Particles are spawned with `emit()`, stepped with `update()`, and drawn on top of all other layers with `draw()`.

*   **Core Loop:** `RenderLoop` implements a fixed-timestep game loop using `requestAnimationFrame`. The accumulator pattern decouples physics update rate from display refresh rate. The `alpha` value (leftover / fixedStep) is exposed for render interpolation.

*   **Input/Sound:** Event-driven modules to handle user interaction and audio feedback. `Input` uses `KeyboardEvent.code` for layout-independent key detection and exposes a 3-state press model (0 = up, 1 = held, 2 = just pressed). `SoundManager` wraps the Web Audio API and auto-unlocks the context on first user interaction.

*   **Assets:** `AssetsManager` provides async loaders for images, JSON, raw text, binary blobs, and font faces, returning native browser objects in each case.

### PHILOSOPHY

Craters is built to be modular, type-safe, and performance-oriented, suitable for rapid HTML5 game development.
