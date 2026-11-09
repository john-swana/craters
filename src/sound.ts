/**
 * A decoded audio clip, created by {@link SoundManager.load}. Has one primary
 * voice ({@link play}) plus any number of overlapping one-shots
 * ({@link playOneShot}).
 */
export class Sound {
  private audioContext: AudioContext;
  private buffer: AudioBuffer;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private volume: number = 1;
  // One-shot voices currently playing (see playOneShot). Tracked so they can be
  // cleaned up on end and stopped en masse via stopAll().
  private activeSources: AudioBufferSourceNode[] = [];

  constructor(audioContext: AudioContext, decodeAudioData: AudioBuffer) {
    this.audioContext = audioContext;
    this.buffer = decodeAudioData;
  }

  /**
   * Play an overlapping one-shot. Unlike play(), this does NOT stop previous
   * instances, so rapid effects (footsteps, hits) layer instead of cutting each
   * other off. Each call spins up its own source/gain and self-cleans on end.
   */
  public playOneShot(volume: number = this.volume): void {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffer;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
      const i = this.activeSources.indexOf(source);
      if (i !== -1) this.activeSources.splice(i, 1);
    };

    this.activeSources.push(source);
    source.start();
  }

  /**
   * Play the primary voice, stopping any previous primary voice first.
   * @param loop repeat until stopped (default false).
   * @param onEnded called when the voice stops: at the natural end, and also
   *   when it is stopped by {@link stop} or replaced by another play() call.
   *   Never fires naturally while looping.
   */
  public play(loop: boolean = false, onEnded?: () => void): void {
    this.stop(); // Stop any previous instance before playing

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = loop;
    if (onEnded) {
      this.source.onended = onEnded;
    }

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;

    this.source.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.source.start();
  }

  /**
   * @deprecated Suspends the ENTIRE AudioContext, affecting every sound — not
   * just this one. Use SoundManager.suspendAll() to make that explicit.
   */
  public pause(): void {
    if (this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  /**
   * @deprecated Resumes the ENTIRE AudioContext. Use SoundManager.resumeAll().
   */
  public resume(): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /** Volume used by the primary voice and as the default for new one-shots. */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * Set the volume (gain; 1 = unchanged, not clamped). Applies immediately to
   * the playing primary voice; one-shots already playing keep their volume.
   */
  public setVolume(value: number) {
    this.volume = value;
    if (this.gainNode) {
      this.gainNode.gain.value = value;
    }
  }

  /** Stop the primary voice and release its nodes. One-shots keep playing. */
  public stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        // Ignore error if source has already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  /** Stop the primary voice and every one-shot started by playOneShot. */
  public stopAll(): void {
    this.stop();
    // Copy first: onended handlers mutate activeSources while we iterate.
    for (const source of this.activeSources.slice()) {
      try {
        source.stop();
      } catch (e) {
        // Ignore error if source has already stopped
      }
    }
    this.activeSources = [];
  }
}
/**
 * Owns the AudioContext and loads sounds. If the context starts suspended
 * (browser autoplay policy), the constructor calls {@link unlockAudioContext}
 * so that the first accepted user gesture resumes it.
 */
export default class SoundManager {
  audioContext: AudioContext;
  constructor() {
    this.audioContext = new AudioContext();
    this.unlockAudioContext()
  }
  /**
   * Resume the AudioContext on a user gesture: `touchend`, `click`,
   * `mousedown`, `pointerup` or `keydown` anywhere in the document. The
   * listeners stay attached until the context is actually running, so a
   * gesture the browser does not accept for autoplay is followed by another
   * attempt on the next one. Does nothing if the context is not suspended.
   */
  unlockAudioContext(): void {
    if (this.audioContext.state !== "suspended") return;
    // Events that count as user activation for autoplay. `touchstart` does
    // not, which is why a tap is handled through `touchend`/`pointerup`.
    const events = ["touchend", "click", "mousedown", "pointerup", "keydown"];
    const removeListeners = () => {
      events.forEach((type) => document.removeEventListener(type, unlock, true));
    };
    const unlock = () => {
      const state = this.audioContext.state;
      if (state === "running" || state === "closed") {
        removeListeners();
        return;
      }
      this.audioContext.resume().then(() => {
        if (this.audioContext.state === "running") removeListeners();
      }, () => {
        // Not allowed or failed: keep listening and retry on the next gesture.
      });
    };
    // Capture phase, so the unlock still runs if a game handler stops propagation.
    events.forEach((type) => document.addEventListener(type, unlock, true));
  }
  /** Suspend playback of every sound (the whole AudioContext). */
  suspendAll(): Promise<void> {
    return this.audioContext.suspend();
  }

  /** Resume playback of every sound (the whole AudioContext). */
  resumeAll(): Promise<void> {
    return this.audioContext.resume();
  }

  /**
   * Fetch and decode an audio file.
   * Rejects on an HTTP error status or if the data cannot be decoded.
   */
  load(resource: string): Promise<Sound> {
    const request: Request = new Request(resource)
    return fetch(request).then((response: Response) => {
      // Without this, a 404/500 flows into arrayBuffer()/decodeAudioData and
      // fails opaquely instead of surfacing the real problem.
      if (!response.ok) {
        throw new Error(`Failed to load sound "${resource}": ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`);
      }
      return response.arrayBuffer();
    }).then((buffer: ArrayBuffer) => {
      return new Promise<Sound>((resolve, reject) => {
        // Pass the error callback too: an undecodable buffer would otherwise
        // leave this promise pending forever.
        this.audioContext.decodeAudioData(
          buffer,
          (decodeAudioData: AudioBuffer) => resolve(new Sound(this.audioContext, decodeAudioData)),
          (error: DOMException) => reject(error ?? new Error(`Failed to decode sound "${resource}"`))
        );
      });
    });
  }
}