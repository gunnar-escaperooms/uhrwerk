# Uhrwerk – so spielt ihr

Ein 3D-Koop-Escape für zwei. Jeder braucht diesen Ordner auf seinem PC.

**Starten:** Windows: `Uhrwerk.exe` · Linux: `uhrwerk`

(Windows zeigt beim ersten Start evtl. „Der Computer wurde durch Windows geschützt“, weil die
Datei nicht signiert ist: „Weitere Informationen“ → „Trotzdem ausführen“.)

## Weg 1: Über Steam (empfohlen)

1. Beide haben Steam gestartet und sind in Steam befreundet.
2. Beide starten Uhrwerk.
3. Einer klickt **„Mit Steam-Freund spielen“** und lädt den anderen über das Steam-Overlay ein.
4. Der andere nimmt die Einladung an.

In Steam erscheint ihr als „spielt Spacewar“. Das ist Valves Test-App, die wir nutzen,
bis das Spiel eine eigene Steam-ID hat.

## Weg 2: Per Raumcode (ohne Steam)

Einer von euch startet den Relay-Server aus dem Ordner `relay` (braucht [Node.js](https://nodejs.org)):

```
node relay/relay.js
```

- **Im selben WLAN:** Der andere trägt in Uhrwerk unter *Einstellungen → Relay-Server*
  `ws://<IP-des-Hosts>:8787/relay` ein. (Der Host selbst lässt `ws://localhost:8787/relay` stehen.)
- **Übers Internet:** Port 8787 am Router freigeben oder den Relay auf einem Server betreiben.

Dann: einer **„Raum erstellen“**, der andere **„Raum beitreten“** mit dem vierstelligen Code.

## Steuerung

WASD laufen · Maus umsehen · E benutzen · Q Stelle markieren · Esc Pause

Redet miteinander (Discord, Steam-Sprachchat, Telefon). Zeigt euch die Bildschirme nicht!
