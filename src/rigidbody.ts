import { Vector } from './vector';
import { Response } from './collision';

/**
 * RigidBody class for 2D physics simulation
 * Supports dynamic and static bodies, forces, impulses, and collision response
 */
export class RigidBody {
    // Position and orientation
    position: Vector;
    angle: number;

    // Linear motion
    velocity: Vector;
    acceleration: Vector;

    // Angular motion
    angularVelocity: number;
    angularAcceleration: number;

    // Physical properties
    mass: number;
    inverseMass: number;

    // Material properties
    restitution: number;  // Bounciness (0 = no bounce, 1 = perfect bounce)
    friction: number;     // Surface friction (0 = ice, 1 = rubber)

    // Force accumulation
    force: Vector;
    torque: number;

    // Static bodies don't move
    isStatic: boolean;

    // Sleep state for optimization
    isSleeping: boolean;
    sleepThreshold: number;
    sleepTimer: number;
    sleepTimerMax: number;

    // Damping to simulate air resistance. These are the fraction of velocity
    // RETAINED PER SECOND (e.g. 0.99 = lose 1%/s), applied via Math.pow(d, dt)
    // so the result is identical regardless of step size. NOTE: this differs
    // from the pre-0.3.0 behavior, where the value was applied once per step
    // (frame-rate dependent — heavier damping at higher FPS).
    linearDamping: number;
    angularDamping: number;

    constructor(
        position: Vector = new Vector(),
        mass: number = 1,
        restitution: number = 0.5,
        friction: number = 0.3
    ) {
        this.position = position;
        this.angle = 0;

        this.velocity = new Vector();
        this.acceleration = new Vector();

        this.angularVelocity = 0;
        this.angularAcceleration = 0;

        this.mass = mass;
        this.inverseMass = mass > 0 ? 1 / mass : 0;
        // Inertia removed as rotation response is disabled

        this.restitution = restitution;
        this.friction = friction;

        this.force = new Vector();
        this.torque = 0;

        this.isStatic = mass === 0;

        this.isSleeping = false;
        this.sleepThreshold = 20.0;
        this.sleepTimer = 0;
        this.sleepTimerMax = 60; // frames

        this.linearDamping = 0.99;
        this.angularDamping = 0.98;
    }

    /**
     * Set the body as static (immovable)
     */
    setStatic(isStatic: boolean): RigidBody {
        this.isStatic = isStatic;
        if (isStatic) {
            this.mass = 0;
            this.inverseMass = 0;
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.angularVelocity = 0;
        }
        return this;
    }

    /**
     * Apply a force to the center of mass
     */
    applyForce(force: Vector): void {
        if (this.isStatic) return;
        this.force.add(force);
    }

    /**
     * Apply an impulse (instant velocity change)
     */
    applyImpulse(impulse: Vector): void {
        if (this.isStatic) return;
        this.velocity.add(impulse.clone().scale(this.inverseMass));
    }

    /**
     * Integrate physics using semi-implicit Euler method.
     *
     * @param dt elapsed time in SECONDS. Velocities are therefore in px/s and
     *   accelerations in px/s² — which is what the internal tuning constants
     *   (maxSpeed = 4000 px/s, the resting-contact threshold) assume. With a
     *   fixed-step RenderLoop, pass `loop.deltaSeconds` (NOT `loop.delta`, which
     *   is milliseconds — that would scale every velocity by 1000×).
     */
    integrate(dt: number): void {
        if (this.isStatic) return;

        if (this.isSleeping) {
            // Clear forces to prevent accumulation while sleeping
            this.force.x = 0;
            this.force.y = 0;
            this.torque = 0;
            return;
        }

        // Update velocity from acceleration (inlined to avoid a per-step clone)
        this.acceleration.copy(this.force).scale(this.inverseMass);
        this.velocity.x += this.acceleration.x * dt;
        this.velocity.y += this.acceleration.y * dt;

        // Angular integration kept for manual control, but no torque from collisions
        // this.angularAcceleration = this.torque * this.inverseInertia; 
        // this.angularVelocity += this.angularAcceleration * dt;

        // Frame-rate-independent damping: raising the per-second retention
        // factor to the dt power yields the same total damping for one big step
        // or many small steps (mirrors the particle system's drag handling).
        this.velocity.scale(Math.pow(this.linearDamping, dt));
        this.angularVelocity *= Math.pow(this.angularDamping, dt);

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.angle += this.angularVelocity * dt;

        this.force.x = 0;
        this.force.y = 0;
        this.torque = 0;

        this.updateSleep();
    }

    /**
     * Update sleep state based on velocity
     */
    private updateSleep(): void {
        const speedSq = this.velocity.len2();
        const angularSpeedSq = this.angularVelocity * this.angularVelocity;

        if (speedSq < this.sleepThreshold && angularSpeedSq < this.sleepThreshold) {
            this.sleepTimer++;
            if (this.sleepTimer > this.sleepTimerMax) {
                this.setSleeping(true);
            }
        } else {
            this.sleepTimer = 0;
            this.isSleeping = false;
        }
    }

    /**
     * Manually set sleep state
     */
    setSleeping(sleeping: boolean): void {
        this.isSleeping = sleeping;
        if (sleeping) {
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.angularVelocity = 0;
            this.force.x = 0;
            this.force.y = 0;
            this.torque = 0;
        } else {
            this.sleepTimer = 0;
        }
    }

    /**
     * Wake up the body
     */
    wake(): void {
        this.setSleeping(false);
    }

    /**
     * Resolve collision using impulse-based response
     * This should be called when a collision is detected with a Response object
     */
    resolveCollision(other: RigidBody, response: Response): void {
        if (this.isStatic && other.isStatic) return;

        // Wake up both bodies
        this.wake();
        other.wake();

        // Move bodies apart to resolve penetration
        const correction = response.overlapV.clone();
        const totalInverseMass = this.inverseMass + other.inverseMass;

        if (totalInverseMass > 0) {
            const percent = 0.4; // Penetration percentage to correct — lower value prevents
                                  // compounding over-corrections in piles of overlapping bodies.
            const slop = 0.5; // Penetration allowance (pixels) — small gaps are ignored to
                               // avoid jittery micro-corrections on resting contacts.
            const correctionMagnitude = Math.max(response.overlap - slop, 0) / totalInverseMass * percent;
            const correctionVector = response.overlapN.clone().scale(correctionMagnitude);

            this.position.sub(correctionVector.clone().scale(this.inverseMass));
            other.position.add(correctionVector.clone().scale(other.inverseMass));
        }

        // Calculate relative velocity
        const relativeVelocity = other.velocity.clone().sub(this.velocity);
        let velocityAlongNormal = relativeVelocity.dot(response.overlapN);
        if (velocityAlongNormal > 0) return;

        // Deep-penetration energy bleed: when bodies are deeply embedded (overlap > 8px)
        // their relative velocity is clamped toward zero along the normal. Without this,
        // a body compressed into a pile receives the full cumulative impulse from every
        // overlapping pair, causing an energy explosion that flings it through surfaces.
        const maxSafeOverlap = 8;
        if (response.overlap > maxSafeOverlap) {
            const bleedFactor = Math.max(0, 1 - (response.overlap - maxSafeOverlap) / maxSafeOverlap);
            velocityAlongNormal *= bleedFactor;
            if (velocityAlongNormal > 0) return;
        }

        // Calculate restitution (bounciness)
        let restitution = Math.min(this.restitution, other.restitution);

        // Resting contact: if the approach velocity is negligible, treat as
        // resting contact (no bounce). Uses a small threshold to suppress
        // micro-bouncing from gravity accumulation without killing real impacts.
        const restingThreshold = -2;
        if (velocityAlongNormal > restingThreshold) {
            restitution = 0;
        }

        // Calculate impulse magnitude
        // J = -(1 + e) * v_rel_n / (1/m1 + 1/m2)
        const invMassSum = totalInverseMass;

        let impulseMagnitude = -(1 + restitution) * velocityAlongNormal;
        impulseMagnitude /= invMassSum;

        // Apply impulse
        const impulse = response.overlapN.clone().scale(impulseMagnitude);
        this.applyImpulse(impulse.clone().reverse());
        other.applyImpulse(impulse);

        // Velocity cap: prevent energy explosion when many impulses compound on the
        // same body within a single frame (common in dense piles under gravity).
        const maxSpeed = 4000; // px/s
        const clampVelocity = (body: RigidBody) => {
            const spd = body.velocity.len();
            if (spd > maxSpeed) body.velocity.scale(maxSpeed / spd);
        };
        if (!this.isStatic) clampVelocity(this);
        if (!other.isStatic) clampVelocity(other);

        // Friction
        const relativeVelocityAfter = other.velocity.clone().sub(this.velocity);

        const tangent = relativeVelocityAfter.clone().sub(response.overlapN.clone().scale(relativeVelocityAfter.dot(response.overlapN)));
        if (tangent.len2() > 0) {
            tangent.normalize();

            const frictionCoefficient = (this.friction + other.friction) * 0.5;
            const frictionMagnitude = -relativeVelocityAfter.dot(tangent) / totalInverseMass;

            // Coulomb's law: friction <= mu * normal_force
            // Here we use impulse: friction_impulse <= mu * normal_impulse
            const maxFriction = Math.abs(impulseMagnitude) * frictionCoefficient;
            const clampedFriction = Math.max(-maxFriction, Math.min(frictionMagnitude, maxFriction));

            const frictionImpulse = tangent.scale(clampedFriction);
            this.applyImpulse(frictionImpulse.clone().reverse());
            other.applyImpulse(frictionImpulse);
        }
    }

    /**
     * Get the kinetic energy of the body
     */
    getKineticEnergy(): number {
        const linearEnergy = 0.5 * this.mass * this.velocity.len2();
        // Angular energy removed
        return linearEnergy;
    }

    /**
     * Get the momentum of the body
     */
    getMomentum(): Vector {
        return this.velocity.clone().scale(this.mass);
    }

    /**
     * Set velocity directly
     */
    setVelocity(x: number, y: number): RigidBody {
        this.velocity.x = x;
        this.velocity.y = y;
        this.wake();
        return this;
    }

    /**
     * Set position directly
     */
    setPosition(x: number, y: number): RigidBody {
        this.position.x = x;
        this.position.y = y;
        return this;
    }

    /**
     * Set mass and recalculate inverse mass
     */
    setMass(mass: number): RigidBody {
        this.mass = mass;
        this.inverseMass = mass > 0 ? 1 / mass : 0;
        this.isStatic = mass === 0;
        return this;
    }
}
