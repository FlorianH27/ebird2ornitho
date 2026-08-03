# ebird2ornitho

## Installation 
(Auf Microsoft Edge, Google Chrome und Ecosia erfolgreich getestet, funktioniert NICHT auf Firefox oder Safari)

1. Source code (zip) herunterladen (https://github.com/FlorianH27/ebird2ornitho/releases)
2. zip-Ordner extrahieren und in einem beliebigen Ordner abspeichern
3. Browser → Erweiterungen → Erweiterungen verwalten → Entwicklermodus aktivieren → Entpackte Dateien laden → Ordner auswählen → fertig
4. Optional: Kann im Browser für schnelleren Zugriff an Symbolleiste gepinnt werden

## Update

### Empfohlen: Auto-Updater nutzen
1. **Lokalen Ordner der Erweiterung öffnen**  
   *(Falls der Speicherort unbekannt ist: Im Browser unter **Erweiterungen** → **Erweiterungen verwalten** bei ebird2ornitho auf **Details** klicken und den Dateipfad neben **Geladen aus** ablesen)*
2. **Auto-Updater starten**
   * **Windows:** Doppelklick auf `auto-updater-windows.hta`
   * **macOS:** Doppelklick auf `auto-updater-macOS.app`  
     *(Hinweis macOS: Falls die App fehlt, muss sie einmalig erstellt werden – siehe [Anleitung für macOS](#anleitung-auto-updater-app-für-macos-erstellen))*
3. **Erweiterung neu laden**  
   Browser → **Erweiterungen** → **Erweiterungen verwalten** → bei ebird2ornitho auf **Erneut laden** (Kreis-Symbol) klicken


### Alternative: Manuelles Update
Falls der Auto-Updater nicht ausgeführt werden kann, lässt sich das Update auch manuell durchführen:
1. Source code (zip) herunterladen (https://github.com/FlorianH27/ebird2ornitho/releases)
2. zip-Ordner extrahieren
3. Alle Dateien aus dem neu extrahierten Ordner kopieren
4. Speicherort der alten Erweiterungs-Dateien öffnen  
   *(Falls der Speicherort unbekannt ist: Im Browser unter **Erweiterungen** → **Erweiterungen verwalten** bei ebird2ornitho auf **Details** klicken und den Dateipfad neben **Geladen aus** ablesen)*
5. Alte Dateien durch die neuen Dateien ersetzen
6. Browser → Erweiterungen → Erweiterungen verwalten → bei ebird2ornitho auf **Erneut laden** (Kreis-Symbol) klicken

*Hinweis: Alle Daten (inkl. Location Library) bleiben bei beiden Update-Methoden erhalten. Optional kann die Location Library vor dem Update in den Einstellungen der Erweiterung kopiert und anschliessend wieder eingefügt werden.*

## Bedienungsanleitung

1. eBird Checkliste in eigenem Tab öffnen
2. ebird2ornitho Erweiterung öffnen
3. Im Sidepanel auf "Daten von eBird erfassen" klicken, um Daten auszulesen
4. Ornitho manuell bedienen bis Ort auf Karte ausgewählt werden muss  
   **ODER**  
   Karte direkt per Button aus dem Sidepanel heraus öffnen
5. Wie gewohnt Ort auswählen auf Ornitho
6. Falls Metadaten noch nicht eingefügt, im Sidepanel auf "Metadaten einfügen" klicken
7. Wie gewohnt speichern und warten bis das Listen-Template geladen wurde
8. Im Sidepanel auf "Arten in Ornitho einfügen" klicken
9. Wie gewohnt speichern → fertig!


## Anleitung Auto-Updater App für macOS erstellen

Da macOS das Ausführen unsignierter Updater aus Sicherheitsgründen einschränkt, muss der Auto-Updater für macOS einmalig selbst erstellt werden:

1. Auf dem Mac die App **Skript-Editor** (Script Editor) öffnen (zu finden über die Spotlight-Suche mit `Cmd + Leertaste`).
2. "Neues Dokument" anklicken
3. Den Inhalt der Datei <a href="https://github.com/FlorianH27/ebird2ornitho/blob/main/auto-update-raw-macOS.txt" target="_blank"><code>auto-update-raw-macOS.txt</code></a> in das neue leere Dokument einfügen.
4. Im Menü oben auf **Ablage** → **Exportieren...** klicken.
5. Folgende Einstellungen wählen:
   * **Exportieren als:** `auto-updater-macOS`
   * **Ort:** Eigenen ebird2ornitho-Ordner auswählen
   * **Dateiformat:** **App** (Program)
   * **Optionen:** Alle deaktivieren
   * **Codesignatur:** **Zum lokalen ausführen signieren**
6. Auf **Sichern** klicken. Die erstellte `auto-updater-macOS.app` kann ab sofort für den Download von Updates per Doppelklick genutzt werden.
7. Der Skript-Editor kann ohne weitere Dokumente zu speichern wieder geschlossen werden.
