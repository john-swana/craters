export class Vector {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    copy(other: Vector): Vector {
        this.x = other.x;
        this.y = other.y;
        return this;
    }

    clone(): Vector {
        return new Vector(this.x, this.y);
    }

    perp(): Vector {
        const x = this.x;
        this.x = this.y;
        this.y = -x;
        return this;
    }

    rotate(angle: number): Vector {
        const x = this.x;
        const y = this.y;
        this.x = x * Math.cos(angle) - y * Math.sin(angle);
        this.y = x * Math.sin(angle) + y * Math.cos(angle);
        return this;
    }

    reverse(): Vector {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    normalize(): Vector {
        const len = this.len();
        if (len > 0) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    }

    add(other: Vector): Vector {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    sub(other: Vector): Vector {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    scale(x: number, y: number = x): Vector {
        this.x *= x;
        this.y *= y;
        return this;
    }

    project(other: Vector): Vector {
        const amt = this.dot(other) / other.len2();
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }

    projectN(other: Vector): Vector {
        const amt = this.dot(other);
        this.x = amt * other.x;
        this.y = amt * other.y;
        return this;
    }

    reflect(axis: Vector): Vector {
        const x = this.x;
        const y = this.y;
        this.project(axis).scale(2);
        this.x -= x;
        this.y -= y;
        return this;
    }

    reflectN(axis: Vector): Vector {
        const x = this.x;
        const y = this.y;
        this.projectN(axis).scale(2);
        this.x -= x;
        this.y -= y;
        return this;
    }

    dot(other: Vector): number {
        return this.x * other.x + this.y * other.y;
    }

    len2(): number {
        return this.dot(this);
    }

    len(): number {
        return Math.sqrt(this.len2());
    }
}

export class Box {
    pos: Vector;
    w: number;
    h: number;

    constructor(pos: Vector = new Vector(), w: number = 0, h: number = 0) {
        this.pos = pos;
        this.w = w;
        this.h = h;
    }

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

    setPoints(points: Vector[]): Polygon {
        this.points = points;
        this.recalc();
        return this;
    }

    setAngle(angle: number): Polygon {
        this.angle = angle;
        this.recalc();
        return this;
    }

    setOffset(offset: Vector): Polygon {
        this.offset = offset;
        this.recalc();
        return this;
    }

    rotate(angle: number): Polygon {
        const points = this.points;
        const len = points.length;
        for (let i = 0; i < len; i++) {
            points[i].rotate(angle);
        }
        this.recalc();
        return this;
    }

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

export class Circle {
    pos: Vector;
    r: number;
    offset: Vector;

    constructor(pos: Vector = new Vector(), r: number = 0) {
        this.pos = pos;
        this.r = r;
        this.offset = new Vector();
    }

    setOffset(offset: Vector): Circle {
        this.offset = offset;
        return this;
    }

    getAABB(): Polygon {
        const r = this.r;
        const pos = this.pos.clone().add(this.offset);
        return new Box(pos.sub(new Vector(r, r)), r * 2, r * 2).toPolygon();
    }

    getAABBAsBox(): Box {
        const r = this.r;
        const pos = this.pos.clone().add(this.offset);
        return new Box(pos.sub(new Vector(r, r)), r * 2, r * 2);
    }
}

// Collision Response Interface
// Collision Response Class
export class Response {
    a: any;
    b: any;
    overlap: number;
    overlapN: Vector;
    overlapV: Vector;
    aInB: boolean;
    bInA: boolean;

    constructor() {
        this.a = null;
        this.b = null;
        this.overlap = Number.MAX_VALUE;
        this.overlapN = new Vector();
        this.overlapV = new Vector();
        this.aInB = true;
        this.bInA = true;
    }

    clear() {
        this.a = null;
        this.b = null;
        this.overlap = Number.MAX_VALUE;
        this.overlapN.x = 0;
        this.overlapN.y = 0;
        this.overlapV.x = 0;
        this.overlapV.y = 0;
        this.aInB = true;
        this.bInA = true;
    }
}

// Helper Functions

function flattenPointsOn(points: Vector[], normal: Vector, result: number[]) {
    let min = Number.MAX_VALUE;
    let max = -Number.MAX_VALUE;
    const len = points.length;
    for (let i = 0; i < len; i++) {
        const dot = points[i].dot(normal);
        if (dot < min) {
            min = dot;
        }
        if (dot > max) {
            max = dot;
        }
    }
    result[0] = min;
    result[1] = max;
}

function isSeparatingAxis(aPos: Vector, bPos: Vector, aPoints: Vector[], bPoints: Vector[], axis: Vector, response: Response | null): boolean {
    const rangeA = [0, 0];
    const rangeB = [0, 0];
    const offsetV = bPos.clone().sub(aPos);
    const projectedOffset = offsetV.dot(axis);

    flattenPointsOn(aPoints, axis, rangeA);
    flattenPointsOn(bPoints, axis, rangeB);

    rangeB[0] += projectedOffset;
    rangeB[1] += projectedOffset;

    if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
        return true;
    }

    if (response) {
        let overlap = 0;
        if (rangeA[0] < rangeB[0]) {
            response.aInB = false;
            if (rangeA[1] < rangeB[1]) {
                overlap = rangeA[1] - rangeB[0];
                response.bInA = false;
            } else {
                const option1 = rangeA[1] - rangeB[0];
                const option2 = rangeB[1] - rangeA[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
        } else {
            response.bInA = false;
            if (rangeA[1] > rangeB[1]) {
                overlap = rangeA[0] - rangeB[1];
                response.aInB = false;
            } else {
                const option1 = rangeA[1] - rangeB[0];
                const option2 = rangeB[1] - rangeA[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
        }

        const absOverlap = Math.abs(overlap);
        if (absOverlap < response.overlap) {
            response.overlap = absOverlap;
            response.overlapN.copy(axis);
            if (overlap < 0) {
                response.overlapN.reverse();
            }
        }
    }
    return false;
}

export function testPolygonPolygon(a: Polygon, b: Polygon, response: Response | null = null): boolean {
    const aPoints = a.calcPoints;
    const aLen = aPoints.length;
    const bPoints = b.calcPoints;
    const bLen = bPoints.length;

    for (let i = 0; i < aLen; i++) {
        if (isSeparatingAxis(a.pos, b.pos, aPoints, bPoints, a.normals[i], response)) {
            return false;
        }
    }

    for (let i = 0; i < bLen; i++) {
        if (isSeparatingAxis(a.pos, b.pos, aPoints, bPoints, b.normals[i], response)) {
            return false;
        }
    }

    if (response) {
        response.a = a;
        response.b = b;
        response.overlapV.copy(response.overlapN).scale(response.overlap);
    }
    return true;
}

export function testCirclePolygon(circle: Circle, polygon: Polygon, response: Response | null = null): boolean {
    const points = polygon.calcPoints;
    const len = points.length;
    const circlePos = circle.pos.clone().add(circle.offset).sub(polygon.pos);
    let radius2 = circle.r * circle.r;

    // Find the closest vertex on the polygon to the circle center
    let closestDistance = Number.MAX_VALUE;
    let closestVertexIndex = -1;
    for (let i = 0; i < len; i++) {
        const dist2 = circlePos.clone().sub(points[i]).len2();
        if (dist2 < closestDistance) {
            closestDistance = dist2;
            closestVertexIndex = i;
        }
    }

    // Axis from closest vertex to circle center
    const axis = circlePos.clone().sub(points[closestVertexIndex]).normalize();

    // Project polygon and circle onto this axis
    const rangeA = [0, 0];
    flattenPointsOn(points, axis, rangeA);

    const projectedCircleCenter = circlePos.dot(axis);
    const rangeB = [projectedCircleCenter - circle.r, projectedCircleCenter + circle.r];

    if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
        return false;
    }

    // Also check polygon normals
    for (let i = 0; i < len; i++) {
        const axis = polygon.normals[i];
        const rangeA = [0, 0];
        flattenPointsOn(points, axis, rangeA);

        const projectedCircleCenter = circlePos.dot(axis);
        const rangeB = [projectedCircleCenter - circle.r, projectedCircleCenter + circle.r];

        if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
            return false;
        }
    }

    // If we get here, there is a collision
    if (response) {
        response.a = circle;
        response.b = polygon;
        response.overlap = Number.MAX_VALUE;
        response.overlapN = new Vector();
        response.overlapV = new Vector();

        // Check circle axis
        const axis = circlePos.clone().sub(points[closestVertexIndex]).normalize();
        const rangeA = [0, 0];
        flattenPointsOn(points, axis, rangeA);
        const projectedCircleCenter = circlePos.dot(axis);
        const rangeB = [projectedCircleCenter - circle.r, projectedCircleCenter + circle.r];

        let overlap = 0;
        if (rangeA[0] < rangeB[0]) {
            if (rangeA[1] < rangeB[1]) {
                overlap = rangeA[1] - rangeB[0];
            } else {
                const option1 = rangeA[1] - rangeB[0];
                const option2 = rangeB[1] - rangeA[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
        } else {
            if (rangeA[1] > rangeB[1]) {
                overlap = rangeA[0] - rangeB[1];
            } else {
                const option1 = rangeA[1] - rangeB[0];
                const option2 = rangeB[1] - rangeA[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
        }

        let absOverlap = Math.abs(overlap);
        if (absOverlap < response.overlap) {
            response.overlap = absOverlap;
            response.overlapN.copy(axis);
            if (overlap < 0) {
                response.overlapN.reverse();
            }
        }

        // Check polygon axes
        for (let i = 0; i < len; i++) {
            const axis = polygon.normals[i];
            const rangeA = [0, 0];
            flattenPointsOn(points, axis, rangeA);
            const projectedCircleCenter = circlePos.dot(axis);
            const rangeB = [projectedCircleCenter - circle.r, projectedCircleCenter + circle.r];

            let overlap = 0;
            if (rangeA[0] < rangeB[0]) {
                if (rangeA[1] < rangeB[1]) {
                    overlap = rangeA[1] - rangeB[0];
                } else {
                    const option1 = rangeA[1] - rangeB[0];
                    const option2 = rangeB[1] - rangeA[0];
                    overlap = option1 < option2 ? option1 : -option2;
                }
            } else {
                if (rangeA[1] > rangeB[1]) {
                    overlap = rangeA[0] - rangeB[1];
                } else {
                    const option1 = rangeA[1] - rangeB[0];
                    const option2 = rangeB[1] - rangeA[0];
                    overlap = option1 < option2 ? option1 : -option2;
                }
            }

            let absOverlap = Math.abs(overlap);
            if (absOverlap < response.overlap) {
                response.overlap = absOverlap;
                response.overlapN.copy(axis);
                if (overlap < 0) {
                    response.overlapN.reverse();
                }
            }
        }
        response.overlapN.reverse();
        response.overlapV.copy(response.overlapN).scale(response.overlap);
    }

    return true;
}

export function testCircleCircle(a: Circle, b: Circle, response: Response | null = null): boolean {
    const aPos = a.pos.clone().add(a.offset);
    const bPos = b.pos.clone().add(b.offset);
    const differenceV = bPos.clone().sub(aPos);
    const totalRadius = a.r + b.r;
    const totalRadiusSq = totalRadius * totalRadius;
    const distanceSq = differenceV.len2();

    if (distanceSq > totalRadiusSq) {
        return false;
    }

    if (response) {
        const dist = Math.sqrt(distanceSq);
        response.a = a;
        response.b = b;
        response.overlap = totalRadius - dist;
        response.overlapN = differenceV.normalize();
        response.overlapV = differenceV.clone().scale(response.overlap);
        response.aInB = a.r <= b.r && dist <= b.r - a.r;
        response.bInA = b.r <= a.r && dist <= a.r - b.r;
    }

    return true;
}
