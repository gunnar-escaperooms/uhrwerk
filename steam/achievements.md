# Errungenschaften (in Steamworks unter „Statistiken & Errungenschaften“ anlegen)

| API-Name             | Anzeigename        | Beschreibung                                           |
|----------------------|--------------------|--------------------------------------------------------|
| UHRWERK_GESCHAFFT    | Prosit 1900!       | Bringt die Turmuhr rechtzeitig zum Schlagen.           |
| UHRWERK_FEHLERFREI   | Uhrmacherpräzision | Schafft es ohne einen einzigen Fehler.                 |
| UHRWERK_SCHNELL      | Vor der Zeit       | Schafft es in weniger als 10 Minuten.                  |

Die Namen müssen exakt so heißen; das Spiel schaltet sie über steamworks.js frei
(`src/logik.js` erzeugt die Ereignisse, `electron/main.js` meldet sie an Steam).
