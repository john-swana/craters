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

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(value: number) {
    this.volume = value;
    if (this.gainNode) {
      this.gainNode.gain.value = value;
    }
  }

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
export default class SoundManager {
  audioContext: AudioContext;
  constructor() {
    this.audioContext = new AudioContext();
    this.unlockAudioContext()
  }
  unlockAudioContext() {
    if (this.audioContext.state !== "suspended") return;
    const unlockAudioContext = () => {
      document.removeEventListener("touchstart", unlockAudioContext, false);
      document.removeEventListener("mousedown", unlockAudioContext, false);
      document.removeEventListener("keydown", unlockAudioContext, false);
      this.audioContext.resume();
    }
    document.addEventListener("touchstart", unlockAudioContext, false);
    document.addEventListener("mousedown", unlockAudioContext, false);
    document.addEventListener("keydown", unlockAudioContext, false);
  }
  /** Suspend playback of every sound (the whole AudioContext). */
  suspendAll(): Promise<void> {
    return this.audioContext.suspend();
  }

  /** Resume playback of every sound (the whole AudioContext). */
  resumeAll(): Promise<void> {
    return this.audioContext.resume();
  }

  load(resource: string): Promise<Sound> {
    const request: Request = new Request(resource)
    return fetch(request).then((response: Response) => {
      // Without this, a 404/500 flows into arrayBuffer()/decodeAudioData and
      // fails opaquely instead of surfacing the real problem.
      if (!response.ok) {
        throw new Error(`Failed to load sound "${resource}": ${response.status} ${response.statusText}`);
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