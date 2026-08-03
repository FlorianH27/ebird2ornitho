function updateMap() {
    const mapDiv = document.getElementById("map_ol");
    if (mapDiv) {
        mapDiv.style.height = "599px";
    }

    const map = window.openlayerMap?.getMap?.();
    if (map?.updateSize) {
        map.updateSize();
    }
}

// Initial beim Laden
updateMap();

// Bei jedem Klick im Dokument
document.addEventListener("click", () => {
    updateMap();
});

// --- Einmaliger Zoom via #zoom in der URL (mit Verzögerung für externe Karten wie AT) ---
function checkUrlZoom() {
    const hash = window.location.hash;
    if (!hash.startsWith("#zoom=")) return;

    const coords = hash.replace("#zoom=", "").split(",");
    const lat = parseFloat(coords[0]);
    const lon = parseFloat(coords[1]);

    if (!isNaN(lat) && !isNaN(lon)) {
        // Hash aus der URL entfernen
        history.replaceState(null, "", window.location.pathname + window.location.search);

        // Zoom-Funktion definieren
        const applyZoom = () => {
            if (window.openlayerMap?.setCenter) {
                window.openlayerMap.setCenter(lat - 0.002, lon, -1, false);
                window.scrollTo({ top: 360 });
            }
        };

        // 1. Sofort versuchen (für CH/DE)
        applyZoom();

        // 2. Verzögert erneut versuchen (fängt trägere Portale wie AT ab, falls sie auf Wien zurücksetzen)
        setTimeout(applyZoom, 600);
        setTimeout(applyZoom, 1500);
    }
}

// Initial prüfen, sobald das DOM bereit ist
if (document.readyState === "complete" || document.readyState === "interactive") {
    checkUrlZoom();
} else {
    document.addEventListener("DOMContentLoaded", checkUrlZoom);
}


