// Sichere Brücke zwischen Spiel (Renderer) und Hauptprozess.
const { contextBridge, ipcRenderer } = require("electron");

const hoerer = (kanal) => (cb) => {
  const f = (_e, d) => cb(d);
  ipcRenderer.on(kanal, f);
  return () => ipcRenderer.removeListener(kanal, f);
};

contextBridge.exposeInMainWorld("uhrwerkDesktop", {
  desktop: true,
  beenden: () => ipcRenderer.invoke("app:beenden"),
  steam: {
    info: () => ipcRenderer.invoke("steam:info"),
    lobbyErstellen: () => ipcRenderer.invoke("steam:lobbyErstellen"),
    einladen: () => ipcRenderer.invoke("steam:einladen"),
    beitreten: (id) => ipcRenderer.invoke("steam:beitreten", id),
    verlassen: () => ipcRenderer.invoke("steam:verlassen"),
    senden: (an, daten, zuverlaessig = true) => ipcRenderer.send("steam:senden", { an, daten, zuverlaessig }),
    erfolg: (name) => ipcRenderer.invoke("steam:erfolg", name),
    onPaket: hoerer("steam:paket"),
    onMitglieder: hoerer("steam:mitglieder"),
    onEinladung: hoerer("steam:einladung"),
  },
});
