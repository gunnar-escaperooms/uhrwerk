// Relay-Server für Uhrwerk: verbindet zwei Spieler per Raumcode, ohne Steam.
// Liefert außerdem das Spiel unter http://localhost:PORT/ aus (zum Spielen im Browser).
//
//   node server/relay.js            Port 8787
//   PORT=9000 node server/relay.js
const http = require("http"), fs = require("fs"), path = require("path");
let ws; try { ws = require("ws"); } catch { ws = require("./ws"); } // im ZIP liegt ws direkt daneben
const { WebSocketServer } = ws;

const PORT = +process.env.PORT || 8787;
const WURZEL = path.join(__dirname, "..", "src");
const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  const pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const datei = path.normalize(path.join(WURZEL, pfad === "/" ? "index.html" : pfad));
  if (!datei.startsWith(WURZEL)) { res.writeHead(403); return res.end(); }
  fs.readFile(datei, (err, inhalt) => {
    if (err) { res.writeHead(404); return res.end("Nicht gefunden"); }
    res.writeHead(200, { "Content-Type": TYPEN[path.extname(datei)] || "application/octet-stream" });
    res.end(inhalt);
  });
});

const raeume = new Map(); // code -> [host, gast]
const ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const neuerCode = () => { let c; do { c = Array.from({ length: 4 }, () => ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)]).join(""); } while (raeume.has(c)); return c; };

const wss = new WebSocketServer({ server, path: "/relay", maxPayload: 64 * 1024 });
wss.on("connection", (ws) => {
  ws.raum = null;
  const sende = (s, obj) => s.readyState === 1 && s.send(JSON.stringify(obj));
  ws.on("message", (roh) => {
    let m; try { m = JSON.parse(roh); } catch { return; }
    if (m.relay === "erstellen" && !ws.raum) {
      const code = neuerCode();
      raeume.set(code, [ws]); ws.raum = code;
      return sende(ws, { relay: "bereit", code, host: true });
    }
    if (m.relay === "beitreten" && !ws.raum) {
      const code = String(m.code || "").toUpperCase(), r = raeume.get(code);
      if (!r) return sende(ws, { relay: "fehler", text: "Diesen Raum gibt es nicht." });
      if (r.length >= 2) return sende(ws, { relay: "fehler", text: "Der Raum ist schon voll." });
      r.push(ws); ws.raum = code;
      sende(ws, { relay: "bereit", code, host: false });
      return sende(r[0], { relay: "partner", da: true });
    }
    if (m.relay === "daten" && ws.raum) {
      for (const andere of raeume.get(ws.raum) || []) if (andere !== ws) sende(andere, { relay: "daten", d: m.d });
    }
  });
  ws.on("close", () => {
    const r = raeume.get(ws.raum);
    if (!r) return;
    const rest = r.filter((x) => x !== ws);
    rest.forEach((x) => sende(x, { relay: "partner", da: false }));
    if (rest.length === 0 || r[0] === ws) { raeume.delete(ws.raum); rest.forEach((x) => x.close()); }
    else raeume.set(ws.raum, rest);
  });
});

server.listen(PORT, () => console.log(`Uhrwerk-Relay läuft: http://localhost:${PORT}/  (WebSocket /relay)`));
module.exports = server;
