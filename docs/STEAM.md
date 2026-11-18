# Uhrwerk auf Steam veröffentlichen

Diese Checkliste führt vom aktuellen Stand bis in den Steam-Shop. Alles, was ein Konto,
Geld oder eine rechtliche Erklärung braucht, kannst nur du erledigen.

## 1. Steamworks-Konto und App-ID (du)

1. Unter <https://partner.steamgames.com> ein Steamworks-Konto anlegen.
2. Steuer- und Bankdaten hinterlegen, Identität bestätigen (dauert einige Tage).
3. Steam-Direct-Gebühr bezahlen (100 US-$ pro Spiel). Danach gibt es eine **App-ID**.
4. App-ID eintragen:
   - `electron/main.js` → `STEAM_APP_ID` (oder Umgebungsvariable `UHRWERK_APP_ID`)
   - `steam_appid.txt` (nur für lokale Tests, nicht ausliefern)
   - `steam/app_build.vdf` und `steam/depot_*.vdf` (App- und Depot-IDs aus Steamworks)

Bis dahin läuft alles mit **App-ID 480 (Spacewar)**, Valves Test-App: Lobbys, Einladungen und
P2P funktionieren damit, sobald der Steam-Client läuft.

## 2. In Steamworks einrichten (du)

- **Errungenschaften**: siehe `steam/achievements.md`.
- **Rich Presence / Multiplayer**: Kategorie „Online-Koop“ und „Steam-Freundeseinladungen“ setzen.
- **Launch-Optionen**: Windows → `Uhrwerk.exe`, Linux → `uhrwerk`.
- **Steam Deck**: Steuerung prüfen (Maus/Tastatur-Vorlage „Ego-Shooter“ passt als Ausgangspunkt).

## 3. Build erstellen und hochladen

```sh
npm install
npm test               # Spiellogik + Ende-zu-Ende-Test mit zwei Spielern
npm install --save-dev electron-builder
npm run dist           # erzeugt release/win-unpacked und release/linux-unpacked
./steam/hochladen.sh   # lädt per steamcmd hoch
```

Für macOS: `npm run dist:mac` auf einem Mac (Signierung/Notarisierung mit Apple-Entwicklerkonto).

## 4. Shopseite (du, mit Hilfe)

Pflicht-Grafiken (Pixel):

| Asset                    | Größe        |
|--------------------------|--------------|
| Header Capsule           | 920 × 430    |
| Small Capsule            | 462 × 174    |
| Main Capsule             | 1232 × 706   |
| Vertical Capsule         | 748 × 896    |
| Library Capsule          | 600 × 900    |
| Library Hero             | 3840 × 1240  |
| Library Logo             | 1280 × 720 (transparent) |
| Screenshots              | mind. 5 × 1920 × 1080 |
| Trailer                  | empfohlen    |

Texte: Kurzbeschreibung (max. 300 Zeichen), ausführliche Beschreibung, Systemanforderungen,
Sprachen (Deutsch; für Reichweite Englisch nachrüsten), USK-/IARC-Fragebogen.

## 5. Vor dem Release

- „Coming Soon“-Seite mindestens 2 Wochen vorher veröffentlichen (Wunschlisten sammeln).
- Valve prüft Shopseite und Build (einige Werktage).
- Mit Freunden über **Steam Playtest** oder Beta-Keys testen.

## Was technisch schon fertig ist

- Desktop-App mit Electron, Steam-Overlay aktiviert
- Steam-Lobby (nur Freunde, 2 Plätze), Einladen über die Freundesliste,
  Beitritt per Einladung (auch wenn das Spiel noch nicht läuft: `+connect_lobby`)
- P2P-Verbindung über Steam (Host-autoritativ, kein eigener Server nötig)
- Errungenschaften über steamworks.js
- Ohne Steam: Koop per Raumcode über den mitgelieferten Relay-Server

## Was noch fehlt, bevor es sich „fertig“ anfühlt

- Englische Übersetzung
- Gamepad-Steuerung (Steam Deck ohne Maus)
- Mehr Inhalt: aktuell ein Level mit vier Rätseln (ca. 15–25 Minuten)
- Musik und professionelle Soundeffekte (derzeit synthetisch)
- Eigene Shop-Grafiken und Trailer
