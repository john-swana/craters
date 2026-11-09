* v0.4.0 (2026-11-09) - Fixes, render hook & documentation
	API:
	- `Sound` is now exported from the package entry point, along with the tilemap types `TilemapData`, `TilemapLayer`, `Tileset` and `TileEntry`.
	- RenderLoop: new optional third constructor argument `render(loop)`, called once per animation frame after that frame's fixed steps, with `alpha` and `current` already updated — use it to interpolate between simulation states.
	- Input: new optional constructor argument `new Input(pointerTarget?)` (default `document`). Mouse and touch listeners, and their `preventDefault()`, attach to the target, so passing the game canvas leaves taps, clicks and scrolling working on the rest of the page. Keyboard listeners stay on `document`.
	- RigidBody: `applyForce(force, wake = true)` and `applyImpulse(impulse, wake = true)` take an optional `wake` flag (see below).
	- FontManager: new optional 7th constructor argument and property `lineWidth` (default 1) for stroked glyphs.
	RenderLoop:
	- Fixed `stop()` not cancelling a loop whose first frame had not run yet (e.g. created in a background tab, where `requestAnimationFrame` is paused); a later `start()` then launched a second, untracked frame chain.
	- `start()` after `stop()` now restarts timing (accumulator and `alpha` reset, first frame only records a timestamp) instead of running up to 250 ms of catch-up steps. `elapsed` continues from where it was.
	- `stop()` called from inside the step callback now takes effect immediately: the remaining steps queued for that frame are skipped and `render` is not called for it.
	ECS:
	- `World.updateEntity(entity)` is now a no-op for entities that are not in the world; previously it put a removed entity back into matching queries. Use `addEntity()` to bring an entity back.
	QuadTree:
	- A zero-width (or zero-height) box lying exactly on a split line now counts as touching both sides; previously it was dropped once its node split. All other boxes behave as before.
	Physics:
	- `testCirclePolygon` now sets `response.aInB` (circle fully inside the polygon) and `response.bInA` (polygon fully inside the circle); previously they kept their earlier values.
	- BEHAVIOR (RigidBody): `applyForce`/`applyImpulse` now wake a sleeping body by default; previously a sleeping body discarded forces and froze impulses. Pass `wake = false` for per-step forces such as gravity so resting bodies can sleep.
	- BEHAVIOR (RigidBody): sleeping now works for bodies resting under gravity. The sleep check runs at the start of `integrate()` on the velocity left after the previous collision response; `resolveCollision()` wakes a sleeping body only on an impact (not on every contact), no longer resets awake bodies' sleep timers, and skips pairs where neither body can move. A box dropped on a static floor with gravity applied via `applyForce(g, false)` now sleeps about 2.3 s after release.
	- BEHAVIOR (RigidBody): the resting-contact threshold is now 2 px/s plus the normal speed the bodies' forces added in their last step, which removes the gravity micro-bounce of resting bodies at one step per frame. Real impacts bounce as before.
	Rendering:
	- FontManager: the `fill`, `stroke` and `strokeStyle` options now take effect when the glyph atlas is built (previously glyphs were always filled and never stroked). Atlas cells get a margin so strokes are not clipped. Default output is unchanged.
	- WebGLRenderer: blending is set up in the constructor, with premultiplied-alpha uploads and `ONE, ONE_MINUS_SRC_ALPHA` blending. Semi-transparent textures now composite correctly regardless of when they were created relative to the first `clear()`, and drawing blends even if `clear()` is never called. Opaque textures render as before.
	- TilemapManager.load: rejects with an `Error` on a non-OK HTTP response and when a tileset image fails to load (previously it parsed the error page, or rejected with a raw `Event`).
	Input, sound & assets:
	- SoundManager: the audio context now unlocks on touch-only devices. It listens for `touchend`, `click`, `mousedown`, `pointerup` and `keydown` (`touchstart` is not a user gesture) and keeps retrying until the context is running; afterwards it no longer resumes the context, so `suspendAll()` stays paused.
	- Input: `Touch0` is released only when the last finger lifts, not on any finger's `touchend`.
	- BEHAVIOR (AssetsManager): `loadText`, `loadJson` and `loadBinary` reject with an `Error` on a non-OK HTTP response instead of resolving with the error page; `loadImage` rejects with an `Error` instead of the raw `Event`.
	Docs:
	- Corrected README, ARCHITECTURE and every guide for the current API (imports, time units, ECS query membership, `Input.update()`, RenderLoop timing, the `map2d` tilemap format, and more); public-API source comments are now TSDoc, so they appear on the API site; corrected the release history below.

* v0.3.0 (2026-06-27) - Engine review fixes
	New since v0.2.0:
	- Added `ParticleSystem` (sprite particles with per-particle gravity, drag, rotation, tinting and directional bias) and its `ParticleEmitConfig` type.
	- Added usage guides for every module (`guides/`), published with the TypeDoc site (`npm run build:docs`).
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

* v0.2.0 (2026-04-17) - Physics & fixed-timestep loop
	- Added `RigidBody` impulse-based 2D physics (forces, impulses, damping, friction, restitution, sleeping) and split the SAT library into `vector`, `shapes` (`Box`, `Polygon`, `Circle`) and `collision` (`testPolygonPolygon`, `testCirclePolygon`, `testCircleCircle`, `Response`) modules, all exported under the `SAT` namespace.
	- BREAKING (RenderLoop): rewritten as a fixed-timestep loop. The callback now runs once per fixed step (`1000 / frameRate` ms) instead of once per animation frame; `delta` is that fixed step rather than the measured frame time; `elapsed` is simulated time; frame time is capped at 250 ms; a new `alpha` field holds the leftover fraction of a step. `start()` no longer launches a second loop while one is running.
	- BREAKING: removed the package's default-export object; use named imports (`import { RenderLoop } from "craters"`).
	- Rendering: both renderers snap draws to physical pixels and use nearest-neighbour sampling, removing tile seams on high-DPR displays; `WebGLRenderer` throws a clear error when WebGL is unavailable; `Sprite.draw` gained a `sourceInset` argument (TilemapManager uses 0.5) to stop atlas bleeding.
	- `Sound.play(loop, onEnded)` gained looping and an end callback.
	- Fixed CI workflows.

* v0.1.2 (2025-11-27) - Collision Detection & Testing
	- Added SAT (Separating Axis Theorem) collision detection library with support for Circle-Circle, Circle-Polygon, and Polygon-Polygon collisions
	- Implemented QuadTree spatial partitioning for efficient broad-phase collision detection
	- Added primitive drawing methods to Canvas2DRenderer (drawRect, drawCircle, drawPolygon, drawLine)
	- Enhanced Input class with mouse and touch event support (pointerPosition, Touch0 binding)
	- Converted Response interface to class in SAT library for proper instantiation
	- Added tests for Sound and ECS modules, including ECS query registration
	- Release workflow: removed the npm scope so the package publishes as `craters` (a brief rename to `@swashvirus/craters` during this cycle was reverted; every release is published as `craters`)

* v0.1.1 (2025-11-19) - Renderer & Input Improvements
	- Optimized renderer performance
	- Improved sound and input handling
	- Updated documentation
	- Security: Bumped multiple dependencies (qs, body-parser, engine.io, socket.io, terser, karma, follow-redirects, minimist, grunt)

* v0.1.0-rebase.12 (2021-11-18)
	- Fixed workflow to prevent overwriting modules with latest versions
	- Renamed TilemapManager and exported Tilemap class
	- Updated pathname in tilemap test

* v0.1.0 (2021-11-07) - Initial Rebase
	- Craters development resumed and version rebased to semantic version v0.1.0
