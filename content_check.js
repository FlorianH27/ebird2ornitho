// ----------------- Konfiguration -----------------
// Liste der Domains, bei denen die Blockade STRIKT sein muss (kein Speichern ohne Brutzeitcode)
const hardBlockDomains = [
    "ornitho.it", // Beispiele für Länder, die den CH-Atlascode 1 oder analog kennen
    "ornitho.ch"
];

// Automatische Prüfung: Wenn in der Liste -> Hardblock. Wenn NICHT in der Liste -> Standard (Softblock).
const isHardBlockDomain = hardBlockDomains.some(domain => window.location.hostname.includes(domain));

// Interner Speicher für den Zustand
let lastMissingCount = 0;
let hasWarned = false;

// ----------------- Prüfen auf fehlende Atlascodes -----------------
function checkAtlasCodes() {
    const missing = [];

    // Alle gelben Arten durchgehen
    document.querySelectorAll("div.box_yellow").forEach(yellowBox => {
        const parent = yellowBox.parentElement; // eine Ebene höher, enthält alle Infos der Art
        if (!parent) return;

        // Mögliche Warntexte für Atlascode
        const atlasTexts = [
            "erforderlich",
            "mandatory",
            "nécessaire",
            "necessario",
            "brutzeitcode :"
        ];

        // Alle <b>-Elemente innerhalb der Art, die einen dieser Texte enthalten
        const atlasWarnings = Array.from(parent.querySelectorAll("b"))
            .filter(b => {
                const text = b.textContent.toLowerCase().trim();
                return atlasTexts.some(t => text.includes(t));
            });

        // Wenn mindestens ein Atlascode-Warntext vorhanden ist
        if (atlasWarnings.length > 0) {
            const noneTexts = [
                "kein",
                "none",
                "aucun",
                "nessuno"
            ];

            const labels = Array.from(parent.querySelectorAll(".bx--list-box__label"));

            const anyNone = labels.some(lbl => {
                const text = lbl.textContent.toLowerCase().trim();
                return noneTexts.some(t => text.includes(t)); // includes statt ===
            });

            if (anyNone) missing.push(parent);
        }
    });

    return missing.length; // Anzahl der gelben Arten, die noch Atlascode brauchen
}


// ----------------- Warnung erstellen -----------------
function showAtlasWarning() {
    let warning = document.getElementById("atlasWarning");
    if (!warning) {
        warning = document.createElement("div");
        warning.id = "atlasWarning";
        warning.style.color = "#ff0000";
        warning.style.padding = "10px";
        warning.style.textAlign = "center";
        warning.style.fontWeight = "bold";
        const container = document.getElementById("submit-full")?.parentNode || document.body;
        container.insertBefore(warning, container.firstChild);
    }
    
    // Text passt sich dynamisch an (Standard ist jetzt der Softblock-Hinweis)
    if (isHardBlockDomain) {
        warning.textContent = "Bitte alle erforderlichen Atlas-/Brutzeitcodes ausfüllen!";
    } else {
        warning.textContent = "Wurden alle erforderlichen Brutzeitcodes ausgefüllt? Nochmaliges Speichern ignoriert diese Warnung";
    }
}

function hideAtlasWarning() {
    const warning = document.getElementById("atlasWarning");
    if (warning) warning.remove();
}

// ----------------- Listener auf Save Buttons -----------------
function insertSaveButtonCheck() {
    const buttons = [document.getElementById("submit-full"), document.getElementById("submit-partial")];

    buttons.forEach(btn => {
        if (!btn || btn.dataset.inserted) return; // nur einmal einfügen
        btn.dataset.inserted = "true";

        // Original onclick aus Attribut merken
        const originalAttr = btn.getAttribute("onclick");

        btn.addEventListener("click", function(e) {
            const missingCount = checkAtlasCodes();
            
            if (missingCount > 0) {
                // Sicherheitsnetz: Wenn sich die Anzahl der Fehler verändert hat, 
                // muss der Nutzer zwingend wieder erst einmal gewarnt werden.
                if (missingCount !== lastMissingCount) {
                    hasWarned = false;
                }
                lastMissingCount = missingCount;

                // Wenn es KEINE Hardblock-Domain ist und bereits einmal gewarnt wurde -> Speichern erlauben
                if (!isHardBlockDomain && hasWarned) {
                    hideAtlasWarning();
                    hasWarned = false; // Reset für das nächste Mal
                    
                    if (originalAttr) {
                        new Function(originalAttr).call(btn);
                    }
                    return; 
                }

                // Erster Klick (oder eben dauerhafte Blockade auf Hardblock-Plattformen)
                e.preventDefault();
                showAtlasWarning();
                
                if (!isHardBlockDomain) {
                    hasWarned = true; // Merken, dass gewarnt wurde
                }
            } else {
                hideAtlasWarning();
                hasWarned = false;
                lastMissingCount = 0;

                // Original onclick ausführen
                if (originalAttr) {
                    new Function(originalAttr).call(btn);
                }
            }
        });
    });
}

// ----------------- MutationObserver für dynamisches Laden -----------------
const observer = new MutationObserver(() => {
    if (document.getElementById("submit-full")) {
        insertSaveButtonCheck();
        observer.disconnect();
    }
});
observer.observe(document.body, { childList: true, subtree: true });
