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

// initial beim Laden
updateMap();

// bei jedem Klick im Dokument
document.addEventListener("click", () => {
    updateMap();
});