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
      ok: true,
      status: 200,
      statusText: "OK",
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

  it("should reject when the response is not ok", async () => {
    const savedFetch = (window as any).fetch;
    (window as any).fetch = async () => ({
      ok: false, status: 404, statusText: "Not Found",
      arrayBuffer: async () => new ArrayBuffer(0)
    });
    try {
      await soundManager.load("missing.mp3");
      expect.fail("expected load to reject on a 404");
    } catch (e: any) {
      expect(e.message).to.contain("404");
    } finally {
      (window as any).fetch = savedFetch;
    }
  });

  it("should reject (not hang) when decoding fails", async () => {
    (soundManager.audioContext as any).decodeAudioData =
      (_buffer: any, _onOk: any, onErr: any) => onErr(new Error("corrupt audio"));
    try {
      await soundManager.load("corrupt.mp3");
      expect.fail("expected load to reject on decode failure");
    } catch (e: any) {
      expect(e.message).to.contain("corrupt audio");
    }
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

    it("should play sound with loop enabled", async () => {
      const sound: any = await soundManager.load("test.mp3");
      sound.play(true);
      expect(sound.source.loop).to.be.true;
    });

    it("should notify when sound ends", async () => {
      const sound: any = await soundManager.load("test.mp3");
      let ended = false;
      sound.play(false, () => { ended = true; });
      sound.source.onended();
      expect(ended).to.be.true;
    });

    it("should layer overlapping one-shots without cutting each other off", async () => {
      const sound: any = await soundManager.load("test.mp3");
      sound.playOneShot();
      sound.playOneShot();
      // Both voices are live (play() would have stopped the first; playOneShot does not).
      expect(sound.activeSources.length).to.equal(2);
    });

    it("stopAll should clear all one-shot voices", async () => {
      const sound: any = await soundManager.load("test.mp3");
      sound.playOneShot();
      sound.playOneShot();
      sound.stopAll();
      expect(sound.activeSources.length).to.equal(0);
    });
  });
});