import { Vector } from './vector';

/**
 * Axis-aligned box: `pos` is the top-left corner, `w`/`h` the size in px.
 * Convert it with {@link Box.toPolygon} before running SAT tests.
 */
export class Box {
    pos: Vector;
    w: number;
    h: number;

    constructor(pos: Vector = new Vector(), w: number = 0, h: number = 0) {
        this.pos = pos;
        this.w = w;
        this.h = h;
    }

    /**
     * Polygon with `pos` = this box's top-left corner (copied) and points
     * `(0,0) (w,0) (w,h) (0,h)`. It rotates about that corner; to use the
     * centre instead, call `setOffset(new Vector(-w / 2, -h / 2))` on the result.
     */
    toPolygon(): Polygon {
        const pos = this.pos;
        const w = this.w;
        const h = this.h;
        return new Polygon(new Vector(pos.x, pos.y), [
            new Vector(0, 0),
            new Vector(w, 0),
            new Vector(w, h),
            new Vector(0, h)
        ]);
    }
}

/**
 * Convex polygon: `pos` in world space plus `points` in local space.
 *
 * The collision data (`calcPoints`, `edges`, `normals`) is rebuilt by the
 * constructor and by {@link Polygon.setPoints}, {@link Polygon.setAngle},
 * {@link Polygon.setOffset}, {@link Polygon.rotate} and {@link Polygon.translate}.
 * After editing `points` directly, call `setPoints(points)`.
 */
export class Polygon {
    pos: Vector;
    angle: number;
    offset: Vector;
    points: Vector[];
    calcPoints: Vector[];
    edges: Vector[];
    normals: Vector[];

    constructor(pos: Vector = new Vector(), points: Vector[] = []) {
        this.pos = pos;
        this.angle = 0;
        this.offset = new Vector();
        this.points = points;
        this.calcPoints = [];
        this.edges = [];
        this.normals = [];
        this.recalc();
    }

    /** Replace the local-space points and rebuild the collision data. Returns `this`. */
    setPoints(points: Vector[]): Polygon {
        this.points = points;
        this.recalc();
        return this;
    }

    /**
     * Set the rotation in radians about the local origin (`pos`). The offset is
     * applied before rotating, so it rotates too. Rebuilds the collision data. Returns `this`.
     */
    setAngle(angle: number): Polygon {
        this.angle = angle;
        this.recalc();
        return this;
    }

    /** Set a local offset from `pos`, applied before rotation. Rebuilds the collision data. Returns `this`. */
    setOffset(offset: Vector): Polygon {
        this.offset = offset;
        this.recalc();
        return this;
    }

    /** Rotate the local points themselves by `angle` radians (mutates the point Vectors). Returns `this`. */
    rotate(angle: number): Polygon {
        const points = this.points;
        const len = points.length;
        for (let i = 0; i < len; i++) {
            points[i].rotate(angle);
        }
        this.recalc();
        return this;
    }

    /** Translate the local points themselves (mutates the point Vectors). Returns `this`. */
    translate(x: number, y: number): Polygon {
        const points = this.points;
        const len = points.length;
        for (let i = 0; i < len; i++) {
            points[i].x += x;
            points[i].y += y;
        }
        this.recalc();
        return this;
    }

    private recalc() {
        const points = this.points;
        const len = points.length;
        this.calcPoints = [];
        this.edges = [];
        this.normals = [];

        for (let i = 0; i < len; i++) {
            const p = points[i].clone();
            p.add(this.offset);
            if (this.angle !== 0) {
                p.rotate(this.angle);
            }
            this.calcPoints.push(p);
        }

        for (let i = 0; i < len; i++) {
            const p1 = this.calcPoints[i];
            const p2 = this.calcPoints[i < len - 1 ? i + 1 : 0];
            const e = new Vector(p2.x - p1.x, p2.y - p1.y);
            this.edges.push(e);
            this.normals.push(e.clone().perp().normalize());
        }
    }

    /** World-space axis-aligned bounding box, as a Polygon. */
    getAABB(): Polygon {
        const points = this.calcPoints;
        const len = points.length;
        let xMin = points[0].x;
        let yMin = points[0].y;
        let xMax = points[0].x;
        let yMax = points[0].y;
        for (let i = 1; i < len; i++) {
            const point = points[i];
            if (point.x < xMin) {
                xMin = point.x;
            } else if (point.x > xMax) {
                xMax = point.x;
            }
            if (point.y < yMin) {
                yMin = point.y;
            } else if (point.y > yMax) {
                yMax = point.y;
            }
        }
        return new Box(this.pos.clone().add(new Vector(xMin, yMin)), xMax - xMin, yMax - yMin).toPolygon();
    }

    /** World-space axis-aligned bounding box, as a Box (cheap; used by QuadTree). */
    getAABBAsBox(): Box {
        const points = this.calcPoints;
        const len = points.length;
        let xMin = points[0].x;
        let yMin = points[0].y;
        let xMax = points[0].x;
        let yMax = points[0].y;
        for (let i = 1; i < len; i++) {
            const point = points[i];
            if (point.x < xMin) {
                xMin = point.x;
            } else if (point.x > xMax) {
                xMax = point.x;
            }
            if (point.y < yMin) {
                yMin = point.y;
            } else if (point.y > yMax) {
                yMax = point.y;
            }
        }
        return new Box(this.pos.clone().add(new Vector(xMin, yMin)), xMax - xMin, yMax - yMin);
    }

    /** World-space area centroid (centre of mass for uniform density). */
    getCentroid(): Vector {
        const points = this.calcPoints;
        const len = points.length;
        let cx = 0;
        let cy = 0;
        let ar = 0;
        for (let i = 0; i < len; i++) {
            const p1 = points[i];
            const p2 = points[i < len - 1 ? i + 1 : 0];
            const a = p1.x * p2.y - p2.x * p1.y;
            cx += (p1.x + p2.x) * a;
            cy += (p1.y + p2.y) * a;
            ar += a;
        }
        ar *= 3;
        cx /= ar;
        cy /= ar;
        return new Vector(cx, cy).add(this.pos);
    }
}

/**
 * Circle: `pos` is the centre in world space, `r` the radius in px, and `offset`
 * an optional local offset of the centre.
 */
export class Circle {
    pos: Vector;
    r: number;
    offset: Vector;

    constructor(pos: Vector = new Vector(), r: number = 0) {
        this.pos = pos;
        this.r = r;
        this.offset = new Vector();
    }

    /** Set a local offset of the centre from `pos`. Returns `this`. */
    setOffset(offset: Vector): Circle {
        this.offset = offset;
        return this;
    }

    /** World-space axis-aligned bounding box (including the offset), as a Polygon. */
    getAABB(): Polygon {
        const r = this.r;
        const corner = this.pos.clone().add(this.offset).sub(new Vector(r, r));
        return new Box(corner, r * 2, r * 2).toPolygon();
    }

    /** World-space axis-aligned bounding box (including the offset), as a Box. */
    getAABBAsBox(): Box {
        const r = this.r;
        const pos = this.pos.clone().add(this.offset);
        return new Box(pos.sub(new Vector(r, r)), r * 2, r * 2);
    }
}
