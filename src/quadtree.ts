import { Vector } from './vector';
import { Box } from './shapes';

export interface QuadTreeObject {
    getAABBAsBox(): Box;
}

export class QuadTree {
    private bounds: Box;
    private capacity: number;
    private objects: QuadTreeObject[];
    private nodes: QuadTree[];
    private level: number;
    private maxLevels: number;

    constructor(bounds: Box, capacity: number = 4, level: number = 0, maxLevels: number = 5) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.objects = [];
        this.nodes = [];
        this.level = level;
        this.maxLevels = maxLevels;
    }

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

        const startIsTop = pRect.pos.y < horizontalMidpoint;
        const startIsBottom = pRect.pos.y + pRect.h > horizontalMidpoint;
        const startIsLeft = pRect.pos.x < verticalMidpoint;
        const startIsRight = pRect.pos.x + pRect.w > verticalMidpoint;

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

    getAllBounds(boundsList: Box[] = []): Box[] {
        boundsList.push(this.bounds);
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].getAllBounds(boundsList);
        }
        return boundsList;
    }
}
