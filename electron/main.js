// Electron-Hauptprozess: Fenster, eigenes app://-Protokoll und Steam (Lobby, P2P, Errungenschaften).
// Ohne laufenden Steam-Client startet das Spiel trotzdem; dann gibt es nur Koop per Raumcode.
const { app, BrowserWindow, ipcMain, protocol, net, Menu } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

// Steam-App-ID. 480 ist Valves Test-App „Spacewar“ und funktioniert für jeden zum Entwickeln.
// Nach dem Kauf eines Steam-Direct-Slots hier die eigene ID eintragen (und in steam_appid.txt).
const STEAM_APP_ID = Number(process.env.UHRWERK_APP_ID || 480);
const SRC = path.join(__dirname, "..", "src");

let steam = null, client = null, fenster = null, lobby = null;
try {
  steam = require("steamworks.js");
  client = steam.init(STEAM_APP_ID);
  steam.electronEnableSteamOverlay();
} catch (e) {
  client = null;
  console.log("Steam nicht verfügbar:", e.message);
}

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

function erstelleFenster() {
  fenster = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 600,
    backgroundColor: "#0d0b09", title: "Uhrwerk", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  fenster.once("ready-to-show", () => fenster.show());
  // Selbsttest für CI: Seite laden, Bild speichern, beenden
  if (process.env.UHRWERK_SELBSTTEST) {
    fenster.webContents.once("did-finish-load", () => setTimeout(async () => {
      const titel = await fenster.webContents.executeJavaScript("document.querySelector('.titel')?.textContent || 'FEHLT'");
      require("fs").writeFileSync(process.env.UHRWERK_SELBSTTEST, (await fenster.webContents.capturePage()).toPNG());
      console.log("Selbsttest:", titel, "| Steam:", client ? "verbunden" : "nicht verfügbar");
      app.quit();
    }, 2500));
  }
  fenster.loadURL("app://spiel/index.html");
  if (process.argv.includes("--debug")) fenster.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(() => {
  protocol.handle("app", (req) => {
    const pfad = decodeURIComponent(new URL(req.url).pathname);
    const datei = path.normalize(path.join(SRC, pfad));
    if (!datei.startsWith(SRC)) return new Response("verboten", { status: 403 });
    return net.fetch(pathToFileURL(datei).toString());
  });
  erstelleFenster();
  if (client) starteSteam();
});
app.on("window-all-closed", () => app.quit());

const senden = (kanal, daten) => fenster && !fenster.isDestroyed() && fenster.webContents.send(kanal, daten);
const mitglieder = () => (lobby ? lobby.getMembers().map((m) => m.steamId64.toString()) : []);

function starteSteam() {
  const { SteamCallback } = steam;
  // Einladung angenommen, während das Spiel läuft
  client.callback.register(SteamCallback.GameLobbyJoinRequested, (e) => senden("steam:einladung", { lobby: e.lobby_steam_id.toString() }));
  // Jemand betritt oder verlässt die Lobby
  client.callback.register(SteamCallback.LobbyChatUpdate, () => senden("steam:mitglieder", mitglieder()));
  // Verbindungsanfrage vom Partner annehmen
  client.callback.register(SteamCallback.P2PSessionRequest, (e) => {
    const id = e.remote.toString();
    if (mitglieder().includes(id)) client.networking.acceptP2PSession(e.remote);
  });
  // Pakete abholen und an das Spiel weitergeben
  setInterval(() => {
    let n;
    while ((n = client.networking.isP2PPacketAvailable()) > 0) {
      const p = client.networking.readP2PPacket(n);
      senden("steam:paket", { von: p.steamId.steamId64.toString(), daten: p.data.toString("utf8") });
    }
  }, 8);
  // Start über eine Einladung, als das Spiel noch nicht lief: Steam übergibt +connect_lobby <id>
  const i = process.argv.indexOf("+connect_lobby");
  if (i >= 0 && process.argv[i + 1]) setTimeout(() => senden("steam:einladung", { lobby: process.argv[i + 1] }), 1500);
}

ipcMain.handle("steam:info", () => client
  ? { verfuegbar: true, name: client.localplayer.getName(), id: client.localplayer.getSteamId().steamId64.toString(), appId: STEAM_APP_ID }
  : { verfuegbar: false });

ipcMain.handle("steam:lobbyErstellen", async () => {
  if (lobby) lobby.leave();
  lobby = await client.matchmaking.createLobby(1 /* FriendsOnly */, 2);
  lobby.setData("spiel", "uhrwerk");
  return { lobby: lobby.id.toString(), mitglieder: mitglieder() };
});

ipcMain.handle("steam:einladen", () => { if (lobby) client.overlay.activateInviteDialog(lobby.id); });

ipcMain.handle("steam:beitreten", async (_e, id) => {
  if (lobby) lobby.leave();
  lobby = await client.matchmaking.joinLobby(BigInt(id));
  return { lobby: lobby.id.toString(), besitzer: lobby.getOwner().steamId64.toString(), mitglieder: mitglieder() };
});

ipcMain.handle("steam:verlassen", () => { if (lobby) lobby.leave(); lobby = null; });

ipcMain.on("steam:senden", (_e, { an, daten, zuverlaessig }) => {
  if (!client) return;
  client.networking.sendP2PPacket(BigInt(an), zuverlaessig ? 2 : 1, Buffer.from(daten, "utf8"));
});

ipcMain.handle("steam:erfolg", (_e, name) => client ? client.achievement.activate(name) : false);
ipcMain.handle("steam:status", (_e, text) => { if (client) client.localplayer.setRichPresence("steam_display", text ? "#Status" : null); });
ipcMain.handle("app:beenden", () => app.quit());
