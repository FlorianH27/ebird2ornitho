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
    warning.textContent = "Bitte alle erforderlichen Atlas-/Brutzeitcodes ausfüllen!";
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
                e.preventDefault();
                showAtlasWarning();
            } else {
                hideAtlasWarning();

                // Original onclick ausführen
                if (originalAttr) {
                    // eval in Kontext des Buttons
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
