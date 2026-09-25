// ============================================================================
// ALLGEMEINE HILFSFUNKTIONEN & LISTENER
// ============================================================================

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


// ============================================================================
// HAUPT-TRANSFER-FUNKTION (CASE-UNTERTEILUNG)
// ============================================================================

async function transferSpecies(speciesData) {
    const host = window.location.hostname.toLowerCase();
    const isArtportalen = host.includes("artportalen.se");

    // ==========================================
    // CASE 1: ARTPORTALEN
    // ==========================================
    if (isArtportalen) {
        let successCount = 0;
        const failedSpecies = [];

        for (let i = 0; i < speciesData.length; i++) {
            let sp = speciesData[i];
            const mappedName = applySpeciesNameMapping(sp.name);
            const addedViaArtportalen = await addSpeciesArtportalen(mappedName, sp.count);
            if (!addedViaArtportalen) {
                failedSpecies.push({ name: sp.name, count: sp.count });
            } else {
                successCount++;
            }
        }

        return {
            success: true,
            message: `${successCount} Arten übertragen`,
            failed: failedSpecies,
            atlasFailed: []
        };
    }

    // ==========================================
    // CASE 2: ORNITHO (Standard)
    // ==========================================
    let successCount = 0;
    const failedSpecies = [];
    const atlasFailedSpecies = [];
    let lastSpecieEl = null;

    let country = null;
    if (host.includes("ornitho.ch")) country = "CH";
    else if (host.includes("ornitho.it")) country = "CH";
    else if (host.includes("ornitho.de")) country = "DE";

    const atlascodesSupported = !!country;
    const processedBirdIDs = new Set();

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

        if (processedBirdIDs.has(finalBirdID)) {
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

        processedBirdIDs.add(finalBirdID);

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
        if (!textarea) continue;

        let comment = (sp.comment || '').trim();
        const highStr = (highCountOpts.highCountString || '').trim();

        if (commentOpts.includeComments) {
          let shouldClearComment = false;
          if (highCountOpts.enableHighCountString && highStr.length > 0) {
            const terms = highStr.split(",").map(t => t.trim()).filter(Boolean);
            const lowerComment = comment.toLowerCase();

            shouldClearComment = terms.some(term => {
              if (term.startsWith('"') && term.endsWith('"') && term.length >= 2) {
                const exactTerm = term.slice(1, -1).toLowerCase();
                return lowerComment === exactTerm;
              } else {
                return lowerComment.includes(term.toLowerCase());
              }
            });
          }

          if (shouldClearComment) {
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

    return {
        success: true,
        message: `${successCount} Arten übertragen`,
        failed: failedSpecies,
        atlasFailed: atlasFailedSpecies
    };
}


// ============================================================================
// BEREICH A: ORNITHO SPEZIFISCHE FUNKTIONEN
// ============================================================================

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

async function setAtlasCode(specieEl, breedingCode, country, isLast = false) {
    if (!breedingCode) return null;

    const data = await chrome.storage.local.get('useAtlasCodesCT');
    const useCT = data.useAtlasCodesCT ?? true;

    const eBirdLetter = breedingCode.split(' ')[0];

    if (country === "DE" && eBirdLetter === 'F') {
        console.log(`[AtlasCode] Code 'F' wird für ornitho.de bewusst übersprungen.`);
        return null;
    }

    if (!useCT && (eBirdLetter === 'C' || eBirdLetter === 'T')) {
        return false;
    }

    const map = await loadAtlasMap(country);
    const ornithoCode = map[eBirdLetter];

    if (!ornithoCode || ornithoCode === "-") {
        return false;
    }

    if (["1", "2", "3"].includes(ornithoCode)) {
        await new Promise(resolve => setTimeout(resolve, 70));

        const allBoldElements = specieEl.querySelectorAll('b');
        let requiredNotice = null;

        for (const b of allBoldElements) {
            if (!b.closest('.bird_name')) {
                requiredNotice = b;
                break;
            }
        }

        const requiredKeywords = ["erforderlich", "mandatory", "nécessaire", "necessario"];
        const isRequired = requiredNotice && requiredKeywords.some(k =>
            requiredNotice.textContent.toLowerCase().includes(k.toLowerCase())
        );

        if (!isRequired) {
            console.log(`[AtlasCode] Code ${ornithoCode} wird übersprungen – Kein Pflichtfeld für diese Art.`);
            return null;
        }
    }

    const hiddenInput = specieEl.querySelector('input[type="hidden"][name*="[atlas_code]"]');
    const dropdownBtn = specieEl.querySelector('button.bx--list-box__field');

    if (hiddenInput && dropdownBtn) {
        hiddenInput.value = ornithoCode;
        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));

        dropdownBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        dropdownBtn.click();

        await new Promise(resolve => setTimeout(resolve, 100));

        const menuOptions = Array.from(document.querySelectorAll('.bx--list-box__menu-item, [role="option"], .bx--dropdown-item'));
        const menuItem = menuOptions.find(el => {
            const text = el.textContent.trim();
            return text === ornithoCode || text.startsWith(ornithoCode + ' ') || text.startsWith(ornithoCode + '\t');
        });

        if (menuItem) {
            menuItem.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            menuItem.click();
            await new Promise(resolve => setTimeout(resolve, 60));
        } else {
            console.warn(`[AtlasCode] Menü-Text für Code "${ornithoCode}" wurde im geöffneten Dropdown nicht gefunden.`);
            dropdownBtn.dispatchEvent(new CustomEvent('select', {
                detail: { item: { id: ornithoCode, value: ornithoCode } },
                bubbles: true
            }));
        }

        if (isLast) {
            dropdownBtn.click();
        }

        return true;
    }
    return true;
}

function showSpeciesSelectionOverlay(speciesName, birdIdsArray) {
    return new Promise((resolve) => {
        const validIds = birdIdsArray.map(id => id.trim()).filter(cleanId => {
            const li = document.querySelector(`#species_box li[id="${cleanId}"]`);
            if (li && (li.getAttribute('value_name') || li.innerText.trim())) return true;

            const container = document.querySelector(`[bird_id="${cleanId}"]`);
            if (container && container.querySelector('.bird_name b')) return true;

            return false;
        });

        if (validIds.length === 0) {
            resolve(null);
            return;
        }

        if (validIds.length === 1) {
            resolve(validIds[0]);
            return;
        }

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

        const cleanedSpeciesName = speciesName.split(/[([]/)[0].trim();

        box.innerHTML = `
            <h3 style="margin-top: 0; color: #1c7ed6; font-size: 18px; font-weight: normal;">Die Art <strong style="font-weight: bold;">${cleanedSpeciesName}</strong> ist mehrdeutig</h3>
            <p style="font-size: 14px; color: #333; margin-bottom: 20px;">
                Wähle die passende Art aus, die eingefügt werden soll.
            </p>
            <div id="overlay-id-buttons" style="display: flex; flex-direction: column; gap: 10px;"></div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const btnContainer = box.querySelector('#overlay-id-buttons');

        validIds.forEach(cleanId => {
            let displayName = null;

            const li = document.querySelector(`#species_box li[id="${cleanId}"]`);
            if (li) {
                displayName = li.getAttribute('value_name') || li.innerText.trim();
            }

            if (!displayName) {
                const container = document.querySelector(`[bird_id="${cleanId}"]`);
                if (container) {
                    const nameEl = container.querySelector('.bird_name b');
                    if (nameEl) {
                        displayName = nameEl.innerText.trim();
                    }
                }
            }

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


// ============================================================================
// BEREICH B: ARTPORTALEN SPEZIFISCHE FUNKTIONEN (INKL. MAPPING & SUCH-MODAL)
// ============================================================================

function applySpeciesNameMapping(name) {
    const nameMap = {
        "Graylag Goose" : "Greylag Goose",
        "Eurasian/Green-winged Teal": "Green-winged Teal",
        "Common Scoter": "Black Scoter",
        "Black Scoter": "American Scoter",
        "Goosander": "Common Merganser",
        "Common Woodpigeon" : "Common Wood Pigeon",
        "Black-throated Diver" : "Black-throated Loon",
        "Common Raven" : "Northern Raven",
        "Pied Wagtail/White Wagtail" : "White Wagtail",
        "Rock Pipit" : "Eurasian Rock Pipit",
        "Common/Arctic Tern": "Common Tern/Arctic Tern"
    };
    const trimmed = name.trim();
    return nameMap[trimmed] || trimmed;
}

async function addSpeciesArtportalen(speciesName, targetCount) {
    const findTargetButton = () => {
        const taxonEls = Array.from(document.querySelectorAll('.taxon-name'));
        const taxonEl = taxonEls.find(el => el.textContent.trim().toLowerCase() === speciesName.toLowerCase());

        if (taxonEl) {
            const container = taxonEl.closest('.adb-panel, app-sighting-input, div');
            if (container) {
                const btn = container.querySelector('button.add-quantity, button[id^="addOne_"]');
                if (btn) return btn;
            }
        }

        const buttons = Array.from(document.querySelectorAll('button.add-quantity, button[aria-label]'));
        let btn = buttons.find(b => {
            const label = b.getAttribute('aria-label') || '';
            const namePart = label.replace(/^(Lägg till art|Taxon)\s+/i, '').trim();
            return namePart.toLowerCase() === speciesName.toLowerCase();
        });

        return btn || null;
    };

    let targetButton = findTargetButton();

    if (!targetButton) {
        const addGlobalBtn = Array.from(document.querySelectorAll('button')).find(b => {
            const span = b.querySelector('span');
            return span && span.textContent.trim().toLowerCase() === 'lägg till art';
        });

        if (addGlobalBtn) {
            addGlobalBtn.click();
            await new Promise(resolve => setTimeout(resolve, 400));

            const taxaInput = document.getElementById('taxaInput') || document.querySelector('input[id="taxaInput"]');
            if (taxaInput) {
                const setNativeValue = (element, value) => {
                    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
                    const prototype = Object.getPrototypeOf(element);
                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

                    if (valueSetter && valueSetter !== prototypeValueSetter) {
                        prototypeValueSetter.call(element, value);
                    } else if (valueSetter) {
                        valueSetter.call(element, value);
                    } else {
                        element.value = value;
                    }
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                };

                setNativeValue(taxaInput, speciesName);
                await new Promise(resolve => setTimeout(resolve, 600));

                const optionButtons = Array.from(document.querySelectorAll('typeahead-container button[role="option"], .dropdown-menu button, .dropdown-item, button[id^="ngb-typeahead-"]'));
                const matchedOption = optionButtons.find(el => {
                    const text = el.textContent.trim().toLowerCase();
                    return text.includes(speciesName.toLowerCase());
                });

                if (matchedOption) {
                    matchedOption.click();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                const okButton = document.getElementById('okButton') || document.querySelector('modal-container button.btn-primary');
                if (okButton) {
                    okButton.click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            targetButton = findTargetButton();
        }
    }

    if (!targetButton) {
        console.warn(`[Artportalen] Hinzufügen-Button für Art "${speciesName}" wurde nicht gefunden.`);
        return false;
    }

    if (targetButton.textContent.trim() === "+") {
        targetButton.click();
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    let container = targetButton.closest('.adb-panel, app-sighting-input, div');
    const isX = String(targetCount).trim().toUpperCase() === "X";

    if (isX) {
        let checkboxEl = container ? container.querySelector('#quantityManyCheckbox') : null;
        if (!checkboxEl) {
            checkboxEl = document.getElementById('quantityManyCheckbox');
        }

        if (checkboxEl) {
            if (!checkboxEl.checked) {
                checkboxEl.click();
                checkboxEl.dispatchEvent(new Event('change', { bubbles: true }));
                checkboxEl.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } else {
            let targetNoCountEl = null;
            if (container) {
                const clickables = Array.from(container.querySelectorAll('button, span, label, mat-checkbox, input[type="checkbox"]'));
                targetNoCountEl = clickables.find(el => {
                    const txt = (el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
                    return txt.includes("kan inte uppskatta") || txt.includes("can't determine quantity");
                });
            }

            if (targetNoCountEl) {
                targetNoCountEl.click();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } else {
        let countInput = container ? container.querySelector('input[formcontrolname="quantity"], input[name*="count"], input[id*="quantity"], input[type="number"]') : null;

        if (!countInput) {
            countInput = document.querySelector('input[formcontrolname="quantity"], input[name*="count"], input[id*="quantity"]');
        }

        if (countInput) {
            const setNativeValue = (element, value) => {
                const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
                const prototype = Object.getPrototypeOf(element);
                const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

                if (valueSetter && valueSetter !== prototypeValueSetter) {
                    prototypeValueSetter.call(element, value);
                } else if (valueSetter) {
                    valueSetter.call(element, value);
                } else {
                    element.value = value;
                }
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            };

            setNativeValue(countInput, "");
            await new Promise(resolve => setTimeout(resolve, 50));
            setNativeValue(countInput, String(targetCount));
            countInput.dispatchEvent(new Event('blur', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            console.warn(`[Artportalen] Antal-Feld für Art "${speciesName}" konnte nicht gefunden werden.`);
        }
    }

    return true;
}