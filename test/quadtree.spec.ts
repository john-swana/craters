import { expect } from 'chai';
import { QuadTree, QuadTreeObject } from '../src/quadtree';
import { Box, Vector } from '../src/sat';

class MockObject implements QuadTreeObject {
    box: Box;
    constructor(x: number, y: number, w: number, h: number) {
        this.box = new Box(new Vector(x, y), w, h);
    }
    getAABBAsBox(): Box {
        return this.box;
    }
}

describe('QuadTree', () => {
    it('should insert objects', () => {
        const bounds = new Box(new Vector(0, 0), 100, 100);
        const qt = new QuadTree(bounds);
        const obj = new MockObject(10, 10, 10, 10);
        qt.insert(obj);
        const retrieved: QuadTreeObject[] = [];
        qt.retrieve(retrieved, obj);
        expect(retrieved).to.include(obj);
    });

    it('should split when capacity is exceeded', () => {
        const bounds = new Box(new Vector(0, 0), 100, 100);
        const qt = new QuadTree(bounds, 1); // Capacity 1
        const obj1 = new MockObject(10, 10, 10, 10); // Top-Left
        const obj2 = new MockObject(60, 60, 10, 10); // Bottom-Right
        qt.insert(obj1);
        qt.insert(obj2);

        // Should be in different nodes now
        const retrieved1: QuadTreeObject[] = [];
        qt.retrieve(retrieved1, obj1);
        expect(retrieved1).to.include(obj1);
        expect(retrieved1).to.not.include(obj2);

        const retrieved2: QuadTreeObject[] = [];
        qt.retrieve(retrieved2, obj2);
        expect(retrieved2).to.include(obj2);
        expect(retrieved2).to.not.include(obj1);
    });

    it('should handle objects overlapping multiple nodes', () => {
        const bounds = new Box(new Vector(0, 0), 100, 100);
        const qt = new QuadTree(bounds, 1);
        const obj1 = new MockObject(45, 45, 10, 10); // Center overlap
        qt.insert(obj1);

        // Force split by adding another object far away
        const obj2 = new MockObject(10, 10, 5, 5);
        qt.insert(obj2);

        const retrieved: QuadTreeObject[] = [];
        qt.retrieve(retrieved, new MockObject(0, 0, 100, 100)); // Retrieve everything
        expect(retrieved).to.include(obj1);
    });

    it('should clear', () => {
        const bounds = new Box(new Vector(0, 0), 100, 100);
        const qt = new QuadTree(bounds);
        const obj = new MockObject(10, 10, 10, 10);
        qt.insert(obj);
        qt.clear();
        const retrieved: QuadTreeObject[] = [];
        qt.retrieve(retrieved, obj);
        expect(retrieved.length).to.equal(0);
    });

    it('should get all bounds', () => {
        const bounds = new Box(new Vector(0, 0), 100, 100);
        const qt = new QuadTree(bounds, 1);
        qt.insert(new MockObject(10, 10, 10, 10));
        qt.insert(new MockObject(60, 60, 10, 10));

        const allBounds = qt.getAllBounds();
        // Root + 4 children = 5 bounds
        expect(allBounds.length).to.equal(5);
    });
});
