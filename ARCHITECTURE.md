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

    *   **Query lifecycle:** `World.createQuery` registers a *persistent* query that is re-evaluated on every entity add/remove — create these once (e.g. in `System.initialize`) and reuse them. For a one-off count or filter, use `World.queryOnce(components)`, which returns the matching entity set without registering anything. Dispose a persistent query with `World.removeQuery(query)`. Creating a query per frame leaks it permanently and degrades all entity add/remove over time.

    *   **Query membership:** Queries check an entity only when it is added (`World.addEntity`, which `createEntity` calls immediately), removed, or passed to `World.updateEntity(entity)`. `Entity.addComponent`/`removeComponent` do not notify the world. So add components *before* `World.addEntity`, or call `World.updateEntity` after changing the components of an entity that is already in the world — otherwise persistent queries silently miss it.

*   **Physics:** `RigidBody` provides impulse-based 2D physics — forces, damping, friction, and restitution — integrated with the `SAT` collision system. `Vector` is the shared 2D math primitive used across physics, collision, and rendering.

    *   **Time unit:** `integrate(dt)` takes `dt` in **seconds** (so velocities are px/s, accelerations px/s²). With `RenderLoop`, pass `loop.deltaSeconds`, *not* `loop.delta`/`loop.frameRatio`, which are milliseconds. Damping coefficients are per-second retention factors applied as `pow(d, dt)`, so they are frame-rate independent.

    *   **Solver scope:** Collision response is **single-pass, impulse-based** (arcade-grade), with rotational dynamics intentionally disabled — bodies translate but do not spin from impacts. It is not a sequential-impulse solver: there is no contact persistence or solver iteration. The penetration correction (40% of overlap beyond 0.5 px of slop), deep-overlap energy bleed (above 8 px), velocity cap (4000 px/s, applied on every `resolveCollision` call), and resting-contact restitution suppression (approach speed under 2 px/s plus the speed the bodies' forces added in their last step, e.g. one step of gravity) in `resolveCollision` are deliberate stabilizers that keep dense stacks from exploding under these constraints — they are tuned constants, not bugs. A future optional N-iteration solver could retire them.

    *   **Sleeping:** A body falls asleep once its squared speed has stayed below `sleepThreshold` (default 20, about 4.5 px/s) for more than `sleepTimerMax` consecutive `integrate()` calls; the check uses the velocity left after the previous step's collision response. `applyForce`/`applyImpulse` wake a sleeping body unless called with `wake = false` — pass `false` for per-step forces such as gravity so resting bodies can sleep. `resolveCollision` wakes a sleeping body only on an impact, and skips pairs where neither body can move. Sleeping is per body (there are no islands), so dense piles that keep jittering may not settle into sleep, and a sleeping body does not notice its support being removed (call `wake()`).

*   **Collision Detection:** The `SAT` library provides accurate narrow-phase collision detection using the Separating Axis Theorem for circles and convex polygons. The `QuadTree` data structure enables efficient broad-phase collision detection by spatially partitioning objects, reducing the number of collision checks needed.

*   **Graphics:** A `Tile` is the fundamental graphic unit — it draws a rectangular region from any image or canvas element. A `Sprite` builds on it: it cuts a spritesheet into a grid of `Tile`s and plays frame sequences from that grid. `TilemapManager` loads JSON maps in Craters' own `map2d` format (each layer is a list of `[sourceCol, sourceRow, destCol, destRow, tilesetIndex]` entries — not Tiled JSON) and draws the layers with `Sprite`. `FontManager` bakes a set of characters in a CSS font (a system font, or one loaded with `AssetsManager.loadFont`) into a glyph atlas and draws text from it via `Tile`. `Tile`, `Sprite` and `TilemapManager` take the `Renderer` interface, so they work with either `Canvas2DRenderer` or `WebGLRenderer`; `FontManager` and `ParticleSystem.draw` need a `Canvas2DRenderer`.

*   **Particles:** `ParticleSystem` keeps a list of short-lived sprite particles: each `emit()` creates new particle objects and `update()` removes them when they expire (there is no object reuse and no particle cap). Each particle has independent position, velocity, gravity, drag, rotation speed, tint color, and lifetime; speed, gravity, drag and lifetime are expressed per fixed-step tick, so call `update(1)` once per step. Tinted sprite canvases are cached per (image src, color, size) in a module-level cache shared by every `ParticleSystem` and never cleared. Particles are spawned with `emit()`, stepped with `update()`, and drawn with `draw()` — call it after your other layers so particles appear on top.

*   **Core Loop:** `RenderLoop` implements a fixed-timestep game loop using `requestAnimationFrame`. The accumulator decouples the simulation rate from the display refresh rate: each animation frame, the step callback runs once per whole fixed step that has accumulated (zero, one or several times). An optional `render` callback (the constructor's third argument) then runs once per animation frame, with `alpha` (leftover / fixedStep) already updated, so rendering can interpolate between the last two simulation states. Resuming with `start()` after `stop()` restarts timing instead of replaying the pause.

*   **Input/Sound:** Event-driven modules to handle user interaction and audio feedback. `Input` uses `KeyboardEvent.code` for layout-independent key detection and exposes a 3-state press model (0 = up, 1 = held, 2 = just pressed); `isPressed()` only reads, and `Input.update()` — called once per step, after input has been read — advances 2 → 1. Pointer listeners attach to `document` by default, or to an element passed to the constructor (e.g. the game canvas) so taps, clicks and scrolling keep working on the rest of the page. `SoundManager` wraps the Web Audio API and, if the context starts suspended, resumes it on the next user gesture (`touchend`, `click`, `mousedown`, `pointerup` or `keydown`), retrying on later gestures until the context is running.

*   **Assets:** `AssetsManager` provides async loaders for images, JSON, raw text, binary blobs, and font faces, resolving to an `HTMLImageElement`, parsed JSON, a string, a `Blob` and a `FontFace` respectively.

### PHILOSOPHY

Craters is built to be modular, type-safe, and performance-oriented, suitable for rapid HTML5 game development.
