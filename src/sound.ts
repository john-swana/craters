export class Sound {
  private audioContext: AudioContext;
  private buffer: AudioBuffer;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private volume: number = 1;

  constructor(audioContext: AudioContext, decodeAudioData: AudioBuffer) {
    this.audioContext = audioContext;
    this.buffer = decodeAudioData;
  }

  public play(): void {
    this.stop(); // Stop any previous instance before playing

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.buffer;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;

    this.source.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.source.start();
  }

  public pause(): void {
    if (this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

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
  load(resource: string) {
    const request: Request = new Request(resource)
    return fetch(request).then(function (response: Response) {
      return response.arrayBuffer();
    }).then((buffer: ArrayBuffer) => {
      return new Promise((resolve) => {
        this.audioContext.decodeAudioData(buffer, (decodeAudioData: AudioBuffer) => {
          resolve(new Sound(this.audioContext, decodeAudioData))
        })
      })
    });
  }
}