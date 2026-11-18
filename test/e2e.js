// Ende-zu-Ende-Test: Relay-Server + zwei Browserfenster spielen das Spiel komplett durch.
const { chromium } = require("playwright");
process.env.PORT = process.env.PORT || "8799";
const server = require("../server/relay.js");
const URL = `http://localhost:${process.env.PORT}/`;
const SCHIRM = process.env.SCREENSHOTS;
const fehlerGlobal = [];

(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const fehler = fehlerGlobal;
  const fenster = async (name) => {
    const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
    p.on("pageerror", (e) => fehler.push(`${name}: ${e.message}`));
    p.on("console", (m) => m.type() === "error" && fehler.push(`${name}: ${m.text()}`));
    await p.goto(URL); return p;
  };
  const host = await fenster("host"), gast = await fenster("gast");
  await host.click("#raumNeu");
  const code = (await host.textContent(".code")).trim();
  await gast.click("#raumBei"); await gast.fill("#c", code); await gast.click("#f button");
  await host.waitForSelector('.pille.an:has-text("verbunden")');
  await host.click('.rolle[data-r="raederwerk"]');
  await host.click("#los");
  await host.waitForFunction(() => window.__uw.S.imSpiel); await gast.waitForFunction(() => window.__uw.S.imSpiel);
  console.log("Verbunden über Raum", code, "| Rollen:", await host.evaluate(() => __uw.S.meineRolle), "/", await gast.evaluate(() => __uw.S.meineRolle));
  const d = await host.evaluate(() => __uw.S.daten);
  const dg = await gast.evaluate(() => __uw.S.daten);
  if (JSON.stringify(d) !== JSON.stringify(dg)) throw new Error("Rätsel unterschiedlich!");

  // Hingehen, anschauen, E drücken
  const nutze = async (p, stand, ziel, erwartet) => {
    const text = await p.evaluate(([stand, ziel, erwartet]) => {
      __uw.gehe(stand[0], stand[1]);
      const S = __uw.S, y0 = S.welt.ich.pos.y + 1.65;
      const dx = ziel[0] - stand[0], dy = ziel[1] - y0, dz = ziel[2] - stand[1];
      __uw.schaue(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
      return new Promise((ok) => { const t0 = Date.now(); const pruefe = () => { const h = document.getElementById("hinweis"); if ((!h.hidden && (!erwartet || h.textContent.includes(erwartet))) || Date.now() - t0 > 10000) ok(h.hidden ? null : h.textContent); else setTimeout(pruefe, 50); }; setTimeout(pruefe, 60); });
    }, [stand, ziel, erwartet]);
    if (erwartet && !(text || "").includes(erwartet)) { if (SCHIRM) await p.screenshot({ path: SCHIRM + "/fehler.png" }); console.log("Debug:", await p.evaluate(() => ({ hint: document.getElementById("hinweis").textContent, akt: __uw.ziel(), pause: __uw.S.pause, dok: __uw.S.dokument, yawpitch: [__uw.S.welt.ich.yaw, __uw.S.welt.ich.pitch],  z: __uw.S.z.achsen, getragen: __uw.S.z.getragen, cam: __uw.S.welt.camera.position.toArray(), ziel: __uw.S.welt.ziel() }))); } if (erwartet && !(text || "").includes(erwartet)) throw new Error(`Erwartet „${erwartet}“, sichtbar: „${text}“`);
    await p.keyboard.press("e");
    await p.waitForTimeout(150);
    return text;
  };
  const z = (p) => p.evaluate(() => __uw.S.z);
  const BANK = (i) => [-3.4, 0.98, -1.4 + i * 0.7], ACHSE = (k) => [3.78, 1.5, -1.3 + k * 1.3];

  // Phase 1: falsches Rad zuerst (Fehler), dann richtig
  const falsch = [0, 1, 2, 3, 4].find((x) => !d.ziel.includes(x));
  const belegung = [falsch, d.ziel[1], d.ziel[2]];
  for (let k = 0; k < 3; k++) {
    await nutze(host, [-2.5, BANK(belegung[k])[2]], BANK(belegung[k]), "nehmen");
    await nutze(host, [3.0, ACHSE(k)[2]], ACHSE(k), "setzen");
  }
  await gast.waitForFunction(() => __uw.S.z.fehler === 1, null, { timeout: 15000 });
  console.log("Fehler nach falschem Getriebe:", (await z(gast)).fehler);
  await nutze(host, [-2.5, BANK(d.ziel[0])[2]], BANK(d.ziel[0]), "nehmen");
  await nutze(host, [3.0, ACHSE(0)[2]], ACHSE(0), "setzen");
  await host.waitForTimeout(300);
  await gast.waitForFunction(() => __uw.S.z.getriebe, null, { timeout: 15000 });
  console.log("Getriebe läuft (beim Gast gesehen):", (await z(gast)).getriebe);
  if (SCHIRM) { await host.evaluate(() => { __uw.gehe(0, 2.4); __uw.schaue(0, 0.05); }); await host.waitForTimeout(400); await host.screenshot({ path: SCHIRM + "/a-zifferblatt.png" });
    await host.evaluate(() => { __uw.gehe(0.5, 1.5); __uw.schaue(-1.0, 0.0); }); await host.waitForTimeout(300); await host.screenshot({ path: SCHIRM + "/a-achsen.png" }); }

  // Phase 2: Gast liest Plan/Buch (Dokumente), Host liest Scheibe, Gast läutet
  await nutze(gast, [2.6, 0], [3.6, 5.2, 0], "Getriebeplan"); await gast.keyboard.press("Escape");
  await nutze(host, [-1.6, 2.6], [-1.6, 1.7, 3.97], "Melodiescheibe"); if (SCHIRM) await host.screenshot({ path: SCHIRM + "/a-scheibe.png" }); await host.keyboard.press("Escape");
  const GX = [-2.6, -1.3, 0, 1.25, 2.4];
  for (const i of d.melodie) await nutze(gast, [GX[i], -0.4], [GX[i], 4.6, -1.38], "Glocke");
  await gast.waitForTimeout(300);
  await host.waitForFunction(() => __uw.S.z.glocken, null, { timeout: 15000 });
  console.log("Melodie erkannt:", (await z(host)).glocken);
  // Sieht der Gast die Figur des Hosts dort, wo der Host steht?
  await host.evaluate(() => __uw.gehe(0.4, 0.5));
  await gast.waitForFunction(() => { const p = __uw.S.welt.scene.children.find((o) => o.type === "Group" && o.children.some((c) => c.isPointLight)); return p && p.visible && Math.hypot(p.position.x - 0.4, p.position.z - 0.5) < 0.3; }, null, { timeout: 15000 });
  console.log("Partnerfigur sichtbar und synchron: true");
  if (SCHIRM) { await gast.evaluate(() => { __uw.gehe(0, 2.8); __uw.schaue(0, 0.15); }); await gast.waitForTimeout(400); await gast.screenshot({ path: SCHIRM + "/b-glocken.png" });
    await gast.evaluate(() => { __uw.gehe(0, 1.6); __uw.schaue(0.2, -1.1); }); await host.evaluate(() => { __uw.gehe(0.3, 0.6); }); await gast.waitForTimeout(600); await gast.screenshot({ path: SCHIRM + "/b-luke.png" }); }

  // Phase 3: Hebel – erst einzeln (federt zurück), dann gleichzeitig
  await nutze(host, [2.6, 2.2], [2.6, 0.9, 3.2], "Bremshebel");
  await host.waitForTimeout(2000);
  const zielHebelA = nutze(host, [2.6, 2.2], [2.6, 0.9, 3.2], "Bremshebel");
  const zielHebelB = nutze(gast, [2.6, 2.2], [2.6, 4.5, 3.2], "Bremshebel");
  await Promise.all([zielHebelA, zielHebelB]);
  await host.waitForTimeout(300);
  await gast.waitForFunction(() => __uw.S.z.bremse, null, { timeout: 15000 });
  console.log("Bremse gelöst:", (await z(gast)).bremse);

  // Phase 4: Turmbuch lesen, Zeiger stellen
  await nutze(gast, [-2.0, 1.4], [-2.9, 4.65, 2.2], "Turmbuch");
  const buch = await gast.textContent("#blatt"); await gast.keyboard.press("Escape");
  const [hh, mm] = buch.match(/(\d+):(\d+) Uhr/).slice(1).map(Number);
  console.log("Kalibrierzeit laut Buch:", hh + ":" + mm, "| erwartet:", d.kalibrier);
  await nutze(host, [2.0, -2.4], [2.0, 0.95, -3.5], "Zeiger");
  const stelle = async (sel, oben, unten, wert, aktuell, schritt, mod) => { while ((await host.textContent(sel)).replace(/^0/, "") !== String(wert)) await host.click(`[data-d="${oben}"]`); };
  await stelle("#oh", "h1", "h-1", hh); await stelle("#om", "m5", "m-5", mm);
  await host.click("#stellen");
  await gast.waitForFunction(() => __uw.S.z.gewonnen, null, { timeout: 15000 });
  console.log("Gewonnen (Host/Gast):", (await z(host)).gewonnen, (await z(gast)).gewonnen);
  if (SCHIRM) { await gast.evaluate(() => { __uw.gehe(0, -2.5); __uw.schaue(Math.PI, 0.35); }); await gast.waitForTimeout(6000); await gast.screenshot({ path: SCHIRM + "/b-feuerwerk.png" }); }
  console.log("Fehler:", fehler.length ? fehler : "keine");
  await b.close(); server.close();
  if (fehler.length) process.exit(1);
})().catch((e) => { console.error(e); console.error("Browserfehler:", fehlerGlobal); process.exit(1); });
