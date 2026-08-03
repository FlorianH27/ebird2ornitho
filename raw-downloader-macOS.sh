#!/bin/zsh

# 1. Start-Dialog anzeigen (native Mac-GUI)
CHOICE=$(osascript -e '
try
    display dialog "Sollen die neuesten Dateien von GitHub heruntergeladen und dieser Ordner ueberschrieben werden?" buttons {"Abbrechen", "Jetzt Aktualisieren"} default button "Jetzt Aktualisieren" with title "ebird2ornitho Auto-Updater"
    return button returned of result
on error
    return "Abbrechen"
end try
')

# Beenden, wenn der User abbricht
if [ "$CHOICE" != "Jetzt Aktualisieren" ]; then
    exit 0
fi

# In den aktuellen Ordner wechseln
cd "$(dirname "$0")"

REPO_URL="https://github.com/FlorianH27/ebird2ornitho/archive/refs/heads/main.zip"
ZIP_FILE="latest.zip"
TEMP_DIR="temp_update"

# 2. Download & Entpacken
curl -sL "$REPO_URL" -o "$ZIP_FILE"

if [ -f "$ZIP_FILE" ]; then
    unzip -q -o "$ZIP_FILE" -d "$TEMP_DIR"

    # Unterordner aus ZIP ermitteln
    SUBFOLDER=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

    if [ -n "$SUBFOLDER" ]; then
        # Dateien kopieren/ueberschreiben
        cp -R "$SUBFOLDER/"* .
    fi

    # Aufraeumen
    rm -rf "$TEMP_DIR" "$ZIP_FILE"

    # 3. Erfolgsmeldung anzeigen
    osascript -e '
    display dialog "Update erfolgreich!\n\nLetzter Schritt im Browser:\n1. Gehe zum Browser\n2. Erweiterungen verwalten aufrufen\n3. Bei ebird2ornitho auf Neu laden klicken" buttons {"Schliessen"} default button "Schliessen" with title "ebird2ornitho Auto-Updater"
    '
else
    # Fehlermeldung
    osascript -e '
    display alert "Fehler beim Update!" message "Bitte Internetverbindung pruefen." as critical
    '
fi

