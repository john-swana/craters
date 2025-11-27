import { expect } from 'chai';
import { Vector, Box, Polygon, Circle, testPolygonPolygon, testCirclePolygon, testCircleCircle, Response } from '../src/sat';

describe('SAT Library', () => {
    describe('Vector', () => {
        it('should create a vector', () => {
            const v = new Vector(10, 20);
            expect(v.x).to.equal(10);
            expect(v.y).to.equal(20);
        });

        it('should calculate length', () => {
            const v = new Vector(3, 4);
            expect(v.len()).to.equal(5);
        });

        it('should normalize', () => {
            const v = new Vector(3, 4);
            v.normalize();
            expect(v.x).to.be.closeTo(0.6, 0.001);
            expect(v.y).to.be.closeTo(0.8, 0.001);
        });

        it('should add vectors', () => {
            const v1 = new Vector(1, 2);
            const v2 = new Vector(3, 4);
            v1.add(v2);
            expect(v1.x).to.equal(4);
            expect(v1.y).to.equal(6);
        });
    });

    describe('Box', () => {
        it('should convert to polygon', () => {
            const box = new Box(new Vector(0, 0), 10, 10);
            const poly = box.toPolygon();
            expect(poly.points.length).to.equal(4);
            expect(poly.points[1].x).to.equal(10);
            expect(poly.points[1].y).to.equal(0);
            expect(poly.points[2].x).to.equal(10);
            expect(poly.points[2].y).to.equal(10);
        });
    });

    describe('Collision', () => {
        it('should detect polygon-polygon collision', () => {
            const box1 = new Box(new Vector(0, 0), 10, 10).toPolygon();
            const box2 = new Box(new Vector(5, 5), 10, 10).toPolygon();
            expect(testPolygonPolygon(box1, box2)).to.be.true;
        });

        it('should detect no polygon-polygon collision', () => {
            const box1 = new Box(new Vector(0, 0), 10, 10).toPolygon();
            const box2 = new Box(new Vector(20, 20), 10, 10).toPolygon();
            expect(testPolygonPolygon(box1, box2)).to.be.false;
        });

        it('should detect circle-polygon collision', () => {
            const circle = new Circle(new Vector(5, 5), 5);
            const box = new Box(new Vector(0, 0), 10, 10).toPolygon();
            expect(testCirclePolygon(circle, box)).to.be.true;
        });

        it('should detect no circle-polygon collision', () => {
            const circle = new Circle(new Vector(20, 20), 5);
            const box = new Box(new Vector(0, 0), 10, 10).toPolygon();
            expect(testCirclePolygon(circle, box)).to.be.false;
        });

        it('should provide response for polygon-polygon collision', () => {
            const box1 = new Box(new Vector(0, 0), 10, 10).toPolygon();
            const box2 = new Box(new Vector(5, 0), 10, 10).toPolygon();
            const response = new Response();
            const collided = testPolygonPolygon(box1, box2, response);
            expect(collided).to.be.true;
            expect(response.overlap).to.equal(5);
            expect(response.overlapV.x).to.equal(5);
            expect(response.overlapV.y).to.equal(0);
        });

        it('should clear response', () => {
            const response = new Response();
            response.a = {};
            response.b = {};
            response.overlap = 10;
            response.clear();
            expect(response.a).to.be.null;
            expect(response.b).to.be.null;
            expect(response.overlap).to.equal(Number.MAX_VALUE);
        });
    });
    describe('Vector Extended', () => {
        it('should copy vector', () => {
            const v1 = new Vector(10, 20);
            const v2 = new Vector();
            v2.copy(v1);
            expect(v2.x).to.equal(10);
            expect(v2.y).to.equal(20);
        });

        it('should clone vector', () => {
            const v1 = new Vector(10, 20);
            const v2 = v1.clone();
            expect(v2.x).to.equal(10);
            expect(v2.y).to.equal(20);
            expect(v2).to.not.equal(v1);
        });

        it('should calculate perpendicular', () => {
            const v = new Vector(10, 20);
            v.perp();
            expect(v.x).to.equal(20);
            expect(v.y).to.equal(-10);
        });

        it('should rotate vector', () => {
            const v = new Vector(10, 0);
            v.rotate(Math.PI / 2);
            expect(v.x).to.be.closeTo(0, 0.001);
            expect(v.y).to.be.closeTo(10, 0.001);
        });

        it('should reverse vector', () => {
            const v = new Vector(10, 20);
            v.reverse();
            expect(v.x).to.equal(-10);
            expect(v.y).to.equal(-20);
        });

        it('should subtract vectors', () => {
            const v1 = new Vector(10, 20);
            const v2 = new Vector(5, 5);
            v1.sub(v2);
            expect(v1.x).to.equal(5);
            expect(v1.y).to.equal(15);
        });

        it('should scale vector', () => {
            const v = new Vector(10, 20);
            v.scale(2, 0.5);
            expect(v.x).to.equal(20);
            expect(v.y).to.equal(10);
        });

        it('should project vector', () => {
            const v1 = new Vector(10, 10);
            const v2 = new Vector(10, 0);
            v1.project(v2);
            expect(v1.x).to.equal(10);
            expect(v1.y).to.equal(0);
        });

        it('should project vector onto unit vector', () => {
            const v1 = new Vector(10, 10);
            const v2 = new Vector(1, 0); // Unit vector
            v1.projectN(v2);
            expect(v1.x).to.equal(10);
            expect(v1.y).to.equal(0);
        });

        it('should reflect vector with normal', () => {
            const v1 = new Vector(10, 10);
            const normal = new Vector(0, 1);
            v1.reflectN(normal);
            expect(v1.x).to.equal(-10);
            expect(v1.y).to.equal(10);
        });

        it('should reflect vector', () => {
            const v1 = new Vector(10, 10);
            const axis = new Vector(0, 1);
            v1.reflect(axis);
            expect(v1.x).to.equal(-10);
            expect(v1.y).to.equal(10);
        });

        it('should calculate dot product', () => {
            const v1 = new Vector(10, 0);
            const v2 = new Vector(0, 10);
            expect(v1.dot(v2)).to.equal(0);
            const v3 = new Vector(10, 0);
            expect(v1.dot(v3)).to.equal(100);
        });

        it('should calculate length squared', () => {
            const v = new Vector(3, 4);
            expect(v.len2()).to.equal(25);
        });
    });

    describe('Polygon', () => {
        it('should set points', () => {
            const poly = new Polygon();
            poly.setPoints([new Vector(0, 0), new Vector(10, 0), new Vector(10, 10)]);
            expect(poly.points.length).to.equal(3);
            expect(poly.calcPoints.length).to.equal(3);
        });

        it('should rotate polygon', () => {
            const poly = new Box(new Vector(0, 0), 10, 10).toPolygon();
            poly.setAngle(Math.PI / 2);
            expect(poly.angle).to.equal(Math.PI / 2);
            // Check a point, e.g. (10, 0) rotated 90 deg should be (0, 10)
            // But wait, rotation is around (0,0) of the polygon's local space + pos
            // The box is at (0,0). Points are (0,0), (10,0), (10,10), (0,10).
            // Rotated 90 deg: (0,0), (0,10), (-10,10), (-10,0)
            expect(poly.calcPoints[1].x).to.be.closeTo(0, 0.001);
            expect(poly.calcPoints[1].y).to.be.closeTo(10, 0.001);
        });

        it('should set offset', () => {
            const poly = new Box(new Vector(0, 0), 10, 10).toPolygon();
            poly.setOffset(new Vector(5, 5));
            expect(poly.offset.x).to.equal(5);
            expect(poly.offset.y).to.equal(5);
            expect(poly.calcPoints[0].x).to.equal(5);
            expect(poly.calcPoints[0].y).to.equal(5);
        });

        it('should translate', () => {
            const poly = new Box(new Vector(0, 0), 10, 10).toPolygon();
            poly.translate(5, 5);
            expect(poly.points[0].x).to.equal(5);
            expect(poly.points[0].y).to.equal(5);
        });

        it('should get AABB', () => {
            const poly = new Polygon(new Vector(0, 0), [new Vector(0, 0), new Vector(10, 5), new Vector(5, 10)]);
            const aabb = poly.getAABB();
            // Min x=0, Max x=10, Min y=0, Max y=10. Width 10, Height 10.
            expect(aabb.points[2].x).to.equal(10); // w
            expect(aabb.points[2].y).to.equal(10); // h
        });

        it('should get Centroid', () => {
            const box = new Box(new Vector(0, 0), 10, 10).toPolygon();
            const centroid = box.getCentroid();
            expect(centroid.x).to.be.closeTo(5, 0.001);
            expect(centroid.y).to.be.closeTo(5, 0.001);
        });
    });

    describe('Circle', () => {
        it('should set offset', () => {
            const circle = new Circle(new Vector(0, 0), 10);
            circle.setOffset(new Vector(5, 5));
            expect(circle.offset.x).to.equal(5);
            expect(circle.offset.y).to.equal(5);
        });

        it('should get AABB', () => {
            const circle = new Circle(new Vector(10, 10), 5);
            const aabb = circle.getAABB();
            // Center (10,10), r=5. Box from (5,5) to (15,15).
            // Box pos is (5,5). w=10, h=10.
            // Polygon points relative to pos (5,5): (0,0), (10,0), (10,10), (0,10) -> Absolute: (5,5), (15,5), (15,15), (5,15)
            // Wait, Box.toPolygon creates points relative to (0,0) then adds pos?
            // Box constructor: pos, w, h.
            // toPolygon: new Polygon(pos, [ (0,0), (w,0), ... ])
            // Polygon constructor: pos, points.
            // recalc: p = points[i].clone().add(offset).rotate(angle).
            // So points are relative to polygon pos.
            // So AABB polygon pos is (5,5). Points are (0,0)...
            expect(aabb.pos.x).to.equal(5);
            expect(aabb.pos.y).to.equal(5);
            expect(aabb.points[2].x).to.equal(10);
            expect(aabb.points[2].y).to.equal(10);
        });
    });

    describe('Collision Extended', () => {
        it('should detect circle-circle collision', () => {
            const circle1 = new Circle(new Vector(0, 0), 10);
            const circle2 = new Vector(15, 0); // Center at (15,0), radius 10. Overlap 5.
            const c2 = new Circle(circle2, 10);
            expect(testCircleCircle(circle1, c2)).to.be.true;
        });

        it('should detect no circle-circle collision', () => {
            const circle1 = new Circle(new Vector(0, 0), 10);
            const circle2 = new Circle(new Vector(25, 0), 10);
            expect(testCircleCircle(circle1, circle2)).to.be.false;
        });

        it('should provide response for circle-circle collision', () => {
            const circle1 = new Circle(new Vector(0, 0), 10);
            const circle2 = new Circle(new Vector(15, 0), 10);
            const response = new Response();
            const collided = testCircleCircle(circle1, circle2, response);

            expect(collided).to.be.true;
            expect(response.overlap).to.be.closeTo(5, 0.001);
            expect(response.overlapN.x).to.be.closeTo(1, 0.001); // Vector from A to B? 
            // Wait, differenceV = bPos - aPos = (15,0) - (0,0) = (15,0). Normalized = (1,0).
            // So overlapN is (1,0).
            expect(response.overlapN.y).to.be.closeTo(0, 0.001);
            expect(response.overlapV.x).to.be.closeTo(5, 0.001);
        });

        it('should provide response for circle-polygon collision', () => {
            const circle = new Circle(new Vector(5, 5), 5);
            const box = new Box(new Vector(5, 0), 10, 10).toPolygon(); // Box at (5,0) to (15,10)
            // Circle at (5,5) radius 5. Overlaps box.
            // Circle center (5,5). Box left edge x=5.
            // Overlap should be significant.
            // Wait, Box at (5,0). Points: (0,0)->(5,0), (10,0)->(15,0), etc.
            // Box x range: 5 to 15.
            // Circle x range: 0 to 10.
            // Overlap x: 5 to 10. Amount 5.

            const response = new Response();
            const collided = testCirclePolygon(circle, box, response);
            expect(collided).to.be.true;
            expect(response.overlap).to.be.closeTo(5, 0.001);
            // Overlap vector should push circle out of box? Or box out of circle?
            // Usually pushes A out of B.
            // Circle is A. Box is B.
            // Circle needs to move Left (negative x) to get out?
            // Or Box needs to move Right?
            // Let's check the vector direction.
            expect(Math.abs(response.overlapV.x)).to.be.closeTo(5, 0.001);
            expect(response.overlapV.y).to.be.closeTo(0, 0.001);

            // Verify Normal Direction (Should be A -> B, i.e., Circle -> Polygon)
            // Circle at (5,5). Box at (5,0) [Range 5-15].
            // Circle is to the Left of the Box center?
            // Box center is (10, 5). Circle is (5, 5).
            // So Circle is Left. Box is Right.
            // Normal A->B should point Right (Positive X).
            expect(response.overlapN.x).to.be.closeTo(1, 0.001);
            expect(response.overlapN.y).to.be.closeTo(0, 0.001);
        });
    });
});
