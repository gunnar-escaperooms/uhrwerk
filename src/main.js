// Uhrwerk: Menüs, Lobby, Spielschleife, Netzwerk-Abgleich und Bedienung.
import * as L from "./logik.js";
import { RelayNetz, SteamNetz } from "./netz.js";
import { baueWelt, symbolZeichnen } from "./welt.js";
import * as T from "./ton.js";

const { A, B } = L;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const desktop = window.uhrwerkDesktop || null;

// ---------- Einstellungen ----------
const E = Object.assign({ maus: 1, fov: 72, laut: 0.8, invertiert: false, name: "" }, (() => { try { return JSON.parse(localStorage.getItem("uhrwerk-einstellungen")); } catch { return null; } })());
const sichereE = () => { try { localStorage.setItem("uhrwerk-einstellungen", JSON.stringify(E)); } catch {} };
T.setzeLautstaerke(E.laut);

// ---------- Zustand ----------
const S = {
  netz: null, host: false, partnerDa: false, partnerName: "", meineRolle: A, rolleHost: A,
  daten: null, z: null, welt: null, imSpiel: false, offset: 0, pause: false, dokument: false,
  steam: { verfuegbar: false }, eingabe: {}, letztePose: 0,
};
const rolleGast = () => (S.rolleHost === A ? B : A);
const jetzt = () => Date.now() + S.offset;

// ---------- Menüs ----------
function menue(html, setup) {
  $("menue").hidden = false;
  $("tafel").innerHTML = html;
  setup && setup();
  const f = $("tafel").querySelector(".knopf.haupt, .knopf");
  f && f.focus({ preventScroll: true });
}
function schliesseMenue() { $("menue").hidden = true; }

function hauptmenue() {
  trennen();
  const steam = S.steam.verfuegbar;
  menue(`<div><div class="titel">UHRWERK</div><p class="unter">Silvester 1899 · Rathausturm von Lindenau</p></div>
    <p class="leise">Ein Koop-Escape für zwei. Einer im Räderwerk hinter dem Zifferblatt, einer in der Glockenstube darüber. Um Mitternacht muss die Uhr schlagen.</p>
    <div class="stapel">
      ${steam ? `<button class="knopf haupt" id="steamNeu">Mit Steam-Freund spielen</button>` : ""}
      <div class="zeile"><button class="knopf ${steam ? "" : "haupt"}" id="raumNeu">Raum erstellen</button><button class="knopf" id="raumBei">Raum beitreten</button></div>
      <div class="zeile"><button class="knopf" id="steuerung">Steuerung</button><button class="knopf" id="einst">Einstellungen</button>${desktop ? `<button class="knopf" id="ende">Beenden</button>` : ""}</div>
    </div>
    <p class="leise" style="font-size:14px">${steam ? `Angemeldet bei Steam als <b>${esc(S.steam.name)}</b>.` : desktop ? "Steam läuft nicht. Ihr könnt per Raumcode spielen." : "Browser-Version: Spielt per Raumcode."} Redet über Steam-Sprachchat, Discord oder Telefon miteinander.</p>`, () => {
    if (steam) $("steamNeu").onclick = steamErstellen;
    $("raumNeu").onclick = relayErstellen;
    $("raumBei").onclick = beitretenMenue;
    $("steuerung").onclick = () => steuerungMenue(hauptmenue);
    $("einst").onclick = () => einstellungen(hauptmenue);
    if (desktop) $("ende").onclick = () => desktop.beenden();
  });
}

function steuerungMenue(zurueck) {
  menue(`<h2>Steuerung</h2><div class="tasten">
    <kbd>W A S D</kbd><span>laufen (<kbd>Shift</kbd> schneller)</span>
    <kbd>Maus</kbd><span>umsehen</span>
    <kbd>E</kbd><span>benutzen, nehmen, ablegen, lesen</span>
    <kbd>Q</kbd><span>Stelle markieren (dein Partner sieht die Markierung)</span>
    <kbd>Esc</kbd><span>Pause</span></div>
    <p class="leise">Ihr seht verschiedene Dinge. Beschreibt genau, was ihr seht, und fragt nach. Durch die Gitterluke in der Mitte könnt ihr euch sehen.</p>
    <button class="knopf haupt" id="z">Zurück</button>`, () => ($("z").onclick = zurueck));
}

function einstellungen(zurueck) {
  menue(`<h2>Einstellungen</h2>
    <label class="regler">Mausempfindlichkeit <output id="o1">${E.maus.toFixed(1)}</output><input id="r1" type="range" min="0.2" max="3" step="0.1" value="${E.maus}"></label>
    <label class="regler">Sichtfeld <output id="o2">${E.fov}°</output><input id="r2" type="range" min="60" max="100" step="1" value="${E.fov}"></label>
    <label class="regler">Lautstärke <output id="o3">${Math.round(E.laut * 100)} %</output><input id="r3" type="range" min="0" max="1" step="0.05" value="${E.laut}"></label>
    <label class="zeile" style="align-items:center"><input id="inv" type="checkbox" ${E.invertiert ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--messing)"> Maus-Y-Achse umkehren</label>
    ${desktop ? `<label class="stapel"><span class="leise" style="font-size:14px">Relay-Server für Raumcodes</span><input class="feld" id="relay" style="font-size:15px;letter-spacing:0;text-transform:none" value="${esc(RelayNetz.standardUrl())}"></label>` : ""}
    <button class="knopf haupt" id="z">Fertig</button>`, () => {
    const bind = (id, out, key, fmt) => { $(id).oninput = (e) => { E[key] = +e.target.value; $(out).textContent = fmt(E[key]); if (key === "laut") T.setzeLautstaerke(E.laut); if (key === "fov" && S.welt) S.welt.setzeFov(E.fov); sichereE(); }; };
    bind("r1", "o1", "maus", (v) => v.toFixed(1)); bind("r2", "o2", "fov", (v) => v + "°"); bind("r3", "o3", "laut", (v) => Math.round(v * 100) + " %");
    $("inv").onchange = (e) => { E.invertiert = e.target.checked; sichereE(); };
    if (desktop) $("relay").onchange = (e) => { try { localStorage.setItem("uhrwerk-relay", e.target.value.trim()); } catch {} };
    $("z").onclick = zurueck;
  });
}

function beitretenMenue(fehler = "") {
  menue(`<h2>Raum beitreten</h2><p class="leise">Gib den Raumcode ein, den dein Partner sieht.</p>
    <form id="f" class="stapel"><input class="feld" id="c" maxlength="4" autocomplete="off" spellcheck="false" placeholder="CODE" aria-label="Raumcode"><button class="knopf haupt">Beitreten</button><p class="meldung fehler" id="m">${esc(fehler)}</p></form>
    <button class="knopf" id="z">Zurück</button>`, () => {
    $("c").focus();
    $("f").onsubmit = async (e) => {
      e.preventDefault();
      const code = $("c").value.trim().toUpperCase();
      if (!/^[A-Z2-9]{4}$/.test(code)) { $("m").textContent = "Der Code hat vier Zeichen."; return; }
      $("m").textContent = "Verbinde …"; $("m").classList.remove("fehler");
      try { const n = new RelayNetz(RelayNetz.standardUrl()); await n.beitreten(code); verbinde(n); n.senden({ t: "hallo", name: meinName() }); lobby(); }
      catch (err) { $("m").textContent = err.message; $("m").classList.add("fehler"); }
    };
    $("z").onclick = hauptmenue;
  });
}

async function relayErstellen() {
  try { const n = new RelayNetz(RelayNetz.standardUrl()); const code = await n.erstellen(); verbinde(n); S.code = code; lobby(); }
  catch (err) { menue(`<h2>Kein Relay-Server</h2><p class="leise">${esc(err.message)}</p><p class="leise" style="font-size:14px">Starte ihn mit <kbd>npm run relay</kbd> oder trage in den Einstellungen einen anderen Server ein.</p><button class="knopf haupt" id="z">Zurück</button>`, () => ($("z").onclick = hauptmenue)); }
}

async function steamErstellen() {
  try { const n = new SteamNetz(desktop.steam); await n.erstellen(); verbinde(n); S.code = null; lobby(); n.einladen(); }
  catch (err) { menue(`<h2>Steam-Lobby fehlgeschlagen</h2><p class="leise">${esc(err.message)}</p><button class="knopf haupt" id="z">Zurück</button>`, () => ($("z").onclick = hauptmenue)); }
}
async function steamBeitreten(lobbyId) {
  if (S.imSpiel) return;
  trennen();
  try { const n = new SteamNetz(desktop.steam); verbinde(n); await n.beitreten(lobbyId); n.senden({ t: "hallo", name: meinName() }); lobby(); }
  catch (err) { menue(`<h2>Beitritt fehlgeschlagen</h2><p class="leise">${esc(err.message)}</p><button class="knopf haupt" id="z">Zurück</button>`, () => ($("z").onclick = hauptmenue)); }
}

const meinName = () => (S.steam.verfuegbar ? S.steam.name : E.name || (S.host ? "Spieler 1" : "Spieler 2"));

function lobby() {
  const h = S.host;
  const rolle = (r, text) => `<button class="rolle" data-r="${r}" aria-pressed="${(h ? S.rolleHost : rolleGast()) === r}" ${h ? "" : "disabled"}><b>${L.ROLLENNAME[r]}</b><span>${text}</span></button>`;
  menue(`<h2>${h ? "Dein Turm" : "Beigetreten"}</h2>
    ${h && S.code ? `<div><p class="leise">Raumcode für deinen Partner:</p><div class="code">${esc(S.code)}</div></div>` : ""}
    ${h && !S.code ? `<button class="knopf" id="einladen">Steam-Freund einladen</button>` : ""}
    <div class="spieler"><div><b>${esc(meinName())}</b><span class="pille an">du</span></div><div><b>${esc(S.partnerName || "Partner")}</b><span class="pille ${S.partnerDa ? "an" : "aus"}">${S.partnerDa ? "verbunden" : "wartet …"}</span></div></div>
    <div><p class="leise" style="margin-bottom:8px">${h ? "Wähle deinen Platz:" : "Dein Partner wählt die Plätze."}</p>
    <div class="rollen">${rolle(A, "Hinter dem Zifferblatt. Zahnräder, Zeigerwerk, Melodiescheibe.")}${rolle(B, "Darüber, unter freiem Himmel. Glocken, Getriebeplan, Turmbuch.")}</div></div>
    ${h ? `<button class="knopf haupt" id="los" ${S.partnerDa ? "" : "disabled"}>Turm betreten</button>` : `<p class="leise">Warte auf den Start …</p>`}
    <button class="knopf" id="z">Verlassen</button>`, () => {
    if (h) {
      document.querySelectorAll(".rolle").forEach((b) => (b.onclick = () => { S.rolleHost = b.dataset.r; S.netz.senden({ t: "lobby", rolleHost: S.rolleHost, name: meinName() }); lobby(); }));
      $("los").onclick = starteAlsHost;
      if ($("einladen")) $("einladen").onclick = () => S.netz.einladen();
    }
    $("z").onclick = hauptmenue;
  });
}

// ---------- Netzwerk ----------
function verbinde(n) {
  S.netz = n; S.host = n.host; S.partnerDa = !n.host;
  n.on("partner", (da) => {
    S.partnerDa = da;
    if (!da && S.imSpiel) { $("verbindung").hidden = false; document.exitPointerLock?.(); }
    else if (!$("menue").hidden && !S.imSpiel) lobby();
    if (da && S.host) n.senden({ t: "lobby", rolleHost: S.rolleHost, name: meinName() });
  });
  n.on("getrennt", () => { if (S.imSpiel) $("verbindung").hidden = false; });
  n.on("nachricht", empfange);
}
function trennen() { if (S.netz) S.netz.trennen(); S.netz = null; S.partnerDa = false; S.partnerName = ""; }

function empfange(m) {
  switch (m.t) {
    case "hallo": S.partnerName = m.name; if (S.host) { S.netz.senden({ t: "lobby", rolleHost: S.rolleHost, name: meinName() }); lobby(); } break;
    case "lobby": S.rolleHost = m.rolleHost; S.partnerName = m.name; if (!S.imSpiel) lobby(); break;
    case "start": S.offset = m.jetzt - Date.now(); starteSpiel(m.seed, rolleGast(), m.z); break;
    case "aktion": if (S.host) verarbeite(m.a, rolleGast()); break;
    case "zustand": S.offset = S.offset * 0.8 + (m.jetzt - Date.now()) * 0.2; setzeZustand(m.z); break;
    case "ev": m.ev.forEach(ereignis); break;
    case "pose": S.welt?.partnerPose(m); break;
    case "ping": S.welt?.zeigePing(m.p); T.klang("ping"); break;
  }
}

function starteAlsHost() {
  const seed = (Math.random() * 2 ** 31) >>> 0, z = L.anfang(Date.now());
  S.netz.senden({ t: "start", seed, z, jetzt: Date.now() });
  starteSpiel(seed, S.rolleHost, z);
}

// Host: Aktion anwenden und an beide verteilen
function verarbeite(aktion, rolle) {
  const { z, ev } = L.wende(S.z, S.daten, aktion, rolle, Date.now());
  setzeZustand(z);
  S.netz.senden({ t: "zustand", z, jetzt: Date.now() });
  if (ev.length) { S.netz.senden({ t: "ev", ev }); ev.forEach(ereignis); }
}
function aktion(a) {
  if (!S.z || S.z.gewonnen || S.z.verloren) return;
  if (S.host) verarbeite(a, S.meineRolle);
  else S.netz.senden({ t: "aktion", a });
}

// ---------- Spiel ----------
function starteSpiel(seed, rolle, z) {
  T.starte(); T.atmosphaere(true);
  S.daten = L.erzeuge(seed); S.meineRolle = rolle; S.imSpiel = true; S.z = z;
  if (S.welt) { location.reload(); return; }
  S.welt = baueWelt($("welt"), S.daten, rolle);
  S.welt.setzeFov(E.fov);
  S.welt.zustand(z);
  groesse();
  schliesseMenue();
  $("hud").hidden = false;
  $("hud-rolle").textContent = L.ROLLENNAME[rolle];
  aktualisiereHud();
  toast(rolle === A ? "Du stehst im Räderwerk hinter dem Zifferblatt. Über dir, durch die Luke: die Glockenstube." : "Du stehst in der Glockenstube. Unter dir, durch das Gitter: das Räderwerk.");
  sperreMaus();
  let letzte = performance.now();
  const schleife = (t) => {
    const dt = Math.min(0.05, (t - letzte) / 1000); letzte = t;
    if (!S.pause && !S.dokument) S.welt.bewege(dt, S.eingabe);
    zielAnzeige();
    S.welt.bild(dt, t / 1000);
    if (t - S.letztePose > 80 && S.netz) { S.letztePose = t; const i = S.welt.ich; S.netz.senden({ t: "pose", p: [i.pos.x, i.pos.y, i.pos.z], yaw: i.yaw }, false); }
    requestAnimationFrame(schleife);
  };
  requestAnimationFrame(schleife);
  setInterval(() => { if (S.host && S.z && !S.z.gewonnen && !S.z.verloren) { if (L.restMs(S.z, Date.now()) <= 0) verarbeite({ a: "zeit" }, S.meineRolle); } aktualisiereHud(); }, 250);
}

function setzeZustand(z) {
  const alt = S.z; S.z = z; S.welt?.zustand(z);
  if (z.getriebe && !alt?.getriebe) T.tickt(true);
  aktualisiereHud();
}

const AUFTRAG = {
  1: { [A]: "Setzt die richtigen Zahnräder auf die Achsen I bis III. Den Plan hat die Glockenstube.", [B]: "Beschreib den Getriebeplan am Pfeiler. Ohne laufendes Getriebe schweigen die Glocken." },
  2: { [A]: "Lies die Melodiescheibe an der Südwand vor.", [B]: "Läute die Mitternachtsmelodie in der richtigen Reihenfolge." },
  3: { [A]: "Zieht die Bremshebel gleichzeitig. Zählt laut herunter.", [B]: "Zieht die Bremshebel gleichzeitig. Zählt laut herunter." },
  4: { [A]: "Stell am Zeigerwerk die Kalibrierzeit ein.", [B]: "Die Kalibrierzeit steht im Turmbuch auf dem Pult." },
  5: { [A]: "Mitternacht. Geschafft!", [B]: "Mitternacht. Geschafft!" },
};
function aktualisiereHud() {
  if (!S.z) return;
  const n = jetzt(), rest = L.restMs(S.z, n);
  $("hud-uhr").textContent = S.z.gewonnen ? "00:00:00" : L.turmzeit(S.z, n);
  const s = Math.ceil(rest / 1000);
  $("hud-rest").textContent = S.z.gewonnen ? "Prosit Neujahr!" : `noch ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} bis Mitternacht`;
  $("hud-rest").classList.toggle("knapp", s < 120);
  $("hud-auftrag").textContent = AUFTRAG[L.phase(S.z)][S.meineRolle];
  $("hud-partner").textContent = S.partnerDa ? `${S.partnerName || "Partner"} ist verbunden` : "Partner getrennt";
}

function toast(text, schlecht) {
  const d = document.createElement("div");
  d.className = "toast" + (schlecht ? " schlecht" : ""); d.textContent = text;
  $("toasts").appendChild(d);
  setTimeout(() => d.remove(), 6000);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
}

function ereignis(e) {
  if (e.art === "ton") {
    if (e.name === "glocke") { T.glocke(e.i, S.meineRolle === B ? 1 : 0.55); S.welt?.laeute(e.i); }
    else if (e.name === "hebel") { if (!e.leise) T.klang("hebel"); S.welt?.ziehe(e.r); }
    else T.klang(e.name);
  }
  if (e.art === "meldung" && (e.an === "alle" || e.an === S.meineRolle)) toast(e.text, /knirsch|federt|verriegelt|Falsch|dumpf/i.test(e.text));
  if (e.art === "strafe") { const s = $("hud-strafe"); s.textContent = `−${e.s} s`; s.classList.remove("an"); void s.offsetWidth; s.classList.add("an"); T.klang("fehler"); }
  if (e.art === "erfolg" && desktop) desktop.steam.erfolg(e.name);
  if (e.art === "finale") finale();
  if (e.art === "verloren") verloren();
}

function finale() {
  T.tickt(false);
  let k = 0;
  const schlag = setInterval(() => { T.glocke(0, 1.2); S.welt?.laeute(0); if (++k >= 12) clearInterval(schlag); }, 1300);
  setTimeout(() => { for (let i = 0; i < 6; i++) setTimeout(() => { S.welt?.rakete(); T.klang("knall"); }, i * 400); }, 13 * 1300 - 900);
  toast("Die Zeiger springen auf Zwölf. Der Turm beginnt zu schlagen …");
  setTimeout(endbildschirm, 17500);
}

function endbildschirm() {
  document.exitPointerLock?.();
  const dauer = Math.round((S.z.ende - S.z.start) / 1000) + S.z.strafe;
  const sterne = dauer < 10 * 60 && S.z.fehler === 0 ? "★★★" : dauer < 15 * 60 ? "★★☆" : "★☆☆";
  menue(`<div class="titel" style="font-size:56px">Prosit 1900!</div>
    <p>Zwölf Schläge hallen über Lindenau. Unten auf dem Marktplatz jubeln die Leute, und niemand ahnt, wie knapp es war.</p>
    <div class="regler" style="grid-template-columns:1fr auto"><span>Gebraucht</span><b class="mono">${Math.floor(dauer / 60)}:${String(dauer % 60).padStart(2, "0")}</b><span>Fehler</span><b>${S.z.fehler}</b><span>Bewertung</span><b>${sterne}</b></div>
    <button class="knopf haupt" id="z">Zum Hauptmenü</button>`, () => ($("z").onclick = () => location.reload()));
}
function verloren() {
  T.tickt(false); document.exitPointerLock?.();
  menue(`<h2>Mitternacht ist vorbei</h2><p>Die Uhr schweigt. Mit einem schweren Klacken verriegelt der Jahrhundertmechanismus die Turmtür. Ihr werdet das neue Jahrhundert hier oben verbringen.</p><button class="knopf haupt" id="z">Zum Hauptmenü</button>`, () => ($("z").onclick = () => location.reload()));
}

// ---------- Interaktion ----------
const RAUM = { rad: A, achse: A, zeigerwerk: A, melodie: A, glocke: B, plan: B, buch: B, hebel: null };
function aktuellesZiel() {
  const t = S.welt?.ziel();
  if (!t) return null;
  const r = RAUM[t.inter.id];
  if (r && r !== S.meineRolle) return null;
  if (t.inter.id === "hebel" && (t.punkt.y > 3.5) !== (S.meineRolle === B)) return null;
  return t.inter;
}
// Ein Rad, das auf einer Achse sitzt, verhält sich wie die Achse (tauschen oder abnehmen)
function normalisiere(i) {
  if (i.id === "rad") { const k = S.z.achsen.indexOf(i.rad); if (k >= 0) return { id: "achse", achse: k }; }
  return i;
}
function zielText(i) {
  const z = S.z;
  i = normalisiere(i);
  switch (i.id) {
    case "rad": if (z.getriebe) return null; return z.getragen === i.rad ? "Rad ablegen" : `${L.RAEDER[i.rad].name} nehmen`;
    case "achse": {
      const n = L.ACHSEN[i.achse];
      if (z.getriebe) return null;
      if (z.getragen !== null) return `Rad auf Achse ${n} setzen`;
      if (z.achsen[i.achse] !== null) return `${L.RAEDER[z.achsen[i.achse]].name} von Achse ${n} nehmen`;
      return null;
    }
    case "zeigerwerk": return "Zeiger stellen";
    case "melodie": return "Melodiescheibe ansehen";
    case "glocke": return "Glocke läuten";
    case "plan": return "Getriebeplan ansehen";
    case "buch": return "Turmbuch lesen";
    case "hebel": return z.bremse ? null : "Bremshebel ziehen";
  }
}
function zielAnzeige() {
  if (S.pause || S.dokument || !S.z) { $("hinweis").hidden = true; return; }
  const i = aktuellesZiel(), text = i && zielText(i);
  $("kreuz").classList.toggle("ziel", !!text);
  $("hinweis").hidden = !text;
  if (text) $("hinweis").innerHTML = `<kbd>E</kbd>${esc(text)}`;
}
function interagiere(i = aktuellesZiel()) {
  if (!i || !zielText(i)) return;
  i = normalisiere(i);
  const z = S.z;
  switch (i.id) {
    case "rad": aktion(z.getragen === i.rad ? { a: "ablegen" } : { a: "nimm", rad: i.rad }); break;
    case "achse": aktion(z.getragen !== null ? { a: "setze", achse: i.achse } : { a: "nimm", rad: z.achsen[i.achse] }); break;
    case "glocke": aktion({ a: "glocke", i: i.i }); break;
    case "hebel": aktion({ a: "hebel" }); break;
    case "zeigerwerk": zeigerwerk(); break;
    case "melodie": melodieScheibe(); break;
    case "plan": getriebeplan(); break;
    case "buch": turmbuch(); break;
  }
}

// ---------- Dokumente ----------
function dokument(html, setup) {
  S.dokument = true; document.exitPointerLock?.();
  $("dokument").hidden = false; $("blatt").innerHTML = html + `<div class="zeile"><button class="knopf" id="dz">Schließen</button></div>`;
  $("dz").onclick = schliesseDokument;
  setup && setup();
}
function schliesseDokument() { $("dokument").hidden = true; S.dokument = false; sperreMaus(); }

function zeichne(w, h, malen) { const c = document.createElement("canvas"); c.width = w; c.height = h; malen(c.getContext("2d"), w, h); return c; }

function getriebeplan() {
  const d = S.daten;
  dokument(`<h2>Getriebeplan</h2><p class="hand">Für den Jahrhundertmechanismus. Die Räder sind im Maßstab gezeichnet. Achtet auf die Größe, die Farben sind egal.</p><div id="leinwand"></div><p class="hand">– M. Voss, Uhrmacherin</p>`, () => {
    $("leinwand").appendChild(zeichne(640, 300, (g, w, h) => {
      g.strokeStyle = "#2a3a6a"; g.fillStyle = "#2a3a6a"; g.lineWidth = 3; g.font = "bold 26px Georgia"; g.textAlign = "center";
      d.ziel.forEach((rad, i) => {
        const cx = 110 + i * 210, cy = 140, r = d.radien[rad] * 260;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
        for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8)); g.stroke(); }
        g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
        g.fillText(`Achse ${L.ACHSEN[i]}`, cx, 285);
      });
    }));
  });
}
function melodieScheibe() {
  const d = S.daten;
  dokument(`<h2>Melodiescheibe</h2><p class="hand">Eingraviert in Messing. Ab der Markierung oben, im Uhrzeigersinn gelesen.</p><div id="leinwand"></div>`, () => {
    $("leinwand").appendChild(zeichne(560, 560, (g, w) => {
      g.fillStyle = "#c9a24a"; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 10, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#6a4a12"; g.lineWidth = 8; g.stroke();
      g.fillStyle = "#3a2806";
      d.melodie.forEach((gl, k) => { const a = -Math.PI / 2 + (k / d.melodie.length) * Math.PI * 2; symbolZeichnen(g, d.glockenSymbol[gl], w / 2 + Math.cos(a) * 180, w / 2 + Math.sin(a) * 180, 44); });
      g.beginPath(); g.moveTo(w / 2, 22); g.lineTo(w / 2 - 20, 58); g.lineTo(w / 2 + 20, 58); g.fill();
      g.lineWidth = 4; g.strokeStyle = "#3a2806"; g.beginPath(); g.arc(w / 2, w / 2, 90, -Math.PI / 2 + 0.3, Math.PI * 1.3); g.stroke();
      const e = Math.PI * 1.3; g.beginPath(); g.moveTo(w / 2 + Math.cos(e) * 90, w / 2 + Math.sin(e) * 90); g.lineTo(w / 2 + Math.cos(e) * 90 + 14, w / 2 + Math.sin(e) * 90 - 10); g.lineTo(w / 2 + Math.cos(e) * 90 + 16, w / 2 + Math.sin(e) * 90 + 12); g.fill();
    }));
  });
}
function turmbuch() {
  const k = S.daten.kalibrier;
  dokument(`<h2>Turmbuch</h2>
    <p class="hand">31. Dezember 1899. Wenn ihr das lest, hat mein Mechanismus euch eingeschlossen. Verzeiht mir. Er soll nur sicherstellen, dass die Uhr das neue Jahrhundert pünktlich einläutet.</p>
    <p class="hand">Erst muss das Getriebe laufen, dann die Mitternachtsmelodie erklingen. Danach lösen beide Bremshebel nur gemeinsam, so wie ich es mit meinem Bruder gebaut habe: einer oben, einer unten, im selben Augenblick.</p>
    <p class="hand">Zuletzt stellt das Zeigerwerk auf die Kalibrierzeit: <b style="font-style:normal;font-family:var(--f-mono);font-size:26px">${k.h}:${String(k.m).padStart(2, "0")} Uhr</b>. Dann läuft die Uhr von selbst auf Mitternacht.</p>
    <p class="hand">– Margarete Voss</p>`);
}
function zeigerwerk() {
  let h = S.z.zeiger.h, m = S.z.zeiger.m;
  dokument(`<h2>Zeigerwerk</h2><p class="hand">Zwei Stellräder für Stunden und Minuten. Die Bremse muss gelöst sein.</p>
    <div class="stellen"><div class="drehfeld"><span>Stunde</span><button class="knopf" data-d="h1">▲</button><output id="oh">${h}</output><button class="knopf" data-d="h-1">▼</button></div>
    <div id="mini"></div>
    <div class="drehfeld"><span>Minute</span><button class="knopf" data-d="m5">▲</button><output id="om">${String(m).padStart(2, "0")}</output><button class="knopf" data-d="m-5">▼</button></div></div>
    <button class="knopf haupt" id="stellen">Zeiger einstellen</button>`, () => {
    const male = () => {
      $("oh").textContent = h; $("om").textContent = String(m).padStart(2, "0");
      $("mini").innerHTML = ""; $("mini").appendChild(zeichne(140, 140, (g, w) => {
        g.fillStyle = "#f3ead2"; g.strokeStyle = "#3a2806"; g.lineWidth = 4; g.beginPath(); g.arc(70, 70, 64, 0, 7); g.fill(); g.stroke();
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(70 + Math.sin(a) * 54, 70 - Math.cos(a) * 54); g.lineTo(70 + Math.sin(a) * 62, 70 - Math.cos(a) * 62); g.stroke(); }
        const zeig = (a, l, b) => { g.lineWidth = b; g.beginPath(); g.moveTo(70, 70); g.lineTo(70 + Math.sin(a) * l, 70 - Math.cos(a) * l); g.stroke(); };
        zeig(((h % 12) + m / 60) / 12 * Math.PI * 2, 34, 6); zeig(m / 60 * Math.PI * 2, 52, 3);
      }));
    };
    male();
    $("blatt").querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => {
      const d = b.dataset.d, v = +d.slice(1);
      if (d[0] === "h") h = ((h - 1 + v + 12) % 12) + 1; else m = (m + v + 60) % 60;
      T.klang("klack"); male();
    }));
    $("stellen").onclick = () => { aktion({ a: "zeiger", h, m }); schliesseDokument(); };
  });
}

// ---------- Eingabe ----------
const canvas = $("welt");
function sperreMaus() { if (S.imSpiel && !S.dokument && !S.pause) canvas.requestPointerLock?.()?.catch?.(() => {}); }
canvas.addEventListener("click", () => { T.starte(); sperreMaus(); });
document.addEventListener("pointerlockchange", () => {
  if (!document.pointerLockElement && S.imSpiel && !S.dokument && !S.z?.gewonnen && !S.z?.verloren && $("menue").hidden) pausenmenue();
});
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== canvas || !S.welt) return;
  const f = 0.0022 * E.maus;
  S.welt.ich.yaw -= e.movementX * f;
  S.welt.ich.pitch = Math.max(-1.45, Math.min(1.45, S.welt.ich.pitch - e.movementY * f * (E.invertiert ? -1 : 1)));
});
const TASTEN = { KeyW: "vor", ArrowUp: "vor", KeyS: "zurueck", ArrowDown: "zurueck", KeyA: "links", ArrowLeft: "links", KeyD: "rechts", ArrowRight: "rechts", ShiftLeft: "rennen", ShiftRight: "rennen" };
document.addEventListener("keydown", (e) => {
  if (!S.imSpiel) return;
  if (TASTEN[e.code]) { S.eingabe[TASTEN[e.code]] = true; e.preventDefault(); }
  if (e.code === "KeyE" && !e.repeat) { if (S.dokument) schliesseDokument(); else if (!S.pause) interagiere(); }
  if (e.code === "KeyQ" && !e.repeat && !S.pause && !S.dokument) { const p = S.welt.trefferPunkt(); if (p) { S.welt.zeigePing(p); T.klang("ping"); S.netz?.senden({ t: "ping", p }); } }
  if (e.code === "Escape" && S.dokument) schliesseDokument();
});
document.addEventListener("keyup", (e) => { if (TASTEN[e.code]) S.eingabe[TASTEN[e.code]] = false; });
window.addEventListener("blur", () => (S.eingabe = {}));

function pausenmenue() {
  S.pause = true; S.eingabe = {};
  const weiter = () => { S.pause = false; schliesseMenue(); sperreMaus(); };
  menue(`<h2>Pause</h2><p class="leise">Die Zeit läuft weiter. Euer Turm wartet nicht.</p>
    <button class="knopf haupt" id="w">Weiterspielen</button>
    <div class="zeile"><button class="knopf" id="st">Steuerung</button><button class="knopf" id="ei">Einstellungen</button></div>
    <button class="knopf" id="hm">Spiel verlassen</button>`, () => {
    $("w").onclick = weiter;
    $("st").onclick = () => steuerungMenue(pausenmenue);
    $("ei").onclick = () => einstellungen(pausenmenue);
    $("hm").onclick = () => { trennen(); location.reload(); };
  });
}
$("zumMenue").onclick = () => location.reload();

function groesse() { S.welt?.groesse(window.innerWidth, window.innerHeight); }
window.addEventListener("resize", groesse);

// ---------- Start ----------
(async () => {
  if (desktop) {
    try { S.steam = await desktop.steam.info(); } catch { S.steam = { verfuegbar: false }; }
    if (S.steam.verfuegbar) desktop.steam.onEinladung(({ lobby }) => steamBeitreten(lobby));
  }
  hauptmenue();
})();

// Testzugang (für automatische Tests und zum Debuggen)
window.__uw = { S, L, interagiere, aktion, ziel: () => aktuellesZiel(), schaue: (yaw, pitch) => { S.welt.ich.yaw = yaw; S.welt.ich.pitch = pitch; }, gehe: (x, z) => { S.welt.ich.pos.x = x; S.welt.ich.pos.z = z; } };
