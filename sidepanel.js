// --- Einstellungen ---
const settingsIcon = document.getElementById("settingsIcon");
const settingsMenu = document.getElementById("settingsMenu");
const strassentaubeCheckbox = document.getElementById("enableStrassentaube");

// Menü öffnen / schließen
settingsIcon.addEventListener("click", (e) => {
  e.stopPropagation(); // verhindert dass document-click das Menü direkt wieder schließt
  settingsMenu.style.display =
    settingsMenu.style.display === "block" ? "none" : "block";
});

// Klick außerhalb des Menüs schließt es
document.addEventListener("click", (e) => {
  if (!settingsMenu.contains(e.target) && e.target !== settingsIcon) {
    settingsMenu.style.display = "none";
  }
});

// Checkbox initialisieren
chrome.storage.local.get({ enableStrassentaube: false }, (opts) => {
  strassentaubeCheckbox.checked = opts.enableStrassentaube;
});

// Checkbox speichern bei Änderung
strassentaubeCheckbox.addEventListener("change", () => {
  const checked = strassentaubeCheckbox.checked;
  chrome.storage.local.set({ enableStrassentaube: checked });
  strassentaubeEnabled = checked; // <-- Variable direkt aktualisieren
});



//------------ Highcount
/// -------- Highcount --------
const highCountCheckbox = document.getElementById("enableHighCountString");
const highCountInput = document.getElementById("highCountString");

function updateHighCountState() {
  highCountInput.disabled = !highCountCheckbox.checked;
}

// Initial laden
chrome.storage.local.get(
  { enableHighCountString: false, highCountString: "" },
  ({ enableHighCountString, highCountString }) => {
    highCountCheckbox.checked = enableHighCountString;
    highCountInput.value = highCountString;
    updateHighCountState();
  }
);

// Checkbox ändern
highCountCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({
    enableHighCountString: highCountCheckbox.checked
  });
  updateHighCountState();
});

// String ändern
highCountInput.addEventListener("input", () => {
  chrome.storage.local.set({
    highCountString: highCountInput.value
  });
});


// --- robuster Update-Check ---
async function checkUpdate() {
  const localVersion = chrome.runtime.getManifest().version.trim();
  const statusEl = document.getElementById("status");
  if (!statusEl) return;

  try {
    const url = `https://raw.githubusercontent.com/FlorianH27/ebird2ornitho/main/version.json?cb=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const remoteVersion = (data.version || "").trim();

    if (!remoteVersion) throw new Error("Keine Versionsnummer gefunden");

    // Debug
    console.log(`Local Version: ${localVersion}, Remote Version: ${remoteVersion}`);

    if (compareVersions(remoteVersion, localVersion) > 0) {
      statusEl.innerHTML = `<a href="https://github.com/FlorianH27/ebird2ornitho/releases/latest" target="_blank">Update verfügbar: ${remoteVersion}</a>`;
      statusEl.style.color = "#28a745";
    } else {
      statusEl.textContent = "Bereit";
      statusEl.style.color = "#000000";
    }
  } catch (e) {
    console.error("Update-Check fehlgeschlagen:", e);
    statusEl.textContent = "Bereit";
    statusEl.style.color = "#000000";
  }
}

// --- Versionsvergleich ---
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// --- Intervall starten ---
document.addEventListener("DOMContentLoaded", () => {
  checkUpdate(); // sofort beim Laden prüfen
});


function setStatus(text) {
  document.getElementById("status").textContent = text;
}


function showData(data) {
  if (!data) return;

  const startDate = new Date(data.start);
  const endDate = new Date(data.end);

  document.getElementById("dateDisplay").textContent =
    startDate.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  document.getElementById("timeDisplay").textContent =
    `${startDate.getHours().toString().padStart(2,'0')}:${startDate.getMinutes().toString().padStart(2,'0')} - ` +
    `${endDate.getHours().toString().padStart(2,'0')}:${endDate.getMinutes().toString().padStart(2,'0')}`;

  const commentEl = document.getElementById("commentText");
  const commentRow = document.getElementById("commentRow");
  if (data.comment && data.comment.trim()) {
    commentEl.textContent = data.comment;
    commentEl.classList.remove("empty");
    commentRow.style.display = "flex";
    commentEl.style.display = "block";
  } else {
    commentRow.style.display = "none";
    commentEl.style.display = "none";
  }

  const speciesList = data.speciesList || [];
  const total = speciesList.length;

  const subspeciesCheckbox = document.getElementById("includeSubspecies");

  const recognized = speciesList.filter(s => {
    const code = subspeciesCheckbox.checked ? s.speciesCode_eigen : s.speciesCode;
    return code !== null;
  }).length;

  const speciesEl = document.getElementById("speciesCombined");
  if(speciesEl) {
    speciesEl.innerHTML = `<span class="${recognized === total && total > 0 ? 'green' : 'red'}">${recognized}</span>`;
  }

  const debugEl = document.getElementById("speciesDebug");
  if(debugEl) debugEl.textContent = JSON.stringify(speciesList, null, 2);
}

// ----------------- CSV & ID Maps -----------------
let speciesMap = null;
async function loadSpeciesMap() {
  if (speciesMap) return speciesMap;
  const text = await (await fetch(chrome.runtime.getURL("ebird_names_to_code.csv"))).text();
  speciesMap = {};
  text.split("\n").filter(l => l.trim() && !l.startsWith("DE;")).forEach(line => {
    const [de,en,fr,code] = line.split(";").map(s=>s.trim());
    if(de) speciesMap[`de:${de}`] = code;
    if(en) speciesMap[`en:${en}`] = code;
    if(fr) speciesMap[`fr:${fr}`] = code;
  });
  return speciesMap;
}

let birdIdMap = null;
async function loadBirdIdMap() {
  if(birdIdMap) return birdIdMap;
  const text = await (await fetch(chrome.runtime.getURL("code_to_id.txt"))).text();
  try { birdIdMap = JSON.parse(text.replace(/'/g,'"')); }
  catch(e){ console.error("Fehler beim Parsen von code_to_id.txt",e); birdIdMap = {}; }
  return birdIdMap;
}

// ----------------- eBird Sprache & Subspecies -----------------
const subspeciesCheckbox = document.getElementById("includeSubspecies");
const languageRow = document.getElementById("languageRow");
const langSelect = document.getElementById("languageSelect");

chrome.storage.local.get({ includeSubspecies: false, ebirdLang: "en" }, ({ includeSubspecies, ebirdLang }) => {
  subspeciesCheckbox.checked = includeSubspecies;
  langSelect.value = ebirdLang;
  languageRow.style.display = includeSubspecies ? "flex" : "none";
});

subspeciesCheckbox.addEventListener("change", () => {
  languageRow.style.display = subspeciesCheckbox.checked ? "flex" : "none";
  chrome.storage.local.set({ includeSubspecies: subspeciesCheckbox.checked });
});

langSelect.addEventListener("change", () => chrome.storage.local.set({ ebirdLang: langSelect.value }));

// ----------------- Atlascodes / Brutzeitcodes -----------------
const breedingCheckbox = document.getElementById("enableBreedingCodes");

chrome.storage.local.get({ enableBreedingCodes: false}, (opts) => {
  breedingCheckbox.checked = opts.enableBreedingCodes;
});

breedingCheckbox.addEventListener("change", () => 
    chrome.storage.local.set({ enableBreedingCodes: breedingCheckbox.checked })
);

// ----------------- Kommentare -----------------
const commentsCheckbox = document.getElementById("includeComments");
chrome.storage.local.get({ includeComments: true }, (opts) => commentsCheckbox.checked = opts.includeComments);
commentsCheckbox.addEventListener("change", () => chrome.storage.local.set({ includeComments: commentsCheckbox.checked }));

// ----------------- Daten aus eBird -----------------
document.getElementById("extractBtn").addEventListener("click", async () => {
  setStatus("ebird wird ausgelesen...");

  // Fehlgeschlagene Arten Box ausblenden beim Klick
  const failedEl = document.getElementById("failedSpeciesList");
  failedEl.style.display = "none";
  const failedItems = document.getElementById("failedSpeciesItems");
  failedItems.innerHTML = "";

// Fehlerhafte Atlascode Box ausblenden
    const atlasEl = document.getElementById("failedAtlasList");
    const atlasItems = document.getElementById("failedAtlasItems");
    atlasEl.style.display = "none";
    atlasItems.innerHTML = "";



  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab) { setStatus("Kein aktiver Tab"); return; }
    chrome.tabs.sendMessage(tab.id, { action: "extractEbird" }, async (res) => {
      if(!res){ setStatus("Keine Daten gefunden"); return; }

      chrome.tabs.sendMessage(tab.id, { action: "extractSpecies" }, async (speciesList) => {
        if(!speciesList) speciesList = [];

        const lang = await getEbirdLanguage();
        const map = await loadSpeciesMap();
        const birdMap = await loadBirdIdMap();
        const includeSubspecies = subspeciesCheckbox.checked;

        const speciesListWithCode = speciesList.map(sp => {
          const mappedCode = map[`${lang}:${sp.name}`] || null;
          const baseCode = includeSubspecies ? mappedCode : sp.speciesCode;
          const birdID = baseCode ? birdMap[baseCode] || null : null;
          return { ...sp, speciesCode_eigen: mappedCode, birdID };
        });

        res.speciesList = speciesListWithCode;
        showData(res);

        chrome.storage.local.set({ ebirdData: res, speciesData: speciesListWithCode });
        setStatus("Daten erfolgreich extrahiert");
      });
    });
  });
});

// ----------------- Ornitho Buttons -----------------
document.getElementById("insertBtn").addEventListener("click", () => {
  setStatus("Metadaten werden in Ornitho eingefügt...");
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id,{ action: "fillFromStorage" }, res =>
      setStatus(res?.success ? "Metadaten erfolgreich eingefügt" : "Metadaten einfügen fehlgeschlagen"));
  });
});

document.getElementById("transferSpeciesBtn").addEventListener("click", async () => {
    setStatus("Arten werden in Ornitho eingefügt...");

    const storageData = await new Promise(resolve =>
        chrome.storage.local.get({ speciesData: [] }, res => resolve(res.speciesData))
    );



  // Fehlgeschlagene Arten Box ausblenden beim Klick
  const failedEl = document.getElementById("failedSpeciesList");
  failedEl.style.display = "none";
  const failedItems = document.getElementById("failedSpeciesItems");
  failedItems.innerHTML = "";

// Fehlerhafte Atlascode Box ausblenden
    const atlasEl = document.getElementById("failedAtlasList");
    const atlasItems = document.getElementById("failedAtlasItems");
    atlasEl.style.display = "none";
    atlasItems.innerHTML = "";

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab) { setStatus("Kein aktiver Tab"); return; }

        chrome.tabs.sendMessage(tab.id,
            { action: "transferSpeciesToOrnitho", speciesData: storageData },
            res => {
                if (!res) {
                    setStatus("Arten einfügen fehlgeschlagen");
                    return;
                }

                const total = storageData.length;
                const failedCount = res.failed?.length || 0;
                const successCount = total - failedCount;
                setStatus(`${successCount} von ${total} Arten erfolgreich eingefügt`);

                const failedEl = document.getElementById("failedSpeciesList");
                const failedItemsContainer = document.getElementById("failedSpeciesItems");
                const atlasEl = document.getElementById("failedAtlasList");
                const atlasItemsContainer = document.getElementById("failedAtlasItems");

                // Inhalte leeren
                failedItemsContainer.innerHTML = "";
                atlasItemsContainer.innerHTML = "";

                // Fehlgeschlagene Arten
                if (failedCount > 0) {
                    failedItemsContainer.innerHTML = res.failed.map(s => `${s.name} (${s.count})`).join("<br>");
                    failedEl.style.display = "flex";
                } else {
                    failedEl.style.display = "none";
                }

                // Fehlerhafte Atlascodes
                if (res.atlasFailed?.length > 0) {
                    atlasItemsContainer.innerHTML = res.atlasFailed.map(s => {
                        // Wenn s.name/s.code existieren, wie gewohnt, sonst nur message
                        if (s.name && s.code) return `${s.name} (${s.code})`;
                        if (s.message) return s.message;
                        return "Unbekannter Atlascode-Fehler";
                    }).join("<br>");
                    atlasEl.style.display = "flex";
                } else {
                    atlasEl.style.display = "none";
                }
            }
        );
    });
});



// --------------- breeding codes CSV -------------
async function getAtlasMap(country) {
    const text = await (await fetch(chrome.runtime.getURL("atlascode.csv"))).text();
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(";").map(h => h.trim());
    const dataLines = lines.slice(1);

    const colIndex = headers.indexOf(country);
    if (colIndex === -1) {
        console.error(`Spalte für Land "${country}" nicht gefunden`);
        return {};
    }

    const ebirdIndex = headers.indexOf("ebirdEU");
    const map = {};

    dataLines.forEach(line => {
        const parts = line.split(";").map(s => s.trim());
        const ebirdCode = parts[ebirdIndex];
        const ornithoCode = parts[colIndex];
        if (ornithoCode && ornithoCode !== "-") map[ebirdCode] = ornithoCode;
    });

    return map;
}

// Listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "getAtlasMap" && msg.country) {
        getAtlasMap(msg.country)
            .then(map => {
                console.log(`AtlasMap für ${msg.country} im Sidepanel geladen:`, map);
                sendResponse(map);
            })
            .catch(err => {
                console.error("AtlasMap Fehler:", err);
                sendResponse(null);
            });
        return true; // async sendResponse
    }
});


// ----------------- Hilfsfunktion -----------------
function getEbirdLanguage() {
  return new Promise(resolve => chrome.storage.local.get({ebirdLang:"en"}, ({ebirdLang})=>resolve(ebirdLang)));
}
