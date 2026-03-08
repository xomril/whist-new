// Web Audio API sound effects — no audio files needed

let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  type: OscillatorType,
  when: number,
  dur: number,
  vol = 0.18,
  freqEnd?: number,
) {
  try {
    const c = ac();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(freqEnd, when + dur);
    osc.connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  } catch { /* ignore */ }
}

function noise(when: number, dur: number, vol = 0.12, filterFreq = 1200) {
  try {
    const c = ac();
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4) * vol * 3;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = 0.7;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    src.start(when);
  } catch { /* ignore */ }
}

/** Card slap on table */
export function sfxPlayCard() {
  try {
    const c = ac();
    noise(c.currentTime, 0.07, 0.18, 900);
    tone(200, 'sine', c.currentTime, 0.06, 0.08, 80);
  } catch { /* ignore */ }
}

/** Rapid card dealing flutter */
export function sfxDeal() {
  try {
    const c = ac();
    const t = c.currentTime;
    for (let i = 0; i < 6; i++) {
      noise(t + i * 0.06, 0.04, 0.1, 1400);
    }
  } catch { /* ignore */ }
}

/** Ascending arpeggio — you won the trick */
export function sfxTrickWon() {
  try {
    const c = ac();
    const t = c.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => tone(f, 'sine', t + i * 0.09, 0.28, 0.18));
  } catch { /* ignore */ }
}

/** Soft neutral blip — trick completed, not won by you */
export function sfxTrickComplete() {
  try {
    const c = ac();
    tone(440, 'sine', c.currentTime, 0.12, 0.07);
  } catch { /* ignore */ }
}

/** Soft click — bid submitted */
export function sfxBid() {
  try {
    const c = ac();
    tone(1100, 'triangle', c.currentTime, 0.07, 0.1);
    tone(880, 'triangle', c.currentTime + 0.05, 0.07, 0.07);
  } catch { /* ignore */ }
}

/** Triumphant fanfare — you won the game */
export function sfxGameWon() {
  try {
    const c = ac();
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, 'sine', t + i * 0.13, 0.5, 0.22)
    );
    // Sustain chord at end
    [523.25, 659.25, 783.99].forEach(f =>
      tone(f, 'sine', t + 0.65, 0.9, 0.16)
    );
  } catch { /* ignore */ }
}

/** Urgent triple-beep — you haven't acted in 30 s */
export function sfxTurnReminder() {
  try {
    const c = ac();
    const t = c.currentTime;
    // Three short staccato beeps, rising in pitch
    [880, 1047, 1319].forEach((f, i) => {
      tone(f, 'triangle', t + i * 0.18, 0.10, 0.22);
    });
  } catch { /* ignore */ }
}

/** Descending tones — game over, you lost */
export function sfxGameLost() {
  try {
    const c = ac();
    const t = c.currentTime;
    [440, 370, 311, 261].forEach((f, i) =>
      tone(f, 'sine', t + i * 0.16, 0.4, 0.14)
    );
  } catch { /* ignore */ }
}
