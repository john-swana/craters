## ARCHITECTURE
Craters mainly consists of:
*   **Renderers:** `Canvas2DRenderer`, `WebGLRenderer`
*   **Core Loop:** `RenderLoop`
*   **ECS:** `World`, `System`, `Entity`, `Component`, `Query`
*   **Collision Detection:** `SAT` (Separating Axis Theorem), `QuadTree` (Spatial Partitioning)
*   **Input:** `Input` (Keyboard, Mouse, and Touch handling)
*   **Audio:** `SoundManager`
*   **Assets:** `AssetsManager`

Most modules are modular and can be used independently or together.

### DESIGN
*   **ECS:** The game logic is driven by an Entity Component System. `Entities` are containers for data (`Components`). `Systems` iterate over entities that match specific criteria (`Queries`) to perform logic (movement, rendering, collision) every frame.
*   **Collision Detection:** The `SAT` library provides accurate narrow-phase collision detection using the Separating Axis Theorem for circles and convex polygons. The `QuadTree` data structure enables efficient broad-phase collision detection by spatially partitioning objects, reducing the number of collision checks needed.
*   **Graphics:** A `Tile` is the fundamental graphic unit. `Sprites` extend this concept to handle animations (sequences of frames). `Tilemaps` and `Fonts` are specialized abstractions for rendering grids of tiles or characters efficiently.
*   **Input/Sound:** Event-driven modules to handle user interaction and audio feedback.

### PHILOSOPHY
Craters is built to be modular, type-safe, and performance-oriented, suitable for rapid HTML5 game development.
