// ------------------ Atlascode CSV laden ------------------
let atlasMapCache = {};

async function loadAtlasMap(country) {
    if (atlasMapCache[country]) return atlasMapCache[country];

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getAtlasMap", country }, map => {
            if (chrome.runtime.lastError) {
                console.error("AtlasMap Message Error:", chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError);
                return;
            }
            if (!map || typeof map !== "object") {
                console.error("AtlasMap ungültig:", map);
                reject(new Error("AtlasMap leer oder ungültig"));
                return;
            }
            atlasMapCache[country] = map;
            resolve(map);
        });
    });
}

// ------------------ Atlascode setzen ------------------
async function setAtlasCode(specieEl, breedingCode, country, isLast = false) {
    if (!breedingCode) return null;

    // 1. Hole das zentrale settings-Objekt aus dem Chrome Storage
    const data = await chrome.storage.local.get('useAtlasCodesCT');
    const useCT = data.useAtlasCodesCT ?? true;

    const eBirdLetter = breedingCode.split(' ')[0];

    if (country === "DE" && eBirdLetter === 'F') {
        console.log(`[AtlasCode] Code 'F' wird für ornitho.de bewusst übersprungen.`);
        return null;
    }

    console.log(eBirdLetter, useCT, !useCT && (eBirdLetter === 'C' || eBirdLetter === 'T'));

    if (!useCT && (eBirdLetter === 'C' || eBirdLetter === 'T')) {
        return false; // Bricht ab, sodass der Code nicht eingetragen wird
    }

    // 4. Weiter wie gehabt
    const map = await loadAtlasMap(country);
    const ornithoCode = map[eBirdLetter];

    if (!ornithoCode || ornithoCode === "-") {
        return false;
    }

    if (["1", "2", "3"].includes(ornithoCode)) {
        
        // Dem Svelte-Framework 150ms Zeit geben, die Boxen im DOM aufzubauen
        await new Promise(resolve => setTimeout(resolve, 70));
        
        // Suche gezielt nach dem fettgedruckten Text, der NICHT der Vogelname ist.
        // Wir nutzen dafür den CSS-Selektor :not(), um die Klasse .bird_name auszuschließen.
        const allBoldElements = specieEl.querySelectorAll('b');
        let requiredNotice = null;
        
        for (const b of allBoldElements) {
            if (!b.closest('.bird_name')) {
                requiredNotice = b;
                break;
            }
        }
        
        const requiredKeywords = ["erforderlich", "mandatory", "nécessaire", "necessario"];

        // Validierung, ob der gefundene fettgedruckte Text die Pflichtfeld-Keywords enthält
        const isRequired = requiredNotice && requiredKeywords.some(k =>
            requiredNotice.textContent.toLowerCase().includes(k.toLowerCase())
        );

        if (!isRequired) {
            console.log(`[AtlasCode] Code ${ornithoCode} wird übersprungen – Kein Pflichtfeld für diese Art.`);
            return null; // Wenn kein Pflichtfeld, überspringen (gewollt für 1-3)
        } else {
            console.log(`[AtlasCode] Code ${ornithoCode} wird gesetzt – Pflichtfeld erkannt!`);
        }
    }

    const hiddenInput = specieEl.querySelector('input[type="hidden"][name*="[atlas_code]"]');
        const dropdownBtn = specieEl.querySelector('button.bx--list-box__field');

        if (hiddenInput && dropdownBtn) {
            // 1. Wert setzen und Standard-Events feuern
            hiddenInput.value = ornithoCode;
            hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));

            // 2. Dropdown absolut sicher öffnen (mit mousedown + click kombiniert, da Frameworks da penibel sind)
            dropdownBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            dropdownBtn.click();
            
            // 3. Dem Framework genug Zeit geben, das Menü im DOM aufzubauen
            await new Promise(resolve => setTimeout(resolve, 100));

            // 4. Den Eintrag über seinen Textinhalt suchen (robuster als Klassen/IDs)
            // Carbon nutzt oft '.bx--list-box__menu-item__option' oder Rollen wie 'option'
            const menuOptions = Array.from(document.querySelectorAll('.bx--list-box__menu-item, [role="option"], .bx--dropdown-item'));
            
            // Wir suchen das Item, dessen Text exakt mit unserem Code startet oder ihn enthält
            const menuItem = menuOptions.find(el => {
                const text = el.textContent.trim();
                // Matcht z.B. wenn im Menü "B3 - Sicherer Brutnachweis" oder nur "B3" steht
                return text === ornithoCode || text.startsWith(ornithoCode + ' ') || text.startsWith(ornithoCode + '\t');
            });
            
            if (menuItem) {
                // Eintrag auswählen
                menuItem.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                menuItem.click();
                
                // Zeit für die Verarbeitung geben
                await new Promise(resolve => setTimeout(resolve, 60));
            } else {
                console.warn(`[AtlasCode] Menü-Text für Code "${ornithoCode}" wurde im geöffneten Dropdown nicht gefunden.`);
                
                // Plan B: Wenn das Menü partout nicht will, zwingen wir Svelte über ein Custom Event zur Aktualisierung
                dropdownBtn.dispatchEvent(new CustomEvent('select', { 
                    detail: { item: { id: ornithoCode, value: ornithoCode } },
                    bubbles: true 
                }));
            }

            // 5. Wenn es das letzte Element war, das Dropdown wieder schließen
            if (isLast) {
                dropdownBtn.click();
            }

            return true;
        }
    return true;
}


// ------------------ Hilfsfunktion: Auswahl-Overlay anzeigen ------------------
function showSpeciesSelectionOverlay(speciesName, birdIdsArray) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: '100000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            background: '#fff',
            padding: '24px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
        });

	// Extrahiert alles vor der ersten '(' oder '[' und entfernt überflüssige Leerzeichen
	const cleanedSpeciesName = speciesName.split(/[([]/)[0].trim();

	box.innerHTML = `
            <h3 style="margin-top: 0; color: #1c7ed6; font-size: 18px; font-weight: normal;">Die Art <strong style="font-weight: 	bold;">${cleanedSpeciesName}</strong> ist mehrdeutig</h3>
            <p style="font-size: 14px; color: #333; margin-bottom: 20px;">
                Wähle die passende Art aus, die eingefügt werden soll.
            </p>
            <div id="overlay-id-buttons" style="display: flex; flex-direction: column; gap: 10px;"></div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const btnContainer = box.querySelector('#overlay-id-buttons');
        birdIdsArray.forEach(id => {
            const cleanId = id.trim();
            let displayName = null;

            // --- STRATEGIE 1: Suchen im klassischen species_box li (Erster Fall) ---
            const li = document.querySelector(`#species_box li[id="${cleanId}"]`);
            if (li) {
                displayName = li.getAttribute('value_name') || li.innerText.trim();
            }

            // --- STRATEGIE 2: Suchen im neuen div-Container mit bird_id (Zweiter Fall) ---
            if (!displayName) {
                const container = document.querySelector(`[bird_id="${cleanId}"]`);
                if (container) {
                    const nameEl = container.querySelector('.bird_name b');
                    if (nameEl) {
                        displayName = nameEl.innerText.trim();
                    }
                }
            }

            // --- NEU: Wenn kein Name gefunden wurde, wird dieser Button komplett ausgeblendet (übersprungen) ---
            if (!displayName) {
                return; // Springt zur nächsten ID im Array weiter, ohne einen Button zu erzeugen
            }
            
            // Ab hier existiert garantiert ein Name
            const btn = document.createElement('button');
            btn.textContent = `${displayName} `;

            Object.assign(btn.style, {
                padding: '10px 14px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'background 0.2s',
                textAlign: 'left'
            });
            
            btn.addEventListener('mouseenter', () => btn.style.backgroundColor = '#e9ecef');
            btn.addEventListener('mouseleave', () => btn.style.backgroundColor = '#f8f9fa');
            
            btn.addEventListener('click', () => {
                overlay.remove();
                resolve(cleanId);
            });
            btnContainer.appendChild(btn);
        });
    });
}

// ------------------ Arten übertragen ------------------
async function transferSpecies(speciesData) {
    let successCount = 0;
    const failedSpecies = [];
    const atlasFailedSpecies = [];

    let lastSpecieEl = null;

    const host = window.location.hostname.toLowerCase();
    let country = null;
    if (host.includes("ornitho.ch")) country = "CH";
    else if (host.includes("ornitho.it")) country = "CH";
    else if (host.includes("ornitho.de")) country = "DE";

    const atlascodesSupported = !!country;

    for (let i = 0; i < speciesData.length; i++) {
        const sp = speciesData[i];
        
        let finalBirdID = sp.birdID;
        if (Array.isArray(finalBirdID)) {
            if (finalBirdID.length > 1) {
                finalBirdID = await showSpeciesSelectionOverlay(sp.name, finalBirdID);
            } else {
                finalBirdID = finalBirdID[0] || null;
            }
        }

        if (!finalBirdID) {
            failedSpecies.push({ name: sp.name, count: sp.count });
            continue;
        }

        let specieEl = findSpeciesContainer(finalBirdID);

        if (!specieEl) {
            if (!addSpeciesOfficial(finalBirdID)) {
                failedSpecies.push({ name: sp.name, count: sp.count });
                continue;
            }
            specieEl = findSpeciesContainer(finalBirdID);
            if (!specieEl) {
                failedSpecies.push({ name: sp.name, count: sp.count });
                continue;
            }
        }

        const totalInput = findTotalInput(specieEl);
        const select = findEstimationSelect(specieEl);
        const box = specieEl.querySelector('.box');

        if (!totalInput || !select || !box) {
            failedSpecies.push({ name: sp.name, count: sp.count });
            continue;
        }

        const [highCountOpts, commentOpts] = await Promise.all([
          new Promise(resolve =>
            chrome.storage.local.get(
              { enableHighCountString: false, highCountString: '' },
              resolve
            )
          ),
          new Promise(resolve =>
            chrome.storage.local.get({ includeComments: true }, resolve)
          )
        ]);

        const textarea = findCommentTextarea(specieEl);
        if (!textarea) return;

        let comment = (sp.comment || '').trim();
        const highStr = (highCountOpts.highCountString || '').trim();

        if (commentOpts.includeComments) {
          if (
            highCountOpts.enableHighCountString &&
            highStr.length > 0 &&
            comment.toLowerCase().includes(highStr.toLowerCase())
          ) {
            textarea.value = '';
          } else {
            textarea.value = comment;
          }
        } else {
          textarea.value = '';
        }

        if (String(sp.count).trim().toUpperCase() === "X") {
            select.value = "NO_VALUE";
            select.dispatchEvent(new Event("change", { bubbles: true }));
            box.classList.add('box_yellow');
        } else {
            totalInput.value = sp.count;
            select.value = "EXACT_VALUE";
            totalInput.dispatchEvent(new Event("change", { bubbles: true }));
            totalInput.dispatchEvent(new Event("blur", { bubbles: true }));
            totalInput.dispatchEvent(new Event("keyup", { bubbles: true }));
            select.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const { enableBreedingCodes: breedingEnabled } = await new Promise(resolve =>
            chrome.storage.local.get({ enableBreedingCodes: false }, resolve)
        );

        if (breedingEnabled) {
            if (!atlascodesSupported) {
                if (!atlasFailedSpecies.some(e => e.message === "Atlascodes für dieses Portal nicht implementiert")) {
                    atlasFailedSpecies.push({
                        message: "Atlascodes für dieses Portal nicht implementiert"
                    });
                }
            } else {
                if (sp.breedingCode) {
                    const isLast = i === speciesData.length - 1;
                    const atlasResult = await setAtlasCode(specieEl, sp.breedingCode, country, isLast);

                    if (atlasResult === false) {
                        atlasFailedSpecies.push({ name: sp.name, count: sp.count, code: sp.breedingCode });
                    }
                }
            }
        }

        lastSpecieEl = specieEl;
        successCount++;
    }

    if (lastSpecieEl) {
        const dropdownBtn = lastSpecieEl.querySelector('button.bx--list-box__field');
        const menu = lastSpecieEl.querySelector('.bx--list-box__menu');
        if (dropdownBtn && menu && dropdownBtn.getAttribute('aria-expanded') === 'true') {
            dropdownBtn.setAttribute('aria-expanded', 'false');
            menu.style.display = 'none';
            dropdownBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
    }

    console.log("Gesamt-Fail:", failedSpecies, "Atlas-Fail:", atlasFailedSpecies);

    return {
        success: true,
        message: `${successCount} Arten übertragen`,
        failed: failedSpecies,
        atlasFailed: atlasFailedSpecies
    };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "transferSpeciesToOrnitho" && Array.isArray(msg.speciesData)) {
        checkConfirmNext();
        transferSpecies(msg.speciesData).then(sendResponse).catch(err => {
            console.error(err);
            sendResponse({ success: false, message: err.message });
        });
        document.activeElement.blur();
        return true;
    }
});

function addSpeciesOfficial(birdID) {
    const idInput = document.getElementById('id_species');
    if (!idInput) return false;
    idInput.value = birdID;

    const fastSelect = document.getElementById('fastselectbox');
    if (fastSelect) {
        const li = document.querySelector(`#species_box li[id="${birdID}"]`);
        if (li) fastSelect.value = li.getAttribute('value_name');
    }

    const addButton = document.querySelector('input[name="add"][type="button"]');
    if (!addButton) return false;
    addButton.click();
    return true;
}

function findSpeciesContainer(birdID) {
    return document.querySelector(`.specie[bird_id="${birdID}"]`) ||
           document.querySelector(`div[bird_id="${birdID}"]`);
}

function findTotalInput(container) {
    return container.querySelector('input[name$="[total_number]"]');
}

function findEstimationSelect(container) {
    return container.querySelector('select[name$="[estimation_code]"]');
}

function findCommentTextarea(container) {
    return container.querySelector('textarea[name^="species["][name$="[comment]"]');
}

function checkConfirmNext() {
  const cb = document.getElementById("confirm_next");
  if (!cb) return;

  cb.checked = true;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
}

(function initBackToTop() {
    if (document.getElementById('back-to-top')) return;

    const btn = document.createElement('div');
    btn.id = 'back-to-top';

    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '40px',
        right: '40px',
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        background: '#2d2d2d',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: '9999',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        opacity: '0',
        transition: 'opacity 0.2s ease'
    });

    btn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-8 8h5v8h6v-8h5z"/>
        </svg>
    `;

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        btn.style.opacity = window.scrollY > 300 ? '1' : '0';
    });
})();
