/* Small procedural soundscape; starts only after the user clicks the sound button. */
(() => {
  'use strict';
  function create(win = window) {
    const Context = win.AudioContext || win.webkitAudioContext;
    let ctx = null, master = null, wind = null, windGain = null;
    let enabled = false, theme = 'home', nextNote = 0, step = 0;
    function tone(frequency, duration, volume, type = 'sine', sweep = 0) {
      if (!enabled || !ctx) return;
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (sweep) oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, frequency + sweep), now + duration);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(.09, duration / 3));
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain); gain.connect(master);
      oscillator.start(now); oscillator.stop(now + duration + .02);
    }
    function setup() {
      ctx = new Context();
      master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + (Math.random() * 2 - 1) * .11) * .993;
        data[i] = last;
      }
      wind = ctx.createBufferSource(); wind.buffer = buffer; wind.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 580;
      windGain = ctx.createGain(); windGain.gain.value = .045;
      wind.connect(filter); filter.connect(windGain); windGain.connect(master); wind.start();
    }
    async function toggle() {
      if (!Context) return false;
      if (!ctx) setup();
      enabled = !enabled;
      if (enabled) await ctx.resume(); else await ctx.suspend();
      nextNote = ctx.currentTime;
      return enabled;
    }
    function setTheme(value) {
      theme = value || 'home'; step = 0;
      if (ctx) nextNote = ctx.currentTime + .15;
      if (windGain && enabled) windGain.gain.setTargetAtTime(theme === 'nature' ? .035 : theme === 'journey' ? .05 : theme === 'music' ? .018 : .044, ctx.currentTime, .55);
    }
    function update() {
      if (!enabled || !ctx || ctx.currentTime < nextNote) return;
      if (theme === 'nature') {
        tone([810, 980, 760, 1050][step % 4], .21, .032, 'sine', 220);
        nextNote = ctx.currentTime + 2.3 + (step % 3) * .35;
      } else if (theme === 'journey') {
        tone([392, 523, 440, 587][step % 4], 1.18, .028, 'sine');
        nextNote = ctx.currentTime + 2.65;
      } else if (theme === 'music') {
        tone([262, 330, 392, 330, 294, 392][step % 6], .72, .023, 'triangle');
        nextNote = ctx.currentTime + .92;
      } else {
        nextNote = ctx.currentTime + 1.8;
      }
      step++;
    }
    return { supported: Boolean(Context), toggle, setTheme, update, isOn: () => enabled };
  }
  window.PojianAudio = { create };
})();
