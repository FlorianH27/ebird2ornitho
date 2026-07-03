function insertOrUpdateCustomButton() {


    const container = document.querySelector('div > a.alink[href^="javascript:center_city()"]')?.parentElement;
    if (!container) {
        console.warn("Container für Buttons nicht gefunden");
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
            btnZoom1.setAttribute("data-custom", "true"); // Kennzeichnung
            container.insertBefore(btnZoom1, container.firstChild);
        }

        // --- Zweiter Button (Zoom -3) ---
        let btnZoom3 = container.querySelector('a[data-custom="zoom3"]');
        if (!btnZoom3) {
            btnZoom3 = document.createElement("a");
            btnZoom3.className = "alink";
            btnZoom3.style.marginLeft = "0.5rem";
            btnZoom3.style.fontWeight = "bold";
            btnZoom3.setAttribute("data-custom", "zoom3"); // Kennzeichnung
            container.insertBefore(btnZoom3, btnZoom1.nextSibling); // direkt nach dem ersten Button
        }

        // Text setzen
        btnZoom1.textContent = ebirdData?.location && ebirdData.location.trim() ? `[auf Umgebung von ${ebirdData.location} zoomen]` : "";
        btnZoom3.textContent = ebirdData?.location && ebirdData.location.trim() ? `[auf Koordinaten von ${ebirdData.location} zoomen]` : "";

        // Sichtbarkeit und href setzen
        if (ebirdData?.coordinates) {
            const { lat, lon } = ebirdData.coordinates;
            btnZoom1.href = `javascript:openlayerMap.setCenter(${lat-0.002},${lon},-1,false)`;
            btnZoom3.href = `javascript:openlayerMap.setCenter(${lat},${lon},0.5,false)`;
            btnZoom1.style.display = "inline-block";
            btnZoom3.style.display = "inline-block";
        } else {
            btnZoom1.style.display = "none";
            btnZoom3.style.display = "none";
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



