* v0.3.0 (2026) - Engine review fixes
	Phase 1 (correctness):
	- BREAKING (Input): `isPressed()` no longer mutates state on read — repeated reads in a frame all return the "just pressed" value (2). Call the new `Input.update()` once per frame to advance the 2 → 1 (held) transition.
	- Fixed Input listeners never being removed: handlers are now stable references, so unbinding works. Added `Input.unbind()`; `unbindKeys()` retained as a deprecated alias.
	- Fixed Canvas2DRenderer ignoring context options: they are now passed to `getContext("2d", options)` instead of `createElement` (where they were silently dropped).
	- ECS: `Entity.getComponent()` now returns `T | undefined` (was an unsound `T`). Removed the empty deprecated `ComponentManager`/`EntityManager`/`SystemManager`/`QueryManager` exports.
	Phase 2 (resource & async safety):
	- Sound loading now rejects instead of hanging: added the `decodeAudioData` error callback and a `response.ok` check, so corrupt files and HTTP errors surface as rejected promises.
	- Added `Sound.playOneShot()` for overlapping effects (footsteps, hits) that no longer cut each other off, plus `Sound.stopAll()`. `Sound.pause()`/`resume()` are deprecated (they suspend the whole context); use the new `SoundManager.suspendAll()`/`resumeAll()`.
	- WebGLRenderer now checks shader compile/link status and throws readable errors instead of rendering a blank canvas; deletes shader objects after linking; dropped the throwaway 1×1 placeholder texture upload; added `deleteImage()` to release textures.
	Phase 3 (physics units & determinism):
	- BEHAVIOR (RigidBody): `integrate(dt)` is now documented to take `dt` in **seconds**; the internal tuning constants assume px/s. Added `RenderLoop.deltaSeconds` as the correct value to pass (`delta`/`frameRatio` are milliseconds).
	- BEHAVIOR (RigidBody): damping is now frame-rate independent — `linearDamping`/`angularDamping` are per-second retention factors applied as `pow(d, dt)`. Previously they were applied once per step (heavier at higher FPS). At 60fps bodies now experience lighter damping than before; raise the values to restore the old feel.
	- Documented the physics solver scope (single-pass impulse, no rotation/iteration) and the rationale for its stability constants in ARCHITECTURE.md.
	Phase 4 (performance):
	- Tile now skips building the offscreen clip/pattern canvas for plain non-repeating tiles (the common spritesheet/font-atlas case). It still routes the image through the renderer's `createImage` (identity for Canvas2D, texture upload for WebGL) so both backends work. Replaced the invalid fractional `rgba(25.5, …)` default fill/stroke colors with `"transparent"`.
	- Added `QuadTree.retrieveUnique()` to dedupe boundary-straddling objects that appear in multiple child nodes; documented the world-bounds assumption on `retrieve()`.
	- SAT contact-point computation is now opt-in via a `computeContactPoint` flag (default false) on `testPolygonPolygon`/`testCirclePolygon`/`testCircleCircle` — it was wasted work since rotational response is disabled.
	- Reduced narrow-phase/integration allocations: `isSeparatingAxis` reuses scratch range arrays and inlines the offset projection; `RigidBody.integrate` updates velocity/position in place instead of cloning vectors each step.
	Phase 5 (typing & polish):
	- Replaced `any` on public surfaces: `RenderLoop.execute` is `(loop: RenderLoop) => void`; `Response.a`/`b` are `Polygon | Circle | null`; `TilemapManager`/`Tilemap` are fully typed (`TilemapData`/`TilemapLayer`/`Tileset`/`TileEntry`). `Sprite.draw`'s `renderLoop` argument is now optional (it is unused when an explicit frame index is given).
	- Added and exported a `Renderer` interface (`createImage`/`drawImage`); `Tile`/`Sprite`/`TilemapManager` now accept it instead of a concrete `Canvas2DRenderer`, so they work with either `Canvas2DRenderer` or `WebGLRenderer` in a type-safe way.
	- FontManager parses the px size from the font shorthand with a regex (handles `"bold 16px …"`) and the glyph-width reduce now seeds an initial 0 (empty letter sets no longer throw).
	- `AssetsManager.loadFont` now registers the loaded face in `document.fonts` and documents that `resource` must be a CSS `src` descriptor (e.g. `url(...)`).
	- Removed the unused per-cell `positions` array from `Sprite`'s internal grid.
	ECS query lifecycle:
	- Added `World.removeQuery(query)` to dispose a persistent query (the missing inverse of `createQuery`), and `World.queryOnce(components)` for one-off counts/filters that must NOT register a permanent query. Previously every `createQuery` lived forever and was re-evaluated on each entity add/remove, so a query accidentally created per frame leaked and degraded add/remove without bound (measured: unplayable within minutes in a real game loop). These give consumers a non-leaking path for the count/filter use case.

* v0.1.4 (unreleased)
	- Added SAT (Separating Axis Theorem) collision detection library with support for Circle-Circle, Circle-Polygon, and Polygon-Polygon collisions
	- Implemented QuadTree spatial partitioning for efficient broad-phase collision detection
	- Added primitive drawing methods to Canvas2DRenderer (drawRect, drawCircle, drawPolygon, drawLine)
	- Enhanced Input class with mouse and touch event support (pointerPosition, Touch0 binding)
	- Improved test coverage for ECS query registration
	- Converted Response interface to class in SAT library for proper instantiation

* v0.1.2 (2024) - Package Naming & Testing
	- Fixed package scope in release workflow to match actual package name
	- Added comprehensive tests for Sound and ECS modules
	- Updated package name to scoped @swashvirus/craters

* v0.1.1 (2024) - Renderer & Input Improvements
	- Optimized renderer performance
	- Improved sound and input handling
	- Updated documentation
	- Security: Bumped multiple dependencies (qs, body-parser, engine.io, socket.io, terser, karma, follow-redirects, minimist, grunt)

* v0.1.0-rebase.12 (2023)
	- Fixed workflow to prevent overwriting modules with latest versions
	- Renamed TilemapManager and exported Tilemap class
	- Updated pathname in tilemap test

* v0.1.0 (2023) - Initial Rebase
	- Craters development resumed and version rebased to semantic version v0.1.0
