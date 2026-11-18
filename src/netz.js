// Verbindung zwischen den beiden Spielern. Zwei Wege mit gleicher Schnittstelle:
//   RelayNetz  – über den Relay-Server per Raumcode (Browser und Desktop ohne Steam)
//   SteamNetz  – über Steam-Lobby und Steam-P2P (Desktop mit Steam)
// Ereignisse: "nachricht" (obj), "partner" (true/false), "getrennt"

class Basis {
  constructor() { this.hoerer = {}; this.host = false; }
  on(e, f) { (this.hoerer[e] ||= []).push(f); }
  emit(e, d) { for (const f of this.hoerer[e] || []) f(d); }
}

export class RelayNetz extends Basis {
  constructor(url) { super(); this.url = url; this.ws = null; }
  static standardUrl() {
    if (location.protocol === "http:" || location.protocol === "https:") return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/relay`;
    try { return localStorage.getItem("uhrwerk-relay") || "ws://localhost:8787/relay"; } catch { return "ws://localhost:8787/relay"; }
  }
  verbinden(nachricht) {
    return new Promise((ok, nein) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      const zeit = setTimeout(() => nein(new Error("Der Relay-Server antwortet nicht.")), 6000);
      ws.onopen = () => ws.send(JSON.stringify(nachricht));
      ws.onerror = () => { clearTimeout(zeit); nein(new Error("Keine Verbindung zum Relay-Server.")); };
      ws.onclose = () => this.emit("getrennt");
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.relay === "bereit") { clearTimeout(zeit); this.host = m.host; this.code = m.code; if (!m.host) this.emit("partner", true); ok(m.code); }
        else if (m.relay === "fehler") { clearTimeout(zeit); nein(new Error(m.text)); }
        else if (m.relay === "partner") this.emit("partner", m.da);
        else if (m.relay === "daten") this.emit("nachricht", m.d);
      };
    });
  }
  erstellen() { return this.verbinden({ relay: "erstellen" }); }
  beitreten(code) { return this.verbinden({ relay: "beitreten", code }); }
  senden(obj) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ relay: "daten", d: obj })); }
  trennen() { this.ws?.close(); }
}

export class SteamNetz extends Basis {
  constructor(api) {
    super();
    this.api = api; this.partner = null; this.ich = null;
    this.ab = [
      api.onPaket(({ von, daten }) => {
        if (this.host && !this.partner) { this.partner = von; this.emit("partner", true); }
        if (von !== this.partner) return;
        try { this.emit("nachricht", JSON.parse(daten)); } catch {}
      }),
      api.onMitglieder((liste) => {
        if (!this.host) { if (!liste.includes(this.partner)) this.emit("partner", false); return; }
        const anderer = liste.find((id) => id !== this.ich);
        if (anderer && anderer !== this.partner) { this.partner = anderer; this.emit("partner", true); }
        if (!anderer && this.partner) { this.partner = null; this.emit("partner", false); }
      }),
    ];
  }
  async erstellen() {
    this.ich = (await this.api.info()).id;
    const r = await this.api.lobbyErstellen();
    this.host = true; this.lobby = r.lobby;
    return r.lobby;
  }
  einladen() { return this.api.einladen(); }
  async beitreten(lobbyId) {
    this.ich = (await this.api.info()).id;
    const r = await this.api.beitreten(lobbyId);
    this.host = false; this.lobby = r.lobby; this.partner = r.besitzer;
    this.senden({ t: "hallo" });
    this.emit("partner", true);
    return r.lobby;
  }
  senden(obj, zuverlaessig = true) { if (this.partner) this.api.senden(this.partner, JSON.stringify(obj), zuverlaessig); }
  trennen() { this.ab.forEach((f) => f()); this.api.verlassen(); }
}
