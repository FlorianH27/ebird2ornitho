// ----------------- Hilfsfunktion: Datum prüfen (älter als 2 Wochen?) -----------------
function isOlderThanTwoWeeks() {
    const hiddenDateInput = document.querySelector('input[type="hidden"][name*="[date_obs]"]');
    if (!hiddenDateInput) return false;

    const parts = hiddenDateInput.value.split(".");
    if (parts.length !== 3) return false;

    const observationDate = new Date(parts[2], parts[1] - 1, parts[0]);
    if (isNaN(observationDate.getTime())) return false;

    const diffDays = (new Date() - observationDate) / (1000 * 60 * 60 * 24);
    return diffDays > 14;
}

// ----------------- Konfiguration -----------------
const hardBlockDomains = [
    "ornitho.it",
    "ornitho.ch"
];

const isHardBlockDomain = hardBlockDomains.some(domain => window.location.hostname.includes(domain));

let lastMissingCount = 0;
let hasWarned = false;

// ----------------- Prüfen auf fehlende Atlascodes -----------------
function checkAtlasCodes() {
    if (isOlderThanTwoWeeks()) {
        return 0;
    }

    const missing = [];

    document.querySelectorAll("div.box_yellow").forEach(yellowBox => {
        const parent = yellowBox.parentElement;
        if (!parent) return;

        const atlasTexts = [
            "erforderlich",
            "mandatory",
            "nécessaire",
            "necessario",
            "brutzeitcode :"
        ];

        const atlasWarnings = Array.from(parent.querySelectorAll("b"))
            .filter(b => {
                const text = b.textContent.toLowerCase().trim();
                return atlasTexts.some(t => text.includes(t));
            });

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
                return noneTexts.some(t => text.includes(t));
            });

            if (anyNone) missing.push(parent);
        }
    });

    return missing.length;
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
        if (!btn || btn.dataset.inserted) return;
        btn.dataset.inserted = "true";

        const originalAttr = btn.getAttribute("onclick");

        btn.addEventListener("click", function(e) {
            const missingCount = checkAtlasCodes();

            if (missingCount > 0) {
                if (missingCount !== lastMissingCount) {
                    hasWarned = false;
                }
                lastMissingCount = missingCount;

                if (!isHardBlockDomain && hasWarned) {
                    hideAtlasWarning();
                    hasWarned = false;

                    if (originalAttr) {
                        new Function(originalAttr).call(btn);
                    }
                    return;
                }

                e.preventDefault();
                showAtlasWarning();

                if (!isHardBlockDomain) {
                    hasWarned = true;
                }
            } else {
                hideAtlasWarning();
                hasWarned = false;
                lastMissingCount = 0;

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