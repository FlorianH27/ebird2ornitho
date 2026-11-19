function insertOrUpdateCustomButton() {
    const container = document.querySelector('div > a.alink[href^="javascript:center_city()"]')?.parentElement;

    if (!container) {
        // Container noch nicht da, später erneut versuchen
        return;
    }

    chrome.storage.local.get("ebirdData", ({ ebirdData }) => {
        // --- Erster Button (Zoom -1) ---
        let btnZoom1 = container.querySelector('a[data-custom="true"]');
        if (!btnZoom1) {
            btnZoom1 = document.createElement("a");
            btnZoom1.className = "alink";
            btnZoom1.style.marginLeft = "0.5rem";
            btnZoom1.style.fontWeight = "bold";
            btnZoom1.setAttribute("data-custom", "true");
            container.insertBefore(btnZoom1, container.firstChild);
        }

        // --- Zweiter Button (Zoom -3 bzw. 0.5) ---
        let btnZoom3 = container.querySelector('a[data-custom="zoom3"]');
        if (!btnZoom3) {
            btnZoom3 = document.createElement("a");
            btnZoom3.className = "alink";
            btnZoom3.style.marginLeft = "0.5rem";
            btnZoom3.style.fontWeight = "bold";
            btnZoom3.setAttribute("data-custom", "zoom3");
            container.insertBefore(btnZoom3, btnZoom1.nextSibling);
        }

        // Text und Sichtbarkeit aktualisieren
        if (ebirdData?.location && ebirdData.location.trim()) {
            btnZoom1.textContent = `[auf Umgebung von ${ebirdData.location} zoomen]`;
            btnZoom3.textContent = `[auf Koordinaten von ${ebirdData.location} zoomen]`;
        } else {
            btnZoom1.textContent = "";
            btnZoom3.textContent = "";
        }

        if (ebirdData?.coordinates) {
            const { lat, lon } = ebirdData.coordinates;
            btnZoom1.href = `javascript:openlayerMap.setCenter(${lat},${lon},-1,false)`;
            btnZoom3.href = `javascript:openlayerMap.setCenter(${lat},${lon},0.5,false)`;
            btnZoom1.style.display = "inline-block";
            btnZoom3.style.display = "inline-block";
        } else {
            btnZoom1.style.display = "none";
            btnZoom3.style.display = "none";
        }
    });
}

// 1. Initialer Aufruf beim Laden
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertOrUpdateCustomButton);
} else {
    insertOrUpdateCustomButton();
}

// 2. Beobachten, ob sich das DOM ändert (falls Elemente nachgeladen werden)
const observer = new MutationObserver((mutations, obs) => {
    const container = document.querySelector('div > a.alink[href^="javascript:center_city()"]')?.parentElement;
    if (container) {
        insertOrUpdateCustomButton();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 3. Listener auf Änderungen im Local Storage
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.ebirdData) {
        insertOrUpdateCustomButton();
    }
});