import { Vector } from './vector';
import { Box } from './shapes';

/** Anything that can be stored in a {@link QuadTree}: it must report its axis-aligned bounding box. `SAT.Polygon` and `SAT.Circle` qualify. */
export interface QuadTreeObject {
    getAABBAsBox(): Box;
}

/**
 * Region quadtree for broad-phase collision detection. A node splits into four
 * quadrants when it holds more than `capacity` objects and its level is below
 * `maxLevels`. An object is stored in every quadrant its AABB overlaps.
 */
export class QuadTree {
    private bounds: Box;
    private capacity: number;
    private objects: QuadTreeObject[];
    private nodes: QuadTree[];
    private level: number;
    private maxLevels: number;

    /**
     * @param bounds AABB of this node; for the root, size it to the whole world.
     * @param capacity objects a node holds before it splits (default 4).
     * @param level depth of this node: 0 for the root (children are created internally).
     * @param maxLevels maximum depth; nodes at this level never split and hold any number of objects (default 5).
     */
    constructor(bounds: Box, capacity: number = 4, level: number = 0, maxLevels: number = 5) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.objects = [];
        this.nodes = [];
        this.level = level;
        this.maxLevels = maxLevels;
    }

    /** Removes all objects and child nodes. Call before re-inserting each frame. */
    clear(): void {
        this.objects = [];
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i]) {
                this.nodes[i].clear();
            }
        }
        this.nodes = [];
    }

    private split(): void {
        const subWidth = this.bounds.w / 2;
        const subHeight = this.bounds.h / 2;
        const x = this.bounds.pos.x;
        const y = this.bounds.pos.y;

        this.nodes[0] = new QuadTree(new Box(new Vector(x + subWidth, y), subWidth, subHeight), this.capacity, this.level + 1, this.maxLevels);
        this.nodes[1] = new QuadTree(new Box(new Vector(x, y), subWidth, subHeight), this.capacity, this.level + 1, this.maxLevels);
        this.nodes[2] = new QuadTree(new Box(new Vector(x, y + subHeight), subWidth, subHeight), this.capacity, this.level + 1, this.maxLevels);
        this.nodes[3] = new QuadTree(new Box(new Vector(x + subWidth, y + subHeight), subWidth, subHeight), this.capacity, this.level + 1, this.maxLevels);
    }

    private getIndex(pRect: Box): number[] {
        const indexes: number[] = [];
        const verticalMidpoint = this.bounds.pos.x + (this.bounds.w / 2);
        const horizontalMidpoint = this.bounds.pos.y + (this.bounds.h / 2);

        // A zero-width box lying exactly on the vertical split line (or a zero-height
        // box on the horizontal one) passes neither strict test below, so it would
        // match no child. Treat it as touching both sides of that line.
        const onVerticalLine = pRect.w === 0 && pRect.pos.x === verticalMidpoint;
        const onHorizontalLine = pRect.h === 0 && pRect.pos.y === horizontalMidpoint;

        const startIsTop = pRect.pos.y < horizontalMidpoint || onHorizontalLine;
        const startIsBottom = pRect.pos.y + pRect.h > horizontalMidpoint || onHorizontalLine;
        const startIsLeft = pRect.pos.x < verticalMidpoint || onVerticalLine;
        const startIsRight = pRect.pos.x + pRect.w > verticalMidpoint || onVerticalLine;

        // Top-Right
        if (startIsTop && startIsRight) {
            indexes.push(0);
        }
        // Top-Left
        if (startIsTop && startIsLeft) {
            indexes.push(1);
        }
        // Bottom-Left
        if (startIsBottom && startIsLeft) {
            indexes.push(2);
        }
        // Bottom-Right
        if (startIsBottom && startIsRight) {
            indexes.push(3);
        }

        return indexes;
    }

    /** Inserts an object into every leaf its AABB overlaps, splitting nodes that exceed `capacity`. */
    insert(obj: QuadTreeObject): void {
        if (this.nodes.length) {
            const indexes = this.getIndex(obj.getAABBAsBox());
            for (let i = 0; i < indexes.length; i++) {
                this.nodes[indexes[i]].insert(obj);
            }
            return;
        }

        this.objects.push(obj);

        if (this.objects.length > this.capacity && this.level < this.maxLevels) {
            if (!this.nodes.length) {
                this.split();
            }

            for (let i = 0; i < this.objects.length; i++) {
                const indexes = this.getIndex(this.objects[i].getAABBAsBox());
                for (let k = 0; k < indexes.length; k++) {
                    this.nodes[indexes[k]].insert(this.objects[i]);
                }
            }
            this.objects = [];
        }
    }

    /**
     * Appends every object stored in the leaves `obj`'s AABB overlaps to
     * `returnObjects` and returns that same array. The array is not cleared first.
     *
     * An object whose AABB straddles a split boundary is stored in every child it
     * overlaps, so this may return the same object multiple times (and `obj` itself
     * if it is in the tree). Callers doing pairwise collision checks must dedupe
     * (see {@link retrieveUnique}).
     *
     * Bounds are not enforced: quadrants are chosen by comparing against each node's
     * midpoints only, so an object outside the root bounds is kept and routed to the
     * node(s) on the nearest edge or corner, where such objects pile up. Size the
     * QuadTree to the world. A box with zero width lying exactly on a vertical split
     * line (or zero height on a horizontal one) is treated as touching both sides of
     * that line, so it is stored in, and retrieved from, the children on each side.
     */
    retrieve(returnObjects: QuadTreeObject[], obj: QuadTreeObject): QuadTreeObject[] {
        const indexes = this.getIndex(obj.getAABBAsBox());
        if (this.nodes.length) {
            for (let i = 0; i < indexes.length; i++) {
                this.nodes[indexes[i]].retrieve(returnObjects, obj);
            }
        }


        for (let i = 0; i < this.objects.length; i++) {
            returnObjects.push(this.objects[i]);
        }

        return returnObjects;
    }

    /**
     * Like {@link retrieve} with a fresh array, but removes duplicates caused by
     * boundary-straddling objects appearing in multiple child nodes. Prefer this
     * for collision queries.
     */
    retrieveUnique(obj: QuadTreeObject): QuadTreeObject[] {
        return Array.from(new Set(this.retrieve([], obj)));
    }

    /** Appends the bounds of this node and every descendant to `boundsList` and returns it (for debug drawing). */
    getAllBounds(boundsList: Box[] = []): Box[] {
        boundsList.push(this.bounds);
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].getAllBounds(boundsList);
        }
        return boundsList;
    }
}
