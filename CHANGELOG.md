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
