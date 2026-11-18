// Tests der Spiellogik: komplette Lösung, Fehlerfälle, Gleichzeitigkeit, Zeitablauf.
const assert = require("assert");
(async () => {
  const L = await import("../src/logik.js");
  const { A, B } = L;
  let t = 1_000_000;
  for (let seed = 1; seed <= 300; seed++) {
    const d = L.erzeuge(seed);
    assert.equal(new Set(d.ziel).size, 3);
    assert.ok(d.melodie.every((x, i) => x !== d.melodie[i - 1]));
    assert.ok(d.kalibrier.h >= 1 && d.kalibrier.h <= 11 && d.kalibrier.m % 5 === 0 && d.kalibrier.m > 0);
  }
  const d = L.erzeuge(4711);
  let z = L.anfang(t), r;
  const tu = (a, rolle, dt = 1000) => { t += dt; r = L.wende(z, d, a, rolle, t); z = r.z; return r.ev; };
  // Glocke vor dem Getriebe zählt nicht
  assert.ok(tu({ a: "glocke", i: 0 }, B).some((e) => e.art === "meldung"));
  // Hebel vor der Melodie verriegelt
  tu({ a: "hebel" }, A); assert.equal(z.bremse, false);
  // Falsches Getriebe kostet Zeit
  const falsch = [0, 1, 2, 3, 4].filter((x) => !d.ziel.includes(x))[0];
  tu({ a: "nimm", rad: falsch }, A); tu({ a: "setze", achse: 0 }, A);
  tu({ a: "nimm", rad: d.ziel[1] }, A); tu({ a: "setze", achse: 1 }, A);
  const ev = (tu({ a: "nimm", rad: d.ziel[2] }, A), tu({ a: "setze", achse: 2 }, A));
  assert.ok(ev.some((e) => e.art === "strafe")); assert.equal(z.fehler, 1); assert.equal(z.getriebe, false);
  // Richtiges Rad tauschen: Achse I neu belegen, getragenes Rad wird gewechselt
  tu({ a: "nimm", rad: d.ziel[0] }, A); tu({ a: "setze", achse: 0 }, A);
  assert.equal(z.getriebe, true, "Getriebe sollte laufen");
  // Gast darf keine Räder nehmen
  tu({ a: "nimm", rad: 0 }, B); assert.equal(z.getragen, null);
  // Melodie mit Vorlauf
  tu({ a: "glocke", i: (d.melodie[0] + 1) % 5 }, B);
  d.melodie.forEach((i) => tu({ a: "glocke", i }, B));
  assert.equal(z.glocken, true, "Melodie sollte erkannt werden");
  // Hebel nacheinander (zu langsam), dann gleichzeitig
  tu({ a: "hebel" }, A); tu({ a: "hebel" }, B, 4000); assert.equal(z.bremse, false);
  tu({ a: "hebel" }, A, 600); assert.equal(z.bremse, true);
  // Falsche, dann richtige Zeit
  tu({ a: "zeiger", h: d.kalibrier.h, m: (d.kalibrier.m + 5) % 60 }, A); assert.equal(z.fehler, 2);
  const fin = tu({ a: "zeiger", h: d.kalibrier.h, m: d.kalibrier.m }, A);
  assert.ok(z.gewonnen && fin.some((e) => e.art === "finale"));
  assert.ok(fin.some((e) => e.name === "UHRWERK_SCHNELL"));
  // Zeitablauf
  let y = L.anfang(0);
  y = L.wende(y, d, { a: "zeit" }, A, L.DAUER + 1).z;
  assert.equal(y.verloren, true);
  assert.equal(L.turmzeit(L.anfang(0), 0), "23:40:00");
  assert.equal(L.turmzeit(L.anfang(0), L.DAUER), "00:00:00");
  console.log("Logik: alle Tests bestanden");
})().catch((e) => { console.error(e); process.exit(1); });
