(function() {
    function tryInsert() {
        const match = window.location.pathname.match(/\/checklist\/([A-Z]\d+)/);
        if (!match) return false;
        const currentChecklistId = match[1];

        const h1Element = document.querySelector('h1#content');
        if (!h1Element) return false;

        // Prüfen, ob das Badge bereits vorhanden ist
        if (h1Element.querySelector('#ebird2ornitho-imported-badge')) return true;

        // Synchroner Zugriff auf den Cache
        const cachedList = localStorage.getItem('ebird2ornitho_saved_cache');
        const savedList = cachedList ? JSON.parse(cachedList) : [];

        if (savedList.includes(currentChecklistId)) {
            const badge = document.createElement('span');
            badge.id = 'ebird2ornitho-imported-badge';
            badge.style.cssText = `
                color: #137333 !important;
                background-color: #e6f4ea !important;
                border: 1px solid #ceead6 !important;
                padding: 0.15rem 0.5rem !important;
                border-radius: 4px !important;
                font-size: 0.75rem !important;
                font-weight: 600 !important;
                margin-left: 0.75rem !important;
                display: inline-block !important;
                vertical-align: middle !important;
            `;
            badge.textContent = "Bereits von ebird2ornitho transferiert";

            h1Element.appendChild(badge);
            return true;
        }
        return false;
    }

    // Hintergrund-Synchronisation für den Cache
    chrome.storage.local.get(['savedChecklists'], (data) => {
        const savedList = Array.isArray(data.savedChecklists) ? data.savedChecklists : [];
        localStorage.setItem('ebird2ornitho_saved_cache', JSON.stringify(savedList));
        tryInsert();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.savedChecklists) {
            const newList = Array.isArray(changes.savedChecklists.newValue) ? changes.savedChecklists.newValue : [];
            localStorage.setItem('ebird2ornitho_saved_cache', JSON.stringify(newList));
            tryInsert();
        }
    });

    // Sofortiger Versuch
    if (tryInsert()) return;

    // Observer, der sofort abbricht, sobald das h1 gefunden und das Badge eingefügt wurde
    const observer = new MutationObserver((mutations, obs) => {
        if (tryInsert()) {
            obs.disconnect(); // Sobald es drin ist, stoppen wir den Observer für diese Ansicht
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();