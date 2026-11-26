// Synthesised sound, no audio files: a WebAudio engine hum whose pitch follows throttle and
// speed, a two-note chime for rings, a low thud for landings and a noise burst for crashes.
// The context is created on the first user gesture, so the title screen stays silent until
// the player starts; every call is guarded, so a browser without audio still plays.

export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc2 = context.createOscillator();
      engineOsc2.type = 'square';
      engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
      engineOsc2.start();
      return true;
    } catch {
      return false;
    }
  }

  /** Call from a user gesture (start / click) so the context is allowed to run. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  /** Continuous engine sound; call every frame with throttle (0..1) and speed (m/s). */
  function engine(throttle, speed, flying) {
    if (!context || muted) return;
    try {
      const rpm = 42 + throttle * 88 + speed * 0.55;
      engineOsc.frequency.setTargetAtTime(rpm, context.currentTime, 0.08);
      engineOsc2.frequency.setTargetAtTime(rpm * 1.494, context.currentTime, 0.08);
      engineFilter.frequency.setTargetAtTime(320 + throttle * 900, context.currentTime, 0.1);
      const level = flying ? 0.045 + throttle * 0.05 : throttle * 0.05;
      engineGain.gain.setTargetAtTime(level, context.currentTime, 0.1);
    } catch {
      // Audio is decoration; a failure never stops the game.
    }
  }

  function tone(frequency, startAt, duration, type, level) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(level, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  }

  function chime() {
    if (!ensure() || muted) return;
    try {
      const now = context.currentTime;
      tone(659.25, now, 0.22, 'sine', 0.16); // E5
      tone(880.0, now + 0.09, 0.34, 'sine', 0.16); // A5
    } catch {
      // Ignore audio failures.
    }
  }

  function fuelChime() {
    if (!ensure() || muted) return;
    try {
      const now = context.currentTime;
      tone(523.25, now, 0.18, 'sine', 0.14); // C5
      tone(783.99, now + 0.08, 0.3, 'sine', 0.14); // G5
    } catch {
      // Ignore audio failures.
    }
  }

  function thud() {
    if (!ensure() || muted) return;
    try {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.22);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignore audio failures.
    }
  }

  function crashSound() {
    if (!ensure() || muted) return;
    try {
      const now = context.currentTime;
      const length = Math.floor(context.sampleRate * 0.5);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      noise.start(now);
      const osc = context.createOscillator();
      const oGain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.4);
      oGain.gain.setValueAtTime(0.35, now);
      oGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc.connect(oGain);
      oGain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Ignore audio failures.
    }
  }

  function setMuted(value) {
    muted = value;
    if (engineGain && context) engineGain.gain.setTargetAtTime(0, context.currentTime, 0.05);
  }

  return { unlock, engine, chime, fuelChime, thud, crashSound, setMuted };
}
