// Alle Klänge werden zur Laufzeit erzeugt (keine Audiodateien).
let ctx = null, master = null, gerauesch = null, ticken = null;
export let lautstaerke = 0.8;

export function starte() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = lautstaerke; master.connect(ctx.destination);
  } catch { ctx = null; }
}
export function setzeLautstaerke(v) { lautstaerke = v; if (master) master.gain.value = v; }

function rauschPuffer(sek) {
  const b = ctx.createBuffer(1, ctx.sampleRate * sek, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function hk(freq, start, dauer, lauts, typ = "sine") {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = typ; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(lauts, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
  o.connect(g).connect(master); o.start(start); o.stop(start + dauer + 0.05);
}

// Glocke: Grundton mit typischen, leicht unharmonischen Teiltönen
const GLOCKENTON = [196, 233.1, 261.6, 311.1, 349.2]; // groß → klein
export function glocke(i, lauts = 1) {
  if (!ctx) return; const t = ctx.currentTime, f = GLOCKENTON[i] || 220;
  [[0.5, 3.5, 0.25], [1, 4.5, 0.35], [1.19, 3, 0.16], [1.5, 2.5, 0.12], [2, 2.2, 0.12], [2.74, 1.4, 0.07], [3.76, 0.9, 0.05]]
    .forEach(([v, d, l]) => hk(f * v, t, d, l * lauts));
  const k = ctx.createBufferSource(); k.buffer = rauschPuffer(0.05);
  const g = ctx.createGain(); g.gain.value = 0.15 * lauts; k.connect(g).connect(master); k.start(t);
}

export function klang(name) {
  if (!ctx) return; const t = ctx.currentTime;
  if (name === "klack") { hk(1800, t, 0.04, 0.12, "square"); hk(400, t, 0.08, 0.15, "triangle"); }
  if (name === "hebel") { hk(220, t, 0.15, 0.2, "square"); hk(110, t + 0.05, 0.3, 0.15, "sawtooth"); }
  if (name === "erfolg") { [523, 659, 784, 1047].forEach((f, i) => hk(f, t + i * 0.12, 0.6, 0.12)); }
  if (name === "bremse") { hk(70, t, 1.2, 0.3, "sawtooth"); [392, 523].forEach((f, i) => hk(f, t + 0.3 + i * 0.15, 0.8, 0.1)); }
  if (name === "getriebe") { hk(55, t, 1.5, 0.25, "sawtooth"); hk(82, t + 0.2, 1.2, 0.12, "sawtooth"); }
  if (name === "fehler") hk(140, t, 0.45, 0.2, "square");
  if (name === "knirschen") {
    const q = ctx.createBufferSource(); q.buffer = rauschPuffer(0.8);
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 4;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    q.connect(f).connect(g).connect(master); q.start(t);
  }
  if (name === "knall") {
    const q = ctx.createBufferSource(); q.buffer = rauschPuffer(1.2);
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    q.connect(f).connect(g).connect(master); q.start(t);
  }
  if (name === "ping") hk(1320, t, 0.25, 0.1);
}

// Dauergeräusche: Wind und (wenn das Getriebe läuft) Ticken
export function atmosphaere(an) {
  if (!ctx) return;
  if (an && !gerauesch) {
    const q = ctx.createBufferSource(); q.buffer = rauschPuffer(3); q.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 350;
    const g = ctx.createGain(); g.gain.value = 0.06;
    q.connect(f).connect(g).connect(master); q.start(); gerauesch = q;
  }
  if (!an && gerauesch) { gerauesch.stop(); gerauesch = null; }
}
export function tickt(an) {
  if (!ctx) return;
  if (an && !ticken) { ticken = setInterval(() => { const t = ctx.currentTime; hk(2400, t, 0.03, 0.05, "square"); hk(600, t, 0.05, 0.05, "triangle"); }, 500); }
  if (!an && ticken) { clearInterval(ticken); ticken = null; }
}
