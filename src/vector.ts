/**
 * 2D vector used throughout Craters (physics, collision, rendering).
 *
 * Mutating methods change the vector in place and return `this` for chaining;
 * {@link Vector.clone} returns a new vector, and {@link Vector.dot},
 * {@link Vector.len} and {@link Vector.len2} return numbers. Craters draws in
 * canvas coordinates (x right, y down).
 */
export class Vector {
    x: number;
    y: number;

    /**
     * @param x x component (default 0)
     * @param y y component (default 0)
     */
    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    /** Copy `other`'s components into this vector. Returns `this`. */
    copy(other: Vector): Vector {
        this.x = other.x;
        this.y = other.y;
        return this;
    }

    /** Return a new, independent vector with the same components. */
    clone(): Vector {
        return new Vector(this.x, this.y);
    }

    /**
     * Perpendicular in place: `(x, y) → (y, -x)`, the same as `rotate(-Math.PI / 2)`
     * (counter-clockwise on a y-down screen). Returns `this`.
     */
    perp(): Vector {
        const x = this.x;
        this.x = this.y;
        this.y = -x;
        return this;
    }

    /**
     * Rotate in place by `angle` radians using the standard rotation matrix
     * (positive angles turn clockwise on a y-down screen). Returns `this`.
     */
    rotate(angle: number): Vector {
        const x = this.x;
        const y = this.y;
        this.x = x * Math.cos(angle) - y * Math.sin(angle);
        this.y = x * Math.sin(angle) + y * Math.cos(angle);
        return this;
    }

    /** Negate both components in place. Returns `this`. */
    reverse(): Vector {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /** Scale to unit length in place; a zero vector is left unchanged. Returns `this`. */
    normalize(): Vector {
        const len = this.len();
        if (len > 0) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    }

    /** Add `other` component-wise in place. Returns `this`. */
    add(other: Vector): Vector {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    /** Subtract `other` component-wise in place. Returns `this`. */
    sub(other: Vector): Vector {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    /** Multiply x by `x` and y by `y` (defaults to `x`) in place. Returns `this`. */
    scale(x: number, y: number = x): Vector {
        this.x *= x;
        this.y *= y;
        return this;
    }

    /** Project onto `other` (any non-zero length; a zero vector yields NaN) in place. Returns `this`. */
    project(other: Vector): Vector {
        const amt = this.dot(other) / other.len2();
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }

    /** Project onto `other`, which must be unit length (skips the division by `other.len2()`). Returns `this`. */
    projectN(other: Vector): Vector {
        const amt = this.dot(other);
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }

    /**
     * Mirror across the line through `axis` in place (`2·proj − v`): keeps the
     * component along `axis` and negates the perpendicular one. To bounce off a
     * surface pass its tangent, or use `reflectN(unitNormal).reverse()`. Returns `this`.
     */
    reflect(axis: Vector): Vector {
        const x = this.x;
        const y = this.y;
        this.project(axis).scale(2);
        this.x -= x;
        this.y -= y;
        return this;
    }

    /** Like {@link Vector.reflect}, for a unit-length `axis`. Returns `this`. */
    reflectN(axis: Vector): Vector {
        const x = this.x;
        const y = this.y;
        this.projectN(axis).scale(2);
        this.x -= x;
        this.y -= y;
        return this;
    }

    /** Dot product with `other`. */
    dot(other: Vector): number {
        return this.x * other.x + this.y * other.y;
    }

    /** Squared length (cheaper than {@link Vector.len}). */
    len2(): number {
        return this.dot(this);
    }

    /** Euclidean length. */
    len(): number {
        return Math.sqrt(this.len2());
    }
}
