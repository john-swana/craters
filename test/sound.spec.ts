import chai from "chai";
import SoundManager from "../src/sound";
import Sound from "../src/sound";

var should = chai.should();
var expect = chai.expect;

// Mocks
class MockAudioBufferSourceNode {
  buffer: any = null;
  loop: boolean = false;
  onended: any = null;
  connect() { }
  disconnect() { }
  start() { }
  stop() { }
}

class MockGainNode {
  gain = { value: 1 };
  connect() { }
  disconnect() { }
}

class MockAudioContext {
  state = 'running';
  createBufferSource() { return new MockAudioBufferSourceNode(); }
  createGain() { return new MockGainNode(); }
  decodeAudioData(buffer: any, cb: any) { cb({}); }
  suspend() { this.state = 'suspended'; }
  resume() { this.state = 'running'; }
}

describe("SoundManager", function () {
  let originalAudioContext: any;
  let originalRequest: any;
  let originalFetch: any;
  let soundManager: SoundManager;

  before(() => {
    originalAudioContext = (window as any).AudioContext;
    originalRequest = (window as any).Request;
    originalFetch = (window as any).fetch;

    (window as any).AudioContext = MockAudioContext;
    (window as any).Request = class Request { constructor(public url: string) { } };
    (window as any).fetch = async () => ({
      arrayBuffer: async () => new ArrayBuffer(0)
    });
  });

  after(() => {
    (window as any).AudioContext = originalAudioContext;
    (window as any).Request = originalRequest;
    (window as any).fetch = originalFetch;
  });

  beforeEach(() => {
    soundManager = new SoundManager();
  });

  it("should load a sound", async () => {
    const sound = await soundManager.load("test.mp3");
    expect(sound).to.not.be.undefined;
    expect(sound).to.have.property('play');
  });

  it("should unlock audio context", () => {
    soundManager.audioContext.suspend();
    expect(soundManager.audioContext.state).to.equal('suspended');
    soundManager.unlockAudioContext();
  });

  describe("Sound", function () {
    it("should play sound", async () => {
      const sound: any = await soundManager.load("test.mp3");
      sound.play();
      sound.stop();
    });

    it("should set volume", async () => {
      const sound: any = await soundManager.load("test.mp3");
      sound.play();
      sound.setVolume(0.5);
      expect(sound.getVolume()).to.equal(0.5);
    });

    it("should pause sound", async () => {
      const sound: any = await soundManager.load("test.mp3");
      sound.play();
      sound.pause();
      expect(sound.audioContext.state).to.equal('suspended');
    });

    it("should resume sound", async () => {
      const sound: any = await soundManager.load("test.mp3");
      sound.play();
      sound.pause();
      sound.resume();
      expect(sound.audioContext.state).to.equal('running');
    });
  });
});