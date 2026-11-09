import { Vector } from './vector';
import { Response } from './collision';

/**
 * RigidBody class for 2D physics simulation.
 * Supports dynamic and static bodies, forces, impulses, and collision response.
 *
 * Units: positions in px, time in seconds, velocities in px/s, accelerations in
 * px/s², angles in radians. Collision response is single-pass and impulse-based;
 * collisions and forces never rotate a body (there is no inertia/torque model).
 * Pair a body with a SAT shape and copy `position` to `shape.pos` after
 * {@link RigidBody.integrate} and {@link RigidBody.resolveCollision}.
 *
 * Sleeping: a body that stays slow for {@link RigidBody.sleepTimerMax} steps
 * falls asleep and is skipped until woken. Apply per-step forces such as
 * gravity with `applyForce(force, false)` so resting bodies can fall asleep.
 */
export class RigidBody {
    /** Position in px: the point that matches the paired shape's `pos`. Stored by reference (not copied). */
    position: Vector;
    /** Rotation in radians. Changes only through a manually set {@link RigidBody.angularVelocity}. */
    angle: number;

    /** Linear velocity in px/s. */
    velocity: Vector;
    /** `force × inverseMass` from the last {@link RigidBody.integrate} step, in px/s². Overwritten every step. */
    acceleration: Vector;

    /** Angular velocity in rad/s. Never changed by collisions or forces; set it manually. */
    angularVelocity: number;
    /** Not used by the integrator (there is no torque/inertia model). */
    angularAcceleration: number;

    /**
     * Mass. Change it with {@link RigidBody.setMass}: assigning it directly does
     * not update {@link RigidBody.inverseMass} or {@link RigidBody.isStatic}.
     */
    mass: number;
    /** `1 / mass`, or 0 for static bodies. Used by all dynamics. */
    inverseMass: number;

    /**
     * Bounciness, 0 = no bounce, 1 = perfect bounce. A colliding pair uses the
     * lower of the two values; it is ignored (treated as 0) for resting contacts
     * (see {@link RigidBody.resolveCollision}).
     */
    restitution: number;
    /** Surface friction, 0 = ice, 1 = rubber. A colliding pair uses the average of the two values. */
    friction: number;

    /** Accumulated force (from {@link RigidBody.applyForce}); cleared by every {@link RigidBody.integrate} call. */
    force: Vector;
    /** Not used by the integrator (there is no torque/inertia model). */
    torque: number;

    // Velocity gained from forces in the last integrate() step (zero while static
    // or asleep). resolveCollision uses it to tell a resting contact, where a body
    // is pressed against a surface by e.g. gravity, from a real impact.
    private forceDv: Vector;

    /** Static bodies never move. Set via a mass of 0, {@link RigidBody.setStatic} or {@link RigidBody.setMass}. */
    isStatic: boolean;

    /** Whether the body is asleep (skipped by {@link RigidBody.integrate}). */
    isSleeping: boolean;
    /**
     * Sleep threshold, compared with the SQUARED linear speed ((px/s)²) and the
     * squared angular speed ((rad/s)²). Default 20, i.e. below about 4.5 px/s.
     */
    sleepThreshold: number;
    /** Consecutive {@link RigidBody.integrate} calls spent below {@link RigidBody.sleepThreshold}. */
    sleepTimer: number;
    /**
     * Number of slow {@link RigidBody.integrate} calls (steps, not frames) before
     * the body sleeps: it falls asleep once {@link RigidBody.sleepTimer} exceeds
     * this value. Default 60.
     */
    sleepTimerMax: number;

    /**
     * Linear damping to simulate air resistance: the fraction of velocity
     * RETAINED PER SECOND (e.g. 0.99 = lose 1%/s; 1 = no damping), applied via
     * `Math.pow(d, dt)` so the result does not depend on step size. Lower values
     * damp more. Default 0.99. NOTE: before 0.3.0 the value was applied once per
     * step (frame-rate dependent — heavier damping at higher FPS).
     */
    linearDamping: number;
    /** Angular damping: fraction of angular velocity retained per second, like {@link RigidBody.linearDamping}. Default 0.98. */
    angularDamping: number;

    /**
     * @param position position in px; stored by reference (not copied)
     * @param mass mass; 0 creates a static body
     * @param restitution bounciness, 0–1
     * @param friction surface friction, 0–1
     */
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
        this.forceDv = new Vector();

        this.isStatic = mass === 0;

        this.isSleeping = false;
        this.sleepThreshold = 20.0;
        this.sleepTimer = 0;
        this.sleepTimerMax = 60; // integrate() calls (steps), not frames

        this.linearDamping = 0.99;
        this.angularDamping = 0.98;
    }

    /**
     * Set the body as static (immovable).
     *
     * `setStatic(true)` zeroes mass, inverse mass, velocity and angular velocity.
     * `setStatic(false)` only clears the flag: mass and inverse mass stay 0, so
     * the body still cannot move. To make it dynamic again use
     * {@link RigidBody.setMass} with a mass > 0.
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
     * Apply a force (mass × px/s²) to the center of mass. It accumulates until
     * the next {@link RigidBody.integrate}, which clears it, so apply continuous
     * forces (e.g. gravity) every step. Ignored by static bodies.
     *
     * @param force the force to add
     * @param wake wake the body and restart its sleep timer, like
     *   {@link RigidBody.wake} (default true). Pass `false` for forces applied
     *   every step, such as gravity, so a resting body can fall asleep; a
     *   sleeping body then ignores the force and stays asleep.
     */
    applyForce(force: Vector, wake: boolean = true): void {
        if (this.isStatic) return;
        if (wake) this.wake();
        else if (this.isSleeping) return;
        this.force.add(force);
    }

    /**
     * Apply an impulse (instant velocity change): `velocity += impulse × inverseMass`.
     * Ignored by static bodies.
     *
     * @param impulse the impulse to apply
     * @param wake wake the body and restart its sleep timer, like
     *   {@link RigidBody.wake} (default true). With `false` a sleeping body
     *   ignores the impulse and stays asleep.
     */
    applyImpulse(impulse: Vector, wake: boolean = true): void {
        if (this.isStatic) return;
        if (wake) this.wake();
        else if (this.isSleeping) return;
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
     *
     * Static bodies are skipped. The sleep state is updated first, from the
     * velocity the previous step left behind (after its collision response), and
     * a sleeping body only has its forces cleared. Otherwise:
     * velocity += force/mass·dt, damping, position += velocity·dt,
     * angle += angularVelocity·dt, forces cleared.
     */
    integrate(dt: number): void {
        if (this.isStatic) return;

        // Evaluate sleep on the velocity left after the previous step's collision
        // response. Checking after this step's forces instead would always see at
        // least one step of gravity, so a resting body could never fall asleep.
        if (!this.isSleeping) this.updateSleep();

        if (this.isSleeping) {
            // Clear forces to prevent accumulation while sleeping
            this.force.x = 0;
            this.force.y = 0;
            this.torque = 0;
            this.forceDv.x = 0;
            this.forceDv.y = 0;
            return;
        }

        // Update velocity from acceleration (inlined to avoid a per-step clone)
        this.acceleration.copy(this.force).scale(this.inverseMass);
        this.forceDv.x = this.acceleration.x * dt;
        this.forceDv.y = this.acceleration.y * dt;
        this.velocity.x += this.forceDv.x;
        this.velocity.y += this.forceDv.y;

        // Torque is not integrated (no inertia model), so `torque` has no effect.
        // A manually set angularVelocity is still damped and integrated below.
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
     * Manually set sleep state. `true` zeroes velocity, angular velocity and
     * accumulated forces; `false` resets {@link RigidBody.sleepTimer}.
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
            this.forceDv.x = 0;
            this.forceDv.y = 0;
        } else {
            this.sleepTimer = 0;
        }
    }

    /**
     * Wake up the body and restart its sleep timer. Same as `setSleeping(false)`.
     */
    wake(): void {
        this.setSleeping(false);
    }

    /**
     * Resolve a collision using impulse-based response.
     *
     * Argument order matters: `response` must come from a SAT test whose FIRST
     * shape belongs to this body, i.e. `testPolygonPolygon(thisShape, otherShape, response)`
     * (`response.overlapN` points from this body toward `other`). Swapping the
     * order pushes the bodies into each other.
     *
     * Resting contact: an approach slower than 2 px/s plus the normal velocity
     * the two bodies gained from forces in their last step (e.g. one step of
     * gravity) counts as resting rather than as an impact.
     *
     * Steps: returns if both bodies are static; wakes a sleeping body only if the
     * contact is an impact (resting and separating contacts leave it asleep, and
     * awake bodies keep their sleep timers); a body that is still asleep acts as
     * immovable for this contact; moves the bodies apart along the normal by 40%
     * of `(overlap − 0.5 px)`, split by inverse mass; returns if already
     * separating; scales the approach speed down for overlaps > 8 px (to zero at
     * 16 px); applies a normal impulse with `min(restitution)` (0 for resting
     * contacts); caps each dynamic body's speed at 4000 px/s; applies Coulomb
     * friction with the average friction. No rotation is produced.
     *
     * Positions change, so re-sync shapes (`shape.pos.copy(body.position)`) afterwards.
     */
    resolveCollision(other: RigidBody, response: Response): void {
        if (this.isStatic && other.isStatic) return;

        const n = response.overlapN;

        // Resting-contact threshold along the normal (negative = approaching): a body
        // pressed against a surface by a force arrives with about one step of that
        // force's velocity every step, so that much (plus 2 px/s) is not an impact.
        const forceSpeedA = this.isStatic ? 0 : Math.abs(this.forceDv.x * n.x + this.forceDv.y * n.y);
        const forceSpeedB = other.isStatic ? 0 : Math.abs(other.forceDv.x * n.x + other.forceDv.y * n.y);
        const restingThreshold = -(2 + forceSpeedA + forceSpeedB);

        // Wake a sleeping body only for an impact. Waking on every contact would
        // keep resting bodies (and the bodies stacked on them) awake forever.
        const approach = (other.velocity.x - this.velocity.x) * n.x + (other.velocity.y - this.velocity.y) * n.y;
        if (approach < restingThreshold) {
            if (this.isSleeping) this.wake();
            if (other.isSleeping) other.wake();
        }

        // A body that is still asleep acts as immovable for this contact.
        const inverseMassA = this.isSleeping ? 0 : this.inverseMass;
        const inverseMassB = other.isSleeping ? 0 : other.inverseMass;
        const totalInverseMass = inverseMassA + inverseMassB;
        if (totalInverseMass === 0) return;

        // Move bodies apart to resolve penetration
        if (totalInverseMass > 0) {
            const percent = 0.4; // Penetration percentage to correct — lower value prevents
                                  // compounding over-corrections in piles of overlapping bodies.
            const slop = 0.5; // Penetration allowance (pixels) — small gaps are ignored to
                               // avoid jittery micro-corrections on resting contacts.
            const correctionMagnitude = Math.max(response.overlap - slop, 0) / totalInverseMass * percent;
            const correctionVector = response.overlapN.clone().scale(correctionMagnitude);

            this.position.sub(correctionVector.clone().scale(inverseMassA));
            other.position.add(correctionVector.clone().scale(inverseMassB));
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

        // Resting contact: no bounce. This suppresses micro-bouncing from gravity
        // accumulation without killing real impacts.
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
        // wake = false: a body still asleep here is immovable for this contact
        this.applyImpulse(impulse.clone().reverse(), false);
        other.applyImpulse(impulse, false);

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
            this.applyImpulse(frictionImpulse.clone().reverse(), false);
            other.applyImpulse(frictionImpulse, false);
        }
    }

    /**
     * Get the linear kinetic energy of the body, `0.5 × mass × speed²`
     * (rotational energy is not included).
     */
    getKineticEnergy(): number {
        const linearEnergy = 0.5 * this.mass * this.velocity.len2();
        // Angular energy removed
        return linearEnergy;
    }

    /**
     * Get the momentum of the body as a new Vector, `mass × velocity`.
     */
    getMomentum(): Vector {
        return this.velocity.clone().scale(this.mass);
    }

    /**
     * Set velocity directly (px/s). Also wakes the body.
     */
    setVelocity(x: number, y: number): RigidBody {
        this.velocity.x = x;
        this.velocity.y = y;
        this.wake();
        return this;
    }

    /**
     * Set position directly (px). Does not wake the body or move any shape.
     */
    setPosition(x: number, y: number): RigidBody {
        this.position.x = x;
        this.position.y = y;
        return this;
    }

    /**
     * Set mass and recalculate inverse mass. A mass of 0 makes the body static;
     * a mass > 0 makes it dynamic (`isStatic = false`).
     */
    setMass(mass: number): RigidBody {
        this.mass = mass;
        this.inverseMass = mass > 0 ? 1 / mass : 0;
        this.isStatic = mass === 0;
        return this;
    }
}
