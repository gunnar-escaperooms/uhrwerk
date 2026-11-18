// 3D-Welt von Uhrwerk: Räderwerk (unten) und Glockenstube (oben), verbunden durch eine Gitterluke.
import * as THREE from "three";
import { A, B, RAEDER, SYMBOLE, ACHSEN } from "./logik.js";

const BODEN_B = 3.6;
export const SPAWN = { [A]: { p: [0, 0, 2.6], yaw: 0 }, [B]: { p: [0, BODEN_B, 2.6], yaw: 0 } };
const GRENZE = { [A]: { x: [-2.6, 3.4], z: [-3.4, 3.5] }, [B]: { x: [-3.4, 3.4], z: [-3.0, 3.4] } };
export const AUGENHOEHE = 1.65;

// ---------- Texturen ----------
function leinwand(w, h, malen) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  malen(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const planken = () => leinwand(512, 512, (g, w) => {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `hsl(28, 38%, ${18 + (i % 3) * 3}%)`; g.fillRect(0, i * 64, w, 64);
    g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, i * 64, w, 3);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`; g.fillRect(Math.random() * w, i * 64 + Math.random() * 60, 40 + Math.random() * 160, 1); }
  }
});
const ziegel = () => leinwand(512, 512, (g, w, h) => {
  g.fillStyle = "#2a1e18"; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 6; x++) {
    const o = y % 2 ? 43 : 0; g.fillStyle = `hsl(${10 + Math.random() * 10}, ${35 + Math.random() * 15}%, ${22 + Math.random() * 10}%)`;
    g.fillRect(x * 86 + o - 43 + 2, y * 32 + 2, 82, 28);
  }
});
function symbolZeichnen(g, i, cx, cy, s) {
  g.beginPath();
  if (i === 0) g.arc(cx, cy, s, 0, Math.PI * 2);
  if (i === 1) { g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.95, cy + s * 0.75); g.lineTo(cx - s * 0.95, cy + s * 0.75); g.closePath(); }
  if (i === 2) g.rect(cx - s * 0.8, cy - s * 0.8, s * 1.6, s * 1.6);
  if (i === 3) { g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.75, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s * 0.75, cy); g.closePath(); }
  if (i === 4) { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? s * 0.42 : s; k ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }
  g.fill();
}
export { symbolZeichnen };

// ---------- Geometrien ----------
function zahnradGeo(r, dicke = 0.05) {
  const zaehne = Math.round(r * 60), s = new THREE.Shape(), innen = r * 0.86;
  for (let k = 0; k < zaehne; k++) {
    const a0 = (k / zaehne) * Math.PI * 2, st = (Math.PI * 2) / zaehne;
    const pts = [[innen, a0], [r, a0 + st * 0.15], [r, a0 + st * 0.5], [innen, a0 + st * 0.65]];
    pts.forEach(([rr, a], j) => (k === 0 && j === 0 ? s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)));
  }
  s.closePath();
  const loch = new THREE.Path(); loch.absarc(0, 0, r * 0.18, 0, Math.PI * 2, true); s.holes.push(loch);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, p = new THREE.Path(); p.absarc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.16, 0, Math.PI * 2, true); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth: dicke, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -dicke / 2);
  return g;
}
function glockeGeo(s) {
  const p = [[0, 0], [0.16, 0], [0.2, -0.04], [0.23, -0.2], [0.27, -0.42], [0.34, -0.58], [0.42, -0.68], [0.44, -0.72], [0.42, -0.73]].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  return new THREE.LatheGeometry(p, 32);
}

const mat = (farbe, o = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.75, metalness: 0.05, ...o });
const metall = (farbe) => mat(farbe, { metalness: 0.85, roughness: 0.35 });

export function baueWelt(canvas, daten, rolle) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a12);
  scene.fog = new THREE.FogExp2(0x0b1020, 0.012);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 600);
  scene.add(camera);

  const interaktiv = [];
  const merke = (obj, inter) => { obj.traverse((o) => { o.userData.inter = inter; }); interaktiv.push(obj); return obj; };
  const O = { raeder: [], achsenPos: [], glocken: [], hebel: {}, deko: [] };

  // ---------- Licht ----------
  scene.add(new THREE.HemisphereLight(0x8a9ec8, 0x3a2414, 1.6));
  const lampeA = new THREE.PointLight(0xffb060, 70, 16, 2); lampeA.position.set(-2.2, 2.7, 1.6); scene.add(lampeA);
  const lampeB = new THREE.PointLight(0xffb060, 45, 14, 2); lampeB.position.set(-1.5, 6.3, 2.2); scene.add(lampeB);
  for (const l of [lampeA, lampeB]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd28a }));
    b.position.copy(l.position); scene.add(b);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.22, 8, 1, true), mat(0x3a2a18, { side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
    gl.position.copy(l.position); scene.add(gl);
  }
  const mond = new THREE.DirectionalLight(0x8fa8ff, 1.4); mond.position.set(-20, 30, -30); scene.add(mond);
  O.lampen = [lampeA, lampeB];

  // ---------- Räderwerk (unten) ----------
  const holz = planken(); holz.wrapS = holz.wrapT = THREE.RepeatWrapping; holz.repeat.set(2, 2);
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat(0xffffff, { map: holz })); boden.rotation.x = -Math.PI / 2; scene.add(boden);
  const zt = ziegel(); zt.wrapS = zt.wrapT = THREE.RepeatWrapping; zt.repeat.set(2.5, 1.2);
  const wandMat = mat(0xffffff, { map: zt });
  for (const [x, z, ry] of [[0, -4, 0], [0, 4, Math.PI], [-4, 0, Math.PI / 2], [4, 0, -Math.PI / 2]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.4), wandMat); w.position.set(x, 1.7, z); w.rotation.y = ry; scene.add(w);
  }
  // Decke/Boden zwischen den Räumen mit Luke in der Mitte
  const holz2 = planken(); holz2.wrapS = holz2.wrapT = THREE.RepeatWrapping; holz2.repeat.set(1, 1);
  const deckMat = mat(0xffffff, { map: holz2 });
  for (const [x, z, w, d] of [[-2.4, 0, 3.2, 8], [2.4, 0, 3.2, 8], [0, -2.4, 1.6, 3.2], [0, 2.4, 1.6, 3.2]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), deckMat); b.position.set(x, 3.5, z); scene.add(b);
  }
  for (let i = -3; i <= 3; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.04), metall(0x2b2b2b)); st.position.set(0, 3.58, i * 0.22); scene.add(st);
    const st2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.6), metall(0x2b2b2b)); st2.position.set(i * 0.22, 3.56, 0); scene.add(st2);
  }
  for (const x of [-2.4, 2.4]) { const balken = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 8), mat(0x2a1a0e)); balken.position.set(x, 3.25, 0); scene.add(balken); }

  // Zifferblatt von hinten (spiegelverkehrt), leuchtet vom Mondlicht
  const blatt = leinwand(1024, 1024, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 50, w / 2, w / 2, w / 2);
    gr.addColorStop(0, "#f3ead2"); gr.addColorStop(1, "#c9bfa3");
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); g.fill();
    g.translate(w, 0); g.scale(-1, 1); // von hinten gesehen
    g.fillStyle = "rgba(40,30,20,.55)"; g.font = "bold 92px Georgia"; g.textAlign = "center"; g.textBaseline = "middle";
    const rom = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
    rom.forEach((r, i) => { const a = (i / 12) * Math.PI * 2; g.fillText(r, w / 2 + Math.sin(a) * 400, w / 2 - Math.cos(a) * 400); });
    g.lineWidth = 6; g.strokeStyle = "rgba(40,30,20,.4)"; g.beginPath(); g.arc(w / 2, w / 2, 470, 0, Math.PI * 2); g.stroke();
  });
  const ziffer = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.MeshStandardMaterial({ map: blatt, emissive: 0xc8d6ff, emissiveMap: blatt, emissiveIntensity: 0.55, roughness: 0.9 }));
  ziffer.position.set(0, 1.9, -3.97); scene.add(ziffer);
  const rand = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.06, 10, 64), metall(0x5a4520)); rand.position.copy(ziffer.position); scene.add(rand);
  const zeigerA = new THREE.Group(); zeigerA.position.set(0, 1.9, -3.9); scene.add(zeigerA);
  const stunde = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.03), metall(0x1a1a1a)); stunde.geometry.translate(0, 0.35, 0);
  const minute = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.03), metall(0x1a1a1a)); minute.geometry.translate(0, 0.55, 0.02);
  zeigerA.add(stunde, minute); O.zeiger = { stunde, minute };
  const nabe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), metall(0x8a6a2a)); nabe.rotation.x = Math.PI / 2; zeigerA.add(nabe);
  // Zeigerwerk (Stellkurbel)
  const zw = new THREE.Group();
  const zwk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.45), mat(0x3d2a18)); zwk.position.y = 0.95; zw.add(zwk);
  const zwb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.65, 0.35), mat(0x2a1c10)); zwb.position.y = 0.32; zw.add(zwb);
  const kurbel = new THREE.Mesh(zahnradGeo(0.18, 0.04), metall(0xb8903a)); kurbel.position.set(0, 0.95, 0.24); zw.add(kurbel); O.kurbel = kurbel;
  zw.position.set(2.0, 0, -3.5); scene.add(zw);
  merke(zw, { id: "zeigerwerk" });

  // Deko-Zahnräder und Hauptwelle
  for (const [x, y, r] of [[-2.7, 2.3, 0.75], [-1.9, 0.9, 0.45], [2.75, 2.5, 0.6], [3.2, 1.2, 0.4]]) {
    const z = new THREE.Mesh(zahnradGeo(r, 0.08), metall(0x6a5328)); z.position.set(x, y, -3.85); scene.add(z); O.deko.push({ m: z, v: (0.4 / r) * (O.deko.length % 2 ? -1 : 1) });
  }
  const welle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.2, 12), metall(0x4a4a4a)); welle.position.set(3.0, 2.6, -3.0); scene.add(welle); O.welle = welle;

  // Werkbank mit Zahnrädern
  const bank = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 3.6), mat(0x3a2716)); bank.position.set(-3.45, 0.45, 0); scene.add(bank);
  const bankPlatte = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 3.7), mat(0x5a3d22)); bankPlatte.position.set(-3.45, 0.92, 0); scene.add(bankPlatte);
  O.bankPos = RAEDER.map((_, i) => new THREE.Vector3(-3.4, 0.98, -1.4 + i * 0.7));
  RAEDER.forEach((rad, i) => {
    const m = new THREE.Mesh(zahnradGeo(daten.radien[i]), metall(rad.farbe));
    const treffer = new THREE.Mesh(new THREE.CylinderGeometry(daten.radien[i], daten.radien[i], 0.12, 24), new THREE.MeshBasicMaterial({ visible: false }));
    treffer.rotation.x = Math.PI / 2; m.add(treffer); // volle Trefferscheibe, damit auch das Achsloch zählt
    m.position.copy(O.bankPos[i]); m.rotation.x = -Math.PI / 2; scene.add(m);
    O.raeder.push(m); merke(m, { id: "rad", rad: i });
  });
  // Achsen an der Ostwand
  ACHSEN.forEach((n, i) => {
    const z = -1.3 + i * 1.3, g = new THREE.Group();
    const ach = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 12), metall(0x777777)); ach.rotation.z = Math.PI / 2; ach.position.set(3.78, 1.5, z); g.add(ach);
    const lager = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20), metall(0x3a3a3a)); lager.rotation.z = Math.PI / 2; lager.position.set(3.97, 1.5, z); g.add(lager);
    const schild = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.22), mat(0xffffff, { map: leinwand(128, 70, (c, w, h) => { c.fillStyle = "#b8903a"; c.fillRect(0, 0, w, h); c.fillStyle = "#2a1a05"; c.font = "bold 46px Georgia"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n, w / 2, h / 2 + 2); }), metalness: 0.6, roughness: 0.4 }));
    schild.position.set(3.97, 2.15, z); schild.rotation.y = -Math.PI / 2; g.add(schild);
    scene.add(g); merke(g, { id: "achse", achse: i });
    O.achsenPos.push(new THREE.Vector3(3.6, 1.5, z));
  });
  // Melodiescheibe an der Südwand
  const scheibe = new THREE.Group();
  const sch = new THREE.Mesh(new THREE.CircleGeometry(0.55, 48), mat(0xffffff, { map: leinwand(512, 512, (g, w) => {
    g.fillStyle = "#b8903a"; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#5a4010"; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 8, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#3a2806";
    daten.melodie.forEach((gl, k) => { const a = -Math.PI / 2 + (k / daten.melodie.length) * Math.PI * 2; symbolZeichnen(g, daten.glockenSymbol[gl], w / 2 + Math.cos(a) * 170, w / 2 + Math.sin(a) * 170, 40); });
    g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2 - 18, 52); g.lineTo(w / 2 + 18, 52); g.fill();
  }), metalness: 0.7, roughness: 0.4 }));
  scheibe.add(sch); scheibe.position.set(-1.6, 1.7, 3.97); scheibe.rotation.y = Math.PI; scene.add(scheibe);
  merke(scheibe, { id: "melodie" });

  // Bremshebel
  function hebel(x, y, z, r) {
    const g = new THREE.Group();
    const sockel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.4), metall(0x333333)); sockel.position.y = 0.12; g.add(sockel);
    const arm = new THREE.Group(); arm.position.y = 0.25;
    const stange = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), metall(0x777777)); stange.position.y = 0.45; arm.add(stange);
    const griff = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), mat(0x9b1c1c)); griff.position.y = 0.92; arm.add(griff);
    arm.rotation.x = -0.5; g.add(arm);
    const treffer = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
    treffer.position.set(0, 0.65, -0.1); g.add(treffer); // großzügige Trefferzone statt dünner Stange
    g.position.set(x, y, z); scene.add(g);
    merke(g, { id: "hebel" });
    return { g, arm, griff };
  }
  O.hebel[A] = hebel(2.6, 0, 3.2);

  // ---------- Glockenstube (oben) ----------
  const holzB = planken(); holzB.wrapS = holzB.wrapT = THREE.RepeatWrapping; holzB.repeat.set(2, 2);
  const steinB = ziegel(); steinB.wrapS = steinB.wrapT = THREE.RepeatWrapping; steinB.repeat.set(2.5, 0.4);
  const steinMat = mat(0xffffff, { map: steinB });
  for (const [x, z, w, d] of [[0, -3.85, 8, 0.3], [0, 3.85, 8, 0.3], [-3.85, 0, 0.3, 8], [3.85, 0, 0.3, 8]]) {
    const brue = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), steinMat); brue.position.set(x, BODEN_B + 0.5, z); scene.add(brue);
    const band = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), steinMat); band.position.set(x, 7.0, z); scene.add(band);
  }
  for (const x of [-3.85, 0, 3.85]) for (const z of [-3.85, 0, 3.85]) {
    if (x === 0 && z === 0) continue;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.8, 0.45), steinMat); p.position.set(x, BODEN_B + 1.9, z); scene.add(p);
  }
  const dach = new THREE.Mesh(new THREE.ConeGeometry(5.8, 3, 4, 1), mat(0x2a3a3a, { roughness: 0.6, metalness: 0.3 })); dach.position.set(0, 8.9, 0); dach.rotation.y = Math.PI / 4; scene.add(dach);
  const decke = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat(0x1a120a)); decke.rotation.x = Math.PI / 2; decke.position.y = 7.4; scene.add(decke);
  // Glockenbalken und Glocken
  const balkenB = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.3, 0.3), mat(0x2a1a0e)); balkenB.position.set(0, 6.9, -2.2); scene.add(balkenB);
  const GR = [1.0, 0.86, 0.74, 0.64, 0.56], GX = [-2.6, -1.3, 0, 1.25, 2.4];
  GR.forEach((s, i) => {
    const gruppe = new THREE.Group(); gruppe.position.set(GX[i], 6.75, -2.2);
    const kopf = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8), metall(0x333333)); gruppe.add(kopf);
    const gl = new THREE.Mesh(glockeGeo(s * 1.1), new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide })); gl.position.y = -0.07; gruppe.add(gl);
    const kloeppel = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s + 0.02, 10, 10), metall(0x222222)); kloeppel.position.y = -0.72 * s; gruppe.add(kloeppel);
    scene.add(gruppe); merke(gruppe, { id: "glocke", i });
    // Schild mit Symbol auf einem Pfosten davor
    const pfosten = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), mat(0x2a1a0e)); pfosten.position.set(GX[i], BODEN_B + 0.45, -1.4); scene.add(pfosten);
    const tafel = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), mat(0xffffff, { map: leinwand(128, 128, (g, w) => { g.fillStyle = "#e9dfc6"; g.fillRect(0, 0, w, w); g.strokeStyle = "#5a4010"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, w - 8); g.fillStyle = "#2a1a05"; symbolZeichnen(g, daten.glockenSymbol[i], w / 2, w / 2, 38); }) }));
    tafel.position.set(GX[i], BODEN_B + 1.0, -1.38); scene.add(tafel); merke(tafel, { id: "glocke", i });
    O.glocken.push({ gruppe, schwung: 0, phase: 0 });
  });
  // Glockenwalze mit Stiften
  const walze = new THREE.Group(); walze.position.set(0, BODEN_B + 0.75, -3.1);
  const wz = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6.4, 20), mat(0x4a3018)); wz.rotation.z = Math.PI / 2; walze.add(wz);
  for (let k = 0; k < 40; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), metall(0x999999)); const a = Math.random() * Math.PI * 2; st.position.set(-3 + Math.random() * 6, Math.cos(a) * 0.26, Math.sin(a) * 0.26); st.rotation.x = a; walze.add(st); }
  scene.add(walze); O.walze = walze;
  // Getriebeplan am Pfeiler
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), mat(0xffffff, { map: leinwand(240, 320, (g, w, h) => {
    g.fillStyle = "#e6dcc0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3a5a8a"; g.lineWidth = 2;
    g.font = "bold 20px Georgia"; g.fillStyle = "#2a3a5a"; g.fillText("Getriebe", 20, 34);
    daten.ziel.forEach((rad, i) => { g.beginPath(); g.arc(70 + i * 55, 140 + (i % 2) * 50, daten.radien[rad] * 70, 0, Math.PI * 2); g.stroke(); });
  }) }));
  plan.position.set(3.6, BODEN_B + 1.6, 0); plan.rotation.y = -Math.PI / 2; scene.add(plan); merke(plan, { id: "plan" });
  // Turmbuch auf dem Pult
  const pult = new THREE.Group();
  const pfuss = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 0.15), mat(0x2a1a0e)); pfuss.position.y = 0.5; pult.add(pfuss);
  const pplatte = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.45), mat(0x3a2716)); pplatte.position.y = 1.05; pplatte.rotation.x = -0.35; pult.add(pplatte);
  const buch = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.32), mat(0x5b1e1e)); buch.position.set(0, 1.1, 0.02); buch.rotation.x = -0.35; pult.add(buch);
  pult.position.set(-2.9, BODEN_B, 2.2); pult.rotation.y = Math.PI / 4; scene.add(pult); merke(pult, { id: "buch" });
  O.hebel[B] = hebel(2.6, BODEN_B, 3.2);

  // ---------- Draußen: Stadt, Schnee, Sterne ----------
  const fenster = leinwand(64, 128, (g, w, h) => {
    g.fillStyle = "#12141a"; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 14) { if (Math.random() < 0.35) { g.fillStyle = `hsl(${35 + Math.random() * 15}, 90%, ${55 + Math.random() * 20}%)`; g.fillRect(x, y, 7, 9); } }
  });
  const hausMat = new THREE.MeshStandardMaterial({ color: 0x222630, map: fenster, emissive: 0xffffff, emissiveMap: fenster, emissiveIntensity: 0.9, roughness: 0.9 });
  const haeuser = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), hausMat, 260);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2, r = 22 + Math.random() * 120, h = 4 + Math.random() * 14;
    m4.compose(new THREE.Vector3(Math.cos(a) * r, -40 + h / 2, Math.sin(a) * r), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 3), new THREE.Vector3(4 + Math.random() * 6, h, 4 + Math.random() * 6));
    haeuser.setMatrixAt(i, m4);
  }
  scene.add(haeuser);
  const grund = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat(0x1c2230)); grund.rotation.x = -Math.PI / 2; grund.position.y = -40; scene.add(grund);
  const turm = new THREE.Mesh(new THREE.BoxGeometry(8.6, 40, 8.6), mat(0xffffff, { map: (() => { const t = ziegel(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 12); return t; })() })); turm.position.y = -20.05; scene.add(turm);
  const sternPos = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2 + 0.1, r = 400; sternPos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sternPos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, fog: false })));
  const mondM = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshBasicMaterial({ color: 0xf4f1e6, fog: false })); mondM.position.set(-160, 180, -240); mondM.lookAt(0, 0, 0); scene.add(mondM);
  const n = 2500, schneePos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { let x, z; do { x = (Math.random() - 0.5) * 60; z = (Math.random() - 0.5) * 60; } while (Math.abs(x) < 4.2 && Math.abs(z) < 4.2); schneePos.set([x, -10 + Math.random() * 30, z], i * 3); }
  const schneeGeo = new THREE.BufferGeometry(); schneeGeo.setAttribute("position", new THREE.BufferAttribute(schneePos, 3));
  const schnee = new THREE.Points(schneeGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.85 }));
  scene.add(schnee);

  // ---------- Partner-Figur ----------
  const partnerRolle = rolle === A ? B : A;
  const partner = new THREE.Group();
  const farbe = partnerRolle === A ? 0x3a5a8a : 0x7a2a2a;
  const koerper = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.15, 14), mat(farbe)); koerper.position.y = 0.75; partner.add(koerper);
  const kopfM = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat(0xe0c0a0)); kopfM.position.y = 1.5; partner.add(kopfM);
  const krempe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 20), mat(0x111111)); krempe.position.y = 1.62; partner.add(krempe);
  const hut = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.26, 20), mat(0x111111)); hut.position.y = 1.76; partner.add(hut);
  const nase = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), mat(0xe0c0a0)); nase.rotation.x = -Math.PI / 2; nase.position.set(0, 1.5, -0.17); partner.add(nase);
  const laterne = new THREE.PointLight(0xffc070, 3, 4, 2); laterne.position.set(0.3, 1.0, -0.2); partner.add(laterne);
  partner.visible = false; scene.add(partner);
  const partnerZiel = { p: new THREE.Vector3(...SPAWN[partnerRolle].p), yaw: 0 };

  // Ping-Markierung
  const pingTex = leinwand(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.4, "rgba(255,190,90,.8)"); gr.addColorStop(1, "rgba(255,190,90,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const pings = [];

  // Feuerwerk
  const feuer = [];
  function rakete() {
    const k = 130, pos = new Float32Array(k * 3), vel = [];
    const mitte = new THREE.Vector3((Math.random() - 0.5) * 90, 4 + Math.random() * 14, -45 - Math.random() * 50);
    if (Math.random() < 0.5) mitte.z *= -1;
    for (let i = 0; i < k; i++) { pos.set([mitte.x, mitte.y, mitte.z], i * 3); const v = new THREE.Vector3().randomDirection().multiplyScalar(8 + Math.random() * 6); vel.push(v); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: new THREE.Color().setHSL(Math.random(), 1, 0.45), size: 3, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, blending: THREE.AdditiveBlending, depthWrite: false });
    const p = new THREE.Points(g, m); scene.add(p); feuer.push({ p, vel, alter: 0 });
  }

  // ---------- Steuerung ----------
  const ich = { pos: new THREE.Vector3(...SPAWN[rolle].p), yaw: SPAWN[rolle].yaw, pitch: 0 };
  const getragen = new THREE.Group(); getragen.position.set(0.32, -0.28, -0.6); camera.add(getragen);
  const ray = new THREE.Raycaster(); ray.far = 2.6;
  const mitte = new THREE.Vector2(0, 0);

  function bewege(dt, eingabe) {
    const v = 2.6 * (eingabe.rennen ? 1.6 : 1);
    const vor = (eingabe.vor ? 1 : 0) - (eingabe.zurueck ? 1 : 0), seit = (eingabe.rechts ? 1 : 0) - (eingabe.links ? 1 : 0);
    if (vor || seit) {
      const l = Math.hypot(vor, seit), sx = Math.sin(ich.yaw), cz = Math.cos(ich.yaw);
      ich.pos.x += (-sx * vor + cz * seit) / l * v * dt;
      ich.pos.z += (-cz * vor - sx * seit) / l * v * dt;
    }
    const gr = GRENZE[rolle];
    ich.pos.x = Math.max(gr.x[0], Math.min(gr.x[1], ich.pos.x));
    ich.pos.z = Math.max(gr.z[0], Math.min(gr.z[1], ich.pos.z));
    camera.position.set(ich.pos.x, ich.pos.y + AUGENHOEHE + (vor || seit ? Math.sin(performance.now() / 140) * 0.025 : 0), ich.pos.z);
    camera.rotation.set(ich.pitch, ich.yaw, 0, "YXZ");
  }

  function blickAktualisieren() {
    camera.position.set(ich.pos.x, ich.pos.y + AUGENHOEHE, ich.pos.z);
    camera.rotation.set(ich.pitch, ich.yaw, 0, "YXZ");
    camera.updateMatrixWorld(true);
  }
  function ziel() {
    blickAktualisieren(); // immer der aktuelle Blick, nicht der des letzten Bildes
    ray.setFromCamera(mitte, camera);
    const inHand = (o) => { for (; o; o = o.parent) if (o === getragen) return true; return false; };
    const h = ray.intersectObjects(interaktiv, true).find((x) => !inHand(x.object));
    return h ? { inter: h.object.userData.inter, punkt: h.point } : null;
  }
  function trefferPunkt() {
    blickAktualisieren();
    const r = new THREE.Raycaster(); r.setFromCamera(mitte, camera); r.far = 30;
    const h = r.intersectObjects(scene.children.filter((o) => o !== partner && o.type !== "Points"), true)[0];
    return h ? h.point.toArray() : null;
  }

  // ---------- Darstellung aus dem Zustand ----------
  let z = null, uhrWinkel = 0, feuerTakt = 0;
  function zustand(neu) { z = neu; }
  function partnerPose(p) { partnerZiel.p.set(p.p[0], p.p[1], p.p[2]); partnerZiel.yaw = p.yaw; partner.visible = true; }
  function zeigePing(p) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pingTex, depthWrite: false, transparent: true })); s.position.fromArray(p); s.scale.setScalar(0.4); scene.add(s); pings.push({ s, t: 0 }); }
  function laeute(i) { const g = O.glocken[i]; if (g) g.schwung = 0.35; }
  function ziehe(r) { const h = O.hebel[r]; if (h) h.zug = 1; }

  function bild(dt, t) {
    if (z) {
      // Zahnräder: auf Achse, getragen oder auf der Werkbank
      O.raeder.forEach((m, i) => {
        const ach = z.achsen.indexOf(i);
        if (rolle === A && z.getragen === i) { if (m.parent !== getragen) { getragen.add(m); m.position.set(0, 0, 0); m.rotation.set(0.3, 0.4, 0); } return; }
        if (m.parent !== scene) scene.add(m);
        if (ach >= 0) { m.position.copy(O.achsenPos[ach]); m.rotation.set(0, Math.PI / 2, z.getriebe ? m.rotation.z : 0); if (z.getriebe) m.rotation.z += dt * (ach % 2 ? -1 : 1) * (0.3 / daten.radien[i]); }
        else if (z.getragen === i) { m.visible = false; return; }
        else { m.position.copy(O.bankPos[i]); m.rotation.set(-Math.PI / 2, 0, 0); }
        m.visible = true;
      });
      if (z.getriebe) { O.deko.forEach((d) => (d.m.rotation.z += d.v * dt)); O.welle.rotation.y += dt * 2; O.walze.rotation.x += dt * 0.6; O.kurbel.rotation.z += dt * 0.5; }
      // Zeiger: von hinten gesehen; nach dem Sieg läuft die Uhr auf 12
      const h = z.gewonnen ? 12 : z.zeiger.h, mm = z.gewonnen ? 0 : z.zeiger.m;
      const zielWinkel = ((h % 12) + mm / 60) / 12 * Math.PI * 2;
      uhrWinkel += (zielWinkel - uhrWinkel) * Math.min(1, dt * 4);
      O.zeiger.stunde.rotation.z = uhrWinkel;
      O.zeiger.minute.rotation.z = (z.gewonnen ? 0 : mm / 60 * Math.PI * 2);
      for (const r of [A, B]) { const hb = O.hebel[r]; const soll = z.bremse ? 0.6 : -0.5 + (hb.zug || 0) * 1.0; hb.arm.rotation.x += (soll - hb.arm.rotation.x) * Math.min(1, dt * 10); hb.zug = Math.max(0, (hb.zug || 0) - dt * 1.5); hb.griff.material.color.setHex(z.glocken && !z.bremse ? 0xdd3333 : z.bremse ? 0x33aa55 : 0x7a1c1c); }
    }
    O.glocken.forEach((g) => { g.phase += dt * 7; g.schwung *= Math.pow(0.35, dt); g.gruppe.rotation.x = Math.sin(g.phase) * g.schwung; });
    // Partner weich nachführen
    if (partner.visible) { partner.position.lerp(partnerZiel.p, Math.min(1, dt * 10)); let dy = partnerZiel.yaw - partner.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); partner.rotation.y += dy * Math.min(1, dt * 10); }
    // Schnee
    const sp = schnee.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) { sp.array[i * 3 + 1] -= dt * 1.2; sp.array[i * 3] += Math.sin(t + i) * dt * 0.2; if (sp.array[i * 3 + 1] < -10) sp.array[i * 3 + 1] = 20; }
    sp.needsUpdate = true;
    // Pings
    for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i]; p.t += dt; p.s.scale.setScalar(0.35 + Math.sin(p.t * 8) * 0.08); p.s.material.opacity = Math.max(0, 1 - p.t / 4); if (p.t > 4) { scene.remove(p.s); pings.splice(i, 1); } }
    // Feuerwerk
    if (z?.gewonnen) { feuerTakt += dt; while (feuerTakt > 0.45) { feuerTakt -= 0.45; rakete(); } }
    for (let i = feuer.length - 1; i >= 0; i--) {
      const f = feuer[i]; f.alter += dt; const a = f.p.geometry.attributes.position;
      f.vel.forEach((v, k) => { v.y -= dt * 6; v.multiplyScalar(Math.pow(0.6, dt)); a.array[k * 3] += v.x * dt; a.array[k * 3 + 1] += v.y * dt; a.array[k * 3 + 2] += v.z * dt; });
      a.needsUpdate = true; f.p.material.opacity = Math.max(0, 1 - f.alter / 2.5);
      if (f.alter > 2.5) { scene.remove(f.p); f.p.geometry.dispose(); feuer.splice(i, 1); }
    }
    O.lampen.forEach((l, i) => (l.intensity = (i ? 45 : 70) * (0.94 + Math.sin(t * 11 + i) * 0.03 + Math.sin(t * 23 + i * 2) * 0.03)));
    renderer.render(scene, camera);
  }

  function groesse(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function setzeFov(f) { camera.fov = f; camera.updateProjectionMatrix(); }

  return { renderer, scene, camera, ich, bewege, ziel, trefferPunkt, zustand, partnerPose, zeigePing, laeute, ziehe, bild, groesse, setzeFov, O, rakete };
}
