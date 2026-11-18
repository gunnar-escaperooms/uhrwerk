// Spiellogik von Uhrwerk. Läuft nur beim Host; der Gast schickt Aktionen und bekommt den Zustand.
// Ohne Abhängigkeiten, damit sie sich in Node testen lässt.

export const DAUER = 20 * 60 * 1000; // 23:40 → 00:00
export const STRAFE = 20;            // Sekunden pro Fehler
export const GLEICHZEITIG = 1500;    // ms Spielraum für die Doppelhebel
export const A = "raederwerk", B = "glockenstube";
export const ROLLENNAME = { [A]: "Räderwerk", [B]: "Glockenstube" };

export const RAEDER = [
  { name: "Messingrad", farbe: 0xc9a24a },
  { name: "Kupferrad", farbe: 0xb8673a },
  { name: "Eisenrad", farbe: 0x6e7378 },
  { name: "Silberrad", farbe: 0xc8ccd2 },
  { name: "Bronzerad", farbe: 0x7d5a2c },
];
export const SYMBOLE = ["Kreis", "Dreieck", "Quadrat", "Raute", "Stern"];
export const ACHSEN = ["I", "II", "III"];

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mische = (r, l) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Erzeugt alle Rätsel aus dem Startwert. Beide Spieler rechnen dasselbe aus.
export function erzeuge(seed) {
  const r = rng(seed);
  const radien = mische(r, [0.2, 0.26, 0.32, 0.38, 0.44]);           // Radius je Zahnrad
  const ziel = mische(r, [0, 1, 2, 3, 4]).slice(0, 3);              // Zahnrad je Achse I–III
  const glockenSymbol = mische(r, [0, 1, 2, 3, 4]);                 // Glocke i (groß→klein) trägt Symbol
  const melodie = [];
  while (melodie.length < 5) { const g = Math.floor(r() * 5); if (g !== melodie[melodie.length - 1]) melodie.push(g); }
  const kalibrier = { h: 1 + Math.floor(r() * 11), m: 5 * (1 + Math.floor(r() * 11)) };
  return { seed, radien, ziel, glockenSymbol, melodie, kalibrier };
}

export function anfang(jetzt) {
  return {
    start: jetzt, strafe: 0, fehler: 0,
    achsen: [null, null, null], getragen: null, getriebe: false,
    folge: [], glocken: false,
    hebel: { [A]: 0, [B]: 0 }, bremse: false,
    zeiger: { h: 12, m: 0 }, gewonnen: false, verloren: false, ende: null,
  };
}

export function restMs(z, jetzt) {
  const bis = z.ende || jetzt;
  return Math.max(0, DAUER - (bis - z.start) - z.strafe * 1000);
}
// Uhrzeit im Turm: 23:40 plus verstrichene Zeit (inkl. Strafen)
export function turmzeit(z, jetzt) {
  const s = Math.floor((DAUER - restMs(z, jetzt)) / 1000) + 23 * 3600 + 40 * 60;
  const t = s % 86400;
  return `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor(t / 60) % 60).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function phase(z) {
  if (z.gewonnen) return 5;
  if (z.bremse) return 4;
  if (z.glocken) return 3;
  if (z.getriebe) return 2;
  return 1;
}

// Wendet eine Aktion an. Gibt den neuen Zustand und Ereignisse (Töne, Meldungen) zurück.
export function wende(alt, d, aktion, rolle, jetzt) {
  const z = structuredClone(alt);
  const ev = [];
  const meldung = (an, text) => ev.push({ art: "meldung", an, text });
  const ton = (name, extra = {}) => ev.push({ art: "ton", name, ...extra });
  const strafe = (text) => { z.strafe += STRAFE; z.fehler++; ev.push({ art: "strafe", s: STRAFE }); meldung(rolle, text); };
  if (z.gewonnen || z.verloren) return { z, ev };

  switch (aktion.a) {
    case "nimm": {
      if (rolle !== A) break;
      if (z.getriebe) { meldung(A, "Das Getriebe läuft. Finger weg!"); break; }
      const i = z.achsen.indexOf(aktion.rad);
      if (i >= 0) z.achsen[i] = null;
      z.getragen = aktion.rad;
      ton("klack");
      break;
    }
    case "ablegen": {
      if (rolle !== A) break;
      z.getragen = null;
      break;
    }
    case "setze": {
      if (rolle !== A || z.getriebe || z.getragen === null) break;
      const k = aktion.achse;
      const vorher = z.achsen[k];
      z.achsen[k] = z.getragen;
      z.getragen = vorher;
      ton("klack");
      if (z.achsen.every((x) => x !== null)) {
        if (z.achsen.every((x, i) => x === d.ziel[i])) {
          z.getriebe = true;
          z.getragen = null;
          ton("getriebe");
          meldung("alle", "Das Getriebe greift. Irgendwo über euch beginnt die Glockenwalze sich zu drehen.");
        } else {
          ton("knirschen");
          strafe("Die Zähne knirschen und rutschen durch. Falsche Räder auf den Achsen.");
        }
      }
      break;
    }
    case "glocke": {
      if (rolle !== B) break;
      ton("glocke", { i: aktion.i });
      if (!z.getriebe) { meldung(B, "Die Glocke klingt dumpf. Solange das Getriebe steht, zählt keine Melodie."); break; }
      if (z.glocken) break;
      z.folge.push(aktion.i);
      z.folge = z.folge.slice(-d.melodie.length);
      if (z.folge.length === d.melodie.length && z.folge.every((x, i) => x === d.melodie[i])) {
        z.glocken = true;
        ton("erfolg");
        meldung("alle", "Die Mitternachtsmelodie hallt durch den Turm. Mit einem Klacken lösen sich die Riegel der Bremshebel.");
      }
      break;
    }
    case "hebel": {
      if (!z.glocken) { meldung(rolle, "Der Hebel ist verriegelt. Erst muss die Melodie gespielt werden."); ton("klack"); ton("hebel", { r: rolle, leise: true }); break; }
      if (z.bremse) break;
      const andere = rolle === A ? B : A;
      z.hebel[rolle] = jetzt;
      ton("hebel", { r: rolle });
      if (z.hebel[andere] && Math.abs(jetzt - z.hebel[andere]) <= GLEICHZEITIG) {
        z.bremse = true;
        ton("bremse");
        meldung("alle", "Beide Hebel rasten ein. Die Bremse gibt das Zeigerwerk frei.");
      } else {
        meldung(rolle, "Der Hebel federt zurück. Ihr müsst gleichzeitig ziehen. Zählt laut herunter.");
      }
      break;
    }
    case "zeiger": {
      if (rolle !== A) break;
      if (!z.bremse) { meldung(A, "Die Bremse hält das Zeigerwerk fest."); break; }
      const h = ((aktion.h - 1 + 12) % 12) + 1, m = ((aktion.m % 60) + 60) % 60;
      z.zeiger = { h, m };
      if (h === d.kalibrier.h && m === d.kalibrier.m) {
        z.gewonnen = true;
        z.ende = jetzt;
        ev.push({ art: "finale" });
        ev.push({ art: "erfolg", name: "UHRWERK_GESCHAFFT" });
        if (z.fehler === 0) ev.push({ art: "erfolg", name: "UHRWERK_FEHLERFREI" });
        if (jetzt - z.start < 10 * 60 * 1000) ev.push({ art: "erfolg", name: "UHRWERK_SCHNELL" });
      } else {
        ton("knirschen");
        strafe("Das Uhrwerk ruckt, aber nichts rastet ein. Falsche Zeit.");
      }
      break;
    }
    case "zeit": {
      if (restMs(z, jetzt) <= 0) { z.verloren = true; z.ende = jetzt; ev.push({ art: "verloren" }); }
      break;
    }
  }
  return { z, ev };
}
