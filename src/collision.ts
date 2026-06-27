import { Vector } from './vector';
import { Polygon, Circle } from './shapes';

// Collision Response Class
export class Response {
    a: Polygon | Circle | null;
    b: Polygon | Circle | null;
    overlap: number;
    overlapN: Vector;
    overlapV: Vector;
    aInB: boolean;
    bInA: boolean;
    contactPoint: Vector;

    constructor() {
        this.a = null;
        this.b = null;
        this.overlap = Number.MAX_VALUE;
        this.overlapN = new Vector();
        this.overlapV = new Vector();
        this.aInB = true;
        this.bInA = true;
        this.contactPoint = new Vector();
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
        this.contactPoint.x = 0;
        this.contactPoint.y = 0;
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

// Module-level scratch reused across every isSeparatingAxis call. SAT runs this
// per candidate axis per pair in the narrow phase; allocating two arrays each
// time was measurable GC churn. Safe because JS is single-threaded and the
// values are fully consumed before the next call.
const _rangeA: number[] = [0, 0];
const _rangeB: number[] = [0, 0];

function isSeparatingAxis(aPos: Vector, bPos: Vector, aPoints: Vector[], bPoints: Vector[], axis: Vector, response: Response | null): boolean {
    const rangeA = _rangeA;
    const rangeB = _rangeB;
    // Inlined (bPos - aPos)·axis to avoid a Vector allocation per call.
    const projectedOffset = (bPos.x - aPos.x) * axis.x + (bPos.y - aPos.y) * axis.y;

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

// computeContactPoint defaults to false: RigidBody disables rotational response,
// so the contact point is unused and its support-point search is wasted work in
// the narrow phase. Opt in only if you consume response.contactPoint directly.
export function testPolygonPolygon(a: Polygon, b: Polygon, response: Response | null = null, computeContactPoint: boolean = false): boolean {
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

        if (computeContactPoint) {
            // Approximate contact point: the centroid of the support points of 'a'
            // along the collision normal (handles face-face collisions). This is a
            // simplification — a full contact manifold would be more accurate but
            // is unnecessary without rotational response.
            let maxDist = -Number.MAX_VALUE;
            for (let i = 0; i < aPoints.length; i++) {
                const dist = aPoints[i].dot(response.overlapN);
                if (dist > maxDist) {
                    maxDist = dist;
                }
            }

            // Collect all points close to maxDist (within epsilon) to handle face-face collisions
            const epsilon = 0.1;
            let supportPointsX = 0;
            let supportPointsY = 0;
            let supportPointsCount = 0;

            for (let i = 0; i < aPoints.length; i++) {
                const dist = aPoints[i].dot(response.overlapN);
                if (dist > maxDist - epsilon) {
                    supportPointsX += aPoints[i].x;
                    supportPointsY += aPoints[i].y;
                    supportPointsCount++;
                }
            }

            if (supportPointsCount > 0) {
                response.contactPoint.x = supportPointsX / supportPointsCount;
                response.contactPoint.y = supportPointsY / supportPointsCount;
                // Convert to world space
                response.contactPoint.add(a.pos);
            }
        }
    }
    return true;
}

export function testCirclePolygon(circle: Circle, polygon: Polygon, response: Response | null = null, computeContactPoint: boolean = false): boolean {
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

        if (computeContactPoint) {
            // Contact point is the closest vertex on the polygon
            response.contactPoint.copy(points[closestVertexIndex]).add(polygon.pos);
        }
    }

    return true;
}

export function testCircleCircle(a: Circle, b: Circle, response: Response | null = null, computeContactPoint: boolean = false): boolean {
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
        response.overlapN.copy(differenceV).normalize();
        response.overlapV.copy(response.overlapN).scale(response.overlap);
        response.aInB = a.r <= b.r && dist <= b.r - a.r;
        response.bInA = b.r <= a.r && dist <= a.r - b.r;

        if (computeContactPoint) {
            // Contact point is on the line connecting centers (point on B closest to A)
            const dir = differenceV.normalize();
            response.contactPoint.copy(bPos).sub(dir.scale(b.r));
        }
    }

    return true;
}
