## ARCHITECTURE
Craters mainly consists of:
*   **Renderers:** `Canvas2DRenderer`, `WebGLRenderer`
*   **Core Loop:** `RenderLoop`
*   **ECS:** `World`, `System`, `Entity`, `Component`, `Query`
*   **Input:** `Input` (Keyboard handling)
*   **Audio:** `SoundManager`
*   **Assets:** `AssetsManager`

Most modules are modular and can be used independently or together.

### DESIGN
*   **ECS:** The game logic is driven by an Entity Component System. `Entities` are containers for data (`Components`). `Systems` iterate over entities that match specific criteria (`Queries`) to perform logic (movement, rendering, collision) every frame.
*   **Graphics:** A `Tile` is the fundamental graphic unit. `Sprites` extend this concept to handle animations (sequences of frames). `Tilemaps` and `Fonts` are specialized abstractions for rendering grids of tiles or characters efficiently.
*   **Input/Sound:** Event-driven modules to handle user interaction and audio feedback.

### PHILOSOPHY
Craters is built to be modular, type-safe, and performance-oriented, suitable for rapid HTML5 game development.
