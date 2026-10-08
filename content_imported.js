// ----------------- eBird Import-Hinweis direkt im Titel -----------------
(function() {
    function checkAndInsert() {
        const match = window.location.pathname.match(/\/checklist\/([A-Z]\d+)/);
        if (!match) return;
        const currentChecklistId = match[1];

        const h1Element = document.querySelector('h1#content');
        if (!h1Element) return;

        // Prüfen ob das Badge bereits im aktuellen h1 vorhanden ist
        if (h1Element.querySelector('#ebird2ornitho-imported-badge')) return;

        chrome.storage.local.get(['savedChecklists'], (data) => {
            const savedList = Array.isArray(data.savedChecklists) ? data.savedChecklists : [];

            if (savedList.includes(currentChecklistId)) {
                // Erneut prüfen im Callback, um Doppeleinfügungen zu vermeiden
                if (h1Element.querySelector('#ebird2ornitho-imported-badge')) return;

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
                console.log("[eBird2Ornitho] Badge erfolgreich im h1-Element platziert!");
            }
        });
    }

    // Sofort beim Laden versuchen
    checkAndInsert();

    // Observer überwacht Änderungen im Dokument, falls eBird die Ansicht aktualisiert
    const observer = new MutationObserver(() => {
        checkAndInsert();
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();