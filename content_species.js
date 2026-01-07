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

    const map = await loadAtlasMap(country);
    const ornithoCode = map[breedingCode.split(' ')[0]];

    if (!ornithoCode || ornithoCode === "-") return false;

    const hiddenInput = specieEl.querySelector('input[type="hidden"][name*="[atlas_code]"]');
    const dropdownBtn = specieEl.querySelector('button.bx--list-box__field');

    if (hiddenInput && dropdownBtn) {
        hiddenInput.value = ornithoCode;

        dropdownBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        const menuItem = specieEl.querySelector(`.bx--list-box__menu-item[id="${ornithoCode}"]`);
        if (menuItem) menuItem.click();

        if (isLast) dropdownBtn.click();
        return true;
    }

    const select = specieEl.querySelector('select.atlas');
    if (select) {
        select.value = ornithoCode;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        select.dispatchEvent(new Event("keyup", { bubbles: true }));
        return true;
    }

    return true;
}

// ------------------ Arten übertragen ------------------
async function transferSpecies(speciesData) {
    let successCount = 0;
    const failedSpecies = [];
    const atlasFailedSpecies = [];

    let lastSpecieEl = null;

    // Land bestimmen anhand der aktuellen URL
    const host = window.location.hostname.toLowerCase();
    let country = null;
    if (host.includes("ornitho.ch")) country = "CH";
    //else if (host.includes("ornitho.cat")) country = "DE";
    //else if (host.includes("ornitho.de")) country = "DE";
    else if (host.includes("ornitho.it")) country = "CH";

    const atlascodesSupported = !!country;


    for (let i = 0; i < speciesData.length; i++) {
        const sp = speciesData[i];
        let specieEl = findSpeciesContainer(sp.birdID);

        if (!specieEl) {
            if (!addSpeciesOfficial(sp.birdID)) {
                failedSpecies.push({ name: sp.name, count: sp.count });
                continue;
            }
            specieEl = findSpeciesContainer(sp.birdID);
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

// Kommentar setzen
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

console.log("HighCount-String aus Storage:", highStr);
console.log("Kommentar:", comment);

if (commentOpts.includeComments) {
  if (
    highCountOpts.enableHighCountString &&
    highStr.length > 0 &&
    comment.toLowerCase().includes(highStr.toLowerCase())
  ) {
    console.log("Kommentar enthält HighCount-String -> Kommentar wird nicht übernommen");
    textarea.value = '';
  } else {
    console.log("Kommentar wird übernommen");
    textarea.value = comment;
  }
} else {
  console.log("Kommentare deaktiviert -> Kommentar wird gelöscht");
  textarea.value = '';
}



        // Anzahl setzen
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

	
	// ----------------- Atlascodes setzen -----------------
    // Portal unterstützt Atlascodes → nur setzen, wenn Checkbox aktiv
    const { enableBreedingCodes: breedingEnabled } = await new Promise(resolve =>
        chrome.storage.local.get({ enableBreedingCodes: false }, resolve)
    );

if (breedingEnabled) {
if (!atlascodesSupported) {
    // Einmalige Meldung, dass Atlascodes für dieses Portal nicht unterstützt werden
    if (!atlasFailedSpecies.some(e => e.message === "Alle (Atlascodes für dieses Portal nicht implementiert)")) {
        atlasFailedSpecies.push({
            message: "Alle (Atlascodes für dieses Portal nicht implementiert)"
        });
    }
} else {


    if (sp.breedingCode) {
        const isLast = i === speciesData.length - 1;
        const atlasResult = await setAtlasCode(specieEl, sp.breedingCode, country, isLast);

        // Fehler nur eintragen, wenn wir es versucht haben und es schiefging
        if (atlasResult === false) {
            atlasFailedSpecies.push({ name: sp.name, count: sp.count, code: sp.breedingCode });
        }
    }
}
}


        lastSpecieEl = specieEl;
        successCount++;
    }

    // Dropdown der letzten Art schließen
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

// ------------------ Listener ------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "transferSpeciesToOrnitho" && Array.isArray(msg.speciesData)) {
        transferSpecies(msg.speciesData).then(sendResponse).catch(err => {
            console.error(err);
            sendResponse({ success: false, message: err.message });
        });
        return true;
    }
});

// ------------------ Helfer ------------------
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
