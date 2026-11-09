/**
 * SAT collision detection and RigidBody physics: Vector, Box, Polygon, Circle,
 * Response, testPolygonPolygon / testCirclePolygon / testCircleCircle and
 * RigidBody. These are reachable only through the `SAT` namespace
 * (`import { SAT } from "craters"`); they are not top-level exports of craters.
 * Re-exported from one module for backward compatibility.
 *
 * @module
 */
export * from './vector';
export * from './shapes';
export * from './collision';
export * from './rigidbody';
