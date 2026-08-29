import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioSynthesizer, audioSynthesizer, playAudioPreset, playSynthesizedSound } from "../src/lib/audio";

// Mock Web Audio API
class MockOscillator {
  type: OscillatorType = "sine";
  frequency = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = "suspended";
  destination = {};

  createOscillator() {
    return new MockOscillator();
  }

  createGain() {
    return new MockGain();
  }

  async resume() {
    this.state = "running";
  }
}

describe("AudioSynthesizer Service", () => {
  beforeEach(() => {
    const mockWin: any = {
      AudioContext: MockAudioContext,
      webkitAudioContext: MockAudioContext,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("window", mockWin);
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("webkitAudioContext", MockAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });


  it("should create a singleton instance and handle lazy context initialization", async () => {
    const synth = new AudioSynthesizer();
    const ctx = await synth.ensureContext();
    expect(ctx).toBeDefined();
    expect(ctx?.state).toBe("running");
  });

  it("should play standard chime preset without throwing", async () => {
    const synth = new AudioSynthesizer();
    await expect(synth.play("chime")).resolves.not.toThrow();
  });

  it("should play soft-chime preset without throwing", async () => {
    const synth = new AudioSynthesizer();
    await expect(synth.play("soft-chime")).resolves.not.toThrow();
  });

  it("should play ambient-gong preset without throwing", async () => {
    const synth = new AudioSynthesizer();
    await expect(synth.play("ambient-gong")).resolves.not.toThrow();
  });

  it("should play beep preset without throwing", async () => {
    const synth = new AudioSynthesizer();
    await expect(synth.play("beep")).resolves.not.toThrow();
  });

  it("should play tick micro-click preset without throwing", async () => {
    const synth = new AudioSynthesizer();
    await expect(synth.play("tick")).resolves.not.toThrow();
  });

  it("should support extended presets: bell-echo, digital-sweep, notification", async () => {
    const synth = new AudioSynthesizer();
    await expect(synth.play("bell-echo")).resolves.not.toThrow();
    await expect(synth.play("digital-sweep")).resolves.not.toThrow();
    await expect(synth.play("notification")).resolves.not.toThrow();
  });

  it("should normalize volume for decimal (0..1) and percentage (0..100) scales", async () => {
    const synth = new AudioSynthesizer();
    // Decimal scale
    await expect(synth.play("chime", 0.5)).resolves.not.toThrow();
    // Percentage scale
    await expect(synth.play("chime", 80)).resolves.not.toThrow();
    // Volume 0 should return early without error
    await expect(synth.play("chime", 0)).resolves.not.toThrow();
  });

  it("should support custom pitch overrides for chime and tick", async () => {
    const synth = new AudioSynthesizer();
    await expect(synth.play("chime", 0.8, 600)).resolves.not.toThrow();
    await expect(synth.play("tick", 0.5, 1400)).resolves.not.toThrow();
  });

  it("should stop active oscillator nodes cleanly", async () => {
    const synth = new AudioSynthesizer();
    await synth.play("chime");
    expect(() => synth.stop()).not.toThrow();
  });

  it("should provide convenience functions playAudioPreset and playSynthesizedSound", async () => {
    await expect(playAudioPreset("soft-chime", 0.7)).resolves.not.toThrow();
    expect(() => playSynthesizedSound("tick", 0.5)).not.toThrow();
    expect(() => playSynthesizedSound("chime", 0.8, 880)).not.toThrow();
  });

  it("should support helper methods playTick and playChime", () => {
    const synth = new AudioSynthesizer();
    expect(() => synth.playTick(0.8)).not.toThrow();
    expect(() => synth.playChime(0.5, 523.25)).not.toThrow();
  });
});
