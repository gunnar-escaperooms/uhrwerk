# Uhrwerk

Ein **3D-Koop-Escape für zwei Spieler am PC**. Silvester 1899, Rathausturm von Lindenau:
Die Uhrmacherin Margarete Voss hat einen „Jahrhundertmechanismus“ gebaut. Schlägt die Uhr um
Mitternacht nicht, versiegelt er den Turm, und ihr sitzt darin fest.

- **Räderwerk:** hinter dem leuchtenden Zifferblatt. Zahnräder, Achsen, Zeigerwerk, Melodiescheibe.
- **Glockenstube:** darüber, unter freiem Himmel. Fünf Glocken, Getriebeplan, Turmbuch.

Durch eine Gitterluke seht ihr euch. Jeder hat Informationen, die der andere braucht. Eines der
Rätsel könnt ihr nur gemeinsam im selben Augenblick lösen.

## Spielen

| Weg | Wie |
|---|---|
| **Steam** (Desktop-App) | „Mit Steam-Freund spielen“ → Freund über die Steam-Freundesliste einladen |
| **Raumcode** (Desktop oder Browser) | Einer erstellt einen Raum, der andere gibt den vierstelligen Code ein |

Steuerung: <kbd>WASD</kbd> laufen, Maus umsehen, <kbd>E</kbd> benutzen, <kbd>Q</kbd> eine Stelle für den
Partner markieren, <kbd>Esc</kbd> Pause. Redet über Steam-Sprachchat, Discord oder Telefon.

## Entwickeln

```sh
npm install          # installiert Electron, Three.js, steamworks.js
npm start            # Desktop-App (mit Steam, falls der Client läuft)
npm run relay        # Relay-Server + Browser-Version unter http://localhost:8787/
npx playwright install chromium   # einmalig, für den Ende-zu-Ende-Test
npm test             # Logik-Tests + Ende-zu-Ende-Test (zwei Browser spielen das Spiel durch)
```

Für Raumcodes in der Desktop-App muss ein Relay-Server erreichbar sein (Adresse in den
Einstellungen). Für Spiele über das Internet den Relay auf einem kleinen Server betreiben,
oder über Steam spielen, dann ist kein eigener Server nötig.

## Aufbau

```
electron/main.js     Desktop-Hauptprozess: Fenster, app://-Protokoll, Steam (Lobby, P2P, Errungenschaften)
electron/preload.js  sichere Brücke zum Spiel
server/relay.js      Relay-Server für Raumcodes + Auslieferung der Browser-Version
src/logik.js         Spiellogik (Host-autoritativ, ohne Abhängigkeiten, getestet)
src/netz.js          RelayNetz und SteamNetz mit gleicher Schnittstelle
src/welt.js          3D-Welt mit Three.js (alles prozedural, keine Asset-Dateien)
src/main.js          Menüs, Lobby, Spielschleife, Bedienung, Dokumente
src/ton.js           synthetische Klänge (Glocken mit Teiltönen, Uhrwerk, Feuerwerk)
steam/               Upload-Skripte (steamcmd) und Errungenschaften
docs/STEAM.md        Checkliste bis zur Veröffentlichung
```

**Spoiler:** Die Lösung steht in `test/logik.test.js`.
