#!/usr/bin/env bash
# Lädt den Build zu Steam hoch. Voraussetzungen:
#   - steamcmd installiert (https://developer.valvesoftware.com/wiki/SteamCMD)
#   - IDs in app_build.vdf und depot_*.vdf eingetragen
#   - npm run dist ausgeführt (erzeugt release/win-unpacked und release/linux-unpacked)
set -euo pipefail
cd "$(dirname "$0")"
read -rp "Steam-Benutzername (Steamworks-Konto): " BENUTZER
steamcmd +login "$BENUTZER" +run_app_build "$(pwd)/app_build.vdf" +quit
echo "Fertig. Den Build in Steamworks unter „Builds“ auf einen Branch setzen (z. B. „default“ oder einen Test-Branch)."
