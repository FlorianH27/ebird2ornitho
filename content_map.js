function insertOrUpdateCustomButton() {
    const container = document.querySelector('div > a.alink[href^="javascript:center_city()"]')?.parentElement;
    if (!container) {
        console.warn("Container für Buttons nicht gefunden");
        return;
    }

    // Prüfen, ob Button schon existiert
    let newBtn = container.querySelector('a[data-custom="true"]');
    chrome.storage.local.get("ebirdData", ({ ebirdData }) => {
        if (!newBtn) {
            newBtn = document.createElement("a");
            newBtn.className = "alink";
            newBtn.style.marginLeft = "0.5rem";
            newBtn.style.fontWeight = "bold";
            newBtn.setAttribute("data-custom", "true"); // Kennzeichnung
            container.insertBefore(newBtn, container.firstChild);
            console.log("Eigener Button automatisch hinzugefügt");
        }

        // Text und Sichtbarkeit setzen
        if (ebirdData?.location && ebirdData.location.trim()) {
            newBtn.textContent = `[auf ${ebirdData.location} zoomen]`;
        } else {
            newBtn.textContent = "";
        }

        if (ebirdData?.coordinates) {
            const { lat, lon } = ebirdData.coordinates;
            newBtn.href = `javascript:openlayerMap.setCenter(${lat-0.007},${lon},-1,false)`;
            newBtn.style.display = "inline-block";
        } else {
            newBtn.style.display = "none";
        }
    });
}

// Beim Laden der Seite ausführen
insertOrUpdateCustomButton();

// Listener auf Änderungen im Local Storage
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.ebirdData) {
        insertOrUpdateCustomButton();
    }
});
