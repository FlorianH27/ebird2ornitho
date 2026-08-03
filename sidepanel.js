// ======================================================
// eBird2Ornitho - sidepanel.js
// Teil 1: Hilfsfunktionen, Settings, Update-System
// ======================================================

let strassentaubeEnabled = true;
const MAX_UNLOCKS = 10;

// ------------------------------------------------------
// Kleine Hilfsfunktionen (Storage & UI)
// ------------------------------------------------------
function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

function getStorage(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function setStorage(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve));
}

async function clearEbirdSessionData() {
  await chrome.storage.local.remove(["ebirdData", "speciesData"]);
  console.log("[eBird2Ornitho] eBird-Session-Daten beim Öffnen des Sidepanels geleert.");
}

function hideOpenLocationButton() {
  const button = document.getElementById("openLocationBtn");
  if (button) button.style.display = "none";
}

// ------------------------------------------------------
// Settings Menü
// ------------------------------------------------------
function initSettingsMenu() {
  const settingsIcon = document.getElementById("settingsIcon");
  const settingsMenu = document.getElementById("settingsMenu");
  if (!settingsIcon || !settingsMenu) return;

  settingsIcon.addEventListener("click", event => {
    event.stopPropagation();
    const isVisible = settingsMenu.style.display === "block";
    settingsMenu.style.display = isVisible ? "none" : "block";
    if (!isVisible) refreshLibraryDisplay();
  });

  document.addEventListener("click", event => {
    if (!settingsMenu.contains(event.target) && event.target !== settingsIcon) {
      settingsMenu.style.display = "none";
    }
  });
}

// ======================================================
// Teil 2: Settings Initialisierungen (Storage)
// ======================================================

function initStrassentaubeSetting() {
  const checkbox = document.getElementById("enableStrassentaube");
  if (!checkbox) return;

  getStorage({ enableStrassentaube: true }).then(async data => {
    const currentSetting = data.enableStrassentaube;

    const rawData = await getStorage("enableStrassentaube");
    if (rawData.enableStrassentaube === undefined) {
      await setStorage({ enableStrassentaube: currentSetting });
      console.log("[eBird2Ornitho] Strassentaube-Standardwert (true) initial im Storage hinterlegt.");
    }

    checkbox.checked = currentSetting;
    strassentaubeEnabled = currentSetting;

    checkbox.addEventListener("change", async () => {
      strassentaubeEnabled = checkbox.checked;
      await setStorage({ enableStrassentaube: checkbox.checked });
    });
  });
}

function initHighCountSetting() {
  const checkbox = document.getElementById("enableHighCountString");
  const input = document.getElementById("highCountString");
  if (!checkbox || !input) return;

  const updateState = () => { input.disabled = !checkbox.checked; };

  chrome.storage.local.get(["enableHighCountString", "highCountString"], rawData => {
    if (rawData.enableHighCountString === undefined || rawData.highCountString === undefined) {
      chrome.storage.local.set({
        enableHighCountString: rawData.enableHighCountString !== undefined ? rawData.enableHighCountString : false,
        highCountString: rawData.highCountString !== undefined ? rawData.highCountString : ""
      });
      console.log("[eBird2Ornitho] High Count Defaults initial im Storage hinterlegt.");
    }

    checkbox.checked = rawData.enableHighCountString !== undefined ? rawData.enableHighCountString : false;
    input.value = rawData.highCountString !== undefined ? rawData.highCountString : "";
    updateState();
  });

  checkbox.addEventListener("change", () => {
    updateState();
    chrome.storage.local.set({ enableHighCountString: checkbox.checked });
  });

  input.addEventListener("input", () => {
    chrome.storage.local.set({ highCountString: input.value });
  });
}

function initEbirdSettings() {
  const checkbox = document.getElementById("includeSubspecies");
  const languageRow = document.getElementById("languageRow");
  const select = document.getElementById("languageSelect");
  if (!checkbox || !languageRow || !select) return;

  chrome.storage.local.get({ includeSubspecies: false, ebirdLang: "de" }, data => {
    chrome.storage.local.get(["includeSubspecies", "ebirdLang"], rawData => {
      if (rawData.includeSubspecies === undefined || rawData.ebirdLang === undefined) {
        chrome.storage.local.set({
          includeSubspecies: rawData.includeSubspecies !== undefined ? rawData.includeSubspecies : false,
          ebirdLang: rawData.ebirdLang !== undefined ? rawData.ebirdLang : "de"
        });
        console.log("[eBird2Ornitho] eBird-Settings Defaults initial im Storage hinterlegt.");
      }
    });

    checkbox.checked = data.includeSubspecies;
    select.value = data.ebirdLang;
    languageRow.style.display = data.includeSubspecies ? "flex" : "none";
  });

  checkbox.addEventListener("change", () => {
    languageRow.style.display = checkbox.checked ? "flex" : "none";
    chrome.storage.local.set({ includeSubspecies: checkbox.checked });
  });

  select.addEventListener("change", () => {
    chrome.storage.local.set({ ebirdLang: select.value });
  });
}

function initBreedingSetting() {
  const checkbox = document.getElementById("enableBreedingCodes");
  if (!checkbox) return;

  chrome.storage.local.get("enableBreedingCodes", rawData => {
    if (rawData.enableBreedingCodes === undefined) {
      chrome.storage.local.set({ enableBreedingCodes: true });
      console.log("[eBird2Ornitho] Breeding Codes Default initial im Storage hinterlegt.");
    }
    checkbox.checked = rawData.enableBreedingCodes ?? true;
  });

  checkbox.addEventListener("change", () => {
    chrome.storage.local.set({ enableBreedingCodes: checkbox.checked });
  });
}

function initCommentsSetting() {
  const checkbox = document.getElementById("includeComments");
  if (!checkbox) return;

  chrome.storage.local.get({ includeComments: true }, data => {
    chrome.storage.local.get("includeComments", rawData => {
      if (rawData.includeComments === undefined) {
        chrome.storage.local.set({ includeComments: data.includeComments });
        console.log("[eBird2Ornitho] Comments Default initial im Storage hinterlegt.");
      }
    });
    checkbox.checked = data.includeComments;
  });

  checkbox.addEventListener("change", () => {
    chrome.storage.local.set({ includeComments: checkbox.checked });
  });
}

async function inituseAtlasCodesCTSetting() {
  const checkbox = document.getElementById("useAtlasCodesCT");
  if (!checkbox) return;

  const { useAtlasCodesCT = false } = await getStorage({ useAtlasCodesCT: false });
  checkbox.checked = useAtlasCodesCT;

  checkbox.addEventListener("change", async () => {
    await setStorage({ useAtlasCodesCT: checkbox.checked });
    console.log(`[eBird2Ornitho] Option 'Atlascodes C/T ignorieren' geändert auf: ${checkbox.checked}`);
  });
}

// ======================================================
// Teil 3: Location Library, Feedback & Buttons
// ======================================================

const libExportArea = document.getElementById("libExportArea");
const libImportArea = document.getElementById("libImportArea");
const libCopyBtn = document.getElementById("libCopyBtn");
const libAppendBtn = document.getElementById("libAppendBtn");
const libReplaceBtn = document.getElementById("libReplaceBtn");

async function refreshLibraryDisplay() {
  if (!libExportArea) return;
  chrome.storage.local.get({ locationLinks: {} }, (result) => {
    libExportArea.value = JSON.stringify(result.locationLinks || {});
  });
}

function showBtnFeedback(btn, feedbackText = "Erledigt!") {
  const originalText = btn.textContent;
  const originalBg = btn.style.backgroundColor;
  const originalColor = btn.style.color;

  btn.textContent = feedbackText;
  btn.style.backgroundColor = "#2b8a3e";
  btn.style.color = "white";

  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.backgroundColor = originalBg;
    btn.style.color = originalColor;
  }, 4000);
}

libCopyBtn?.addEventListener("click", async () => {
  if (!libExportArea || !libExportArea.value) return;
  try {
    await navigator.clipboard.writeText(libExportArea.value);
    showBtnFeedback(libCopyBtn, "✓ Kopiert!");
  } catch (err) {
    console.error("Fehler beim Kopieren:", err);
    setStatus("Kopieren fehlgeschlagen");
  }
});

libAppendBtn?.addEventListener("click", () => {
  if (!libImportArea) return;
  const inputStr = libImportArea.value.trim();
  if (!inputStr) return;

  try {
    const newData = JSON.parse(inputStr);
    chrome.storage.local.get({ locationLinks: {} }, (result) => {
      const mergedLinks = { ...newData, ...result.locationLinks };
      chrome.storage.local.set({ locationLinks: mergedLinks }, () => {
        libImportArea.value = "";
        refreshLibraryDisplay();
        showBtnFeedback(libAppendBtn, "Angefügt!");
        if (typeof updateLinkButton === "function") updateLinkButton();
      });
    });
  } catch (e) {
    alert("Fehler beim Importieren: Bitte JSON-Format prüfen.");
  }
});

libReplaceBtn?.addEventListener("click", () => {
  if (!libImportArea) return;
  const inputStr = libImportArea.value.trim();
  if (!inputStr) return;

  if (!confirm("Wirklich alle Verknüpfungen überschreiben?")) return;

  try {
    const newData = JSON.parse(inputStr);
    chrome.storage.local.set({ locationLinks: newData }, () => {
      libImportArea.value = "";
      refreshLibraryDisplay();
      showBtnFeedback(libReplaceBtn, "Ersetzt!");
      if (typeof updateLinkButton === "function") updateLinkButton();
    });
  } catch (e) {
    alert("Fehler beim Importieren: Bitte JSON-Format prüfen.");
  }
});

// ======================================================
// Teil 4: Update Handling & UI Lock
// ======================================================

function compareVersions(a, b) {
  const va = a.split(".").map(Number);
  const vb = b.split(".").map(Number);
  const length = Math.max(va.length, vb.length);
  for (let i = 0; i < length; i++) {
    const diff = (va[i] || 0) - (vb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function checkUpdate() {
  const manifest = chrome.runtime.getManifest();
  const localVersion = manifest.version.trim();
  const statusEl = document.getElementById("status");
  if (!statusEl) return;

  try {
    const url = `https://raw.githubusercontent.com/FlorianH27/ebird2ornitho/main/version.json?cb=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const remoteVersion = (data.version || "").trim();
    if (!remoteVersion) throw new Error("Keine Versionsnummer gefunden");

    if (compareVersions(remoteVersion, localVersion) > 0) {
      statusEl.innerHTML = `<a href="https://github.com/FlorianH27/ebird2ornitho/releases/latest" target="_blank">Update verfügbar: ${remoteVersion}</a>`;
      await lockUI(remoteVersion);
    } else {
      await chrome.storage.local.remove("unlockAttempts");
      statusEl.textContent = "Bereit";
    }
  } catch (e) {
    console.error("Update-Check fehlgeschlagen:", e);
    statusEl.textContent = "Bereit";
  }
}

async function lockUI(remoteVersion) {
  const { unlockAttempts = 0 } = await chrome.storage.local.get("unlockAttempts");
  const remaining = Math.max(0, MAX_UNLOCKS - unlockAttempts);

  document.querySelectorAll("button").forEach(btn => btn.disabled = true);

  const overlay = document.createElement("div");
  overlay.id = "update-lock-overlay";
  overlay.style = "position:fixed; inset:0; background:rgba(255,255,255,0.98); z-index:9999; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; font-family:sans-serif;";

  overlay.innerHTML = `
    <div style="max-width: 420px; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
      <h2 style="margin-top: 0; margin-bottom: 4px; font-size: 20px; color: #0f172a;">Version ${remoteVersion} verfügbar</h2>

      <a href="https://github.com/FlorianH27/ebird2ornitho/releases/latest" target="_blank" style="display: inline-block; font-size: 11px; color: #2563eb; text-decoration: none; font-weight: 500; margin-bottom: 12px;">
        Änderungsprotokoll (Changelog) ansehen &rarr;
      </a>

      <div style="background: #eef6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: left;">
        <strong style="font-size: 13px; color: #1d4ed8; display: block; margin-bottom: 8px;">Anleitung Update:</strong>

        <ol style="font-size: 12px; color: #1e293b; margin: 0; padding-left: 18px; line-height: 1.5;">
          <li>
            <b>Lokalen Ordner der Erweiterung öffnen</b><br>
            <span style="font-size: 11px; color: #475569;">
               Lokalen Ordner öffnen, in dem die Erweiterung gespeichert wurde. Falls der Speicherort unbekannt ist, bei
<button id="openDetailsBtn" style="display: inline; width: auto; background: none; border: none; padding: 0; color: #2563eb; text-decoration: underline; cursor: pointer; font-size: 11px; vertical-align: baseline;">Details</button>                   neben <b>Geladen aus</b> den Dateipfad nachschauen.
            </span>
          </li>
          <li style="margin-top: 6px;">
            <b>Im lokalen Ordner den Downloader öffnen</b>
            <ul style="margin: 2px 0 0 0; padding-left: 16px; font-size: 11px;">
              <li><b>Windows:</b> <code>auto-downloader-windows.bat</code></li>
              <li>
                <b>macOS:</b> <code>auto-downloader-macOS.app</code><br>
                <span style="font-size: 10px; color: #64748b;">
                  (<b>Hinweis macOS:</b> Falls auto-downloader-macOS.app fehlt, muss dieser einmalig selbst erstellt werden – <a href="https://github.com/FlorianH27/ebird2ornitho/blob/main/README.md#anleitung-auto-downloader-app-f%C3%BCr-macos-erstellen" target="_blank" style="color: #2563eb;">Anleitung</a>)
                </span>
              </li>
            </ul>
          </li>
          <li style="margin-top: 6px;">
            <b>Erweiterung neu laden</b><br>
            <span style="font-size: 11px; color: #475569;">
<button id="openExtPageBtn" style="display: inline; width: auto; background: none; border: none; padding: 0; color: #2563eb; text-decoration: underline; cursor: pointer; font-size: 11px; vertical-align: baseline;">Erweiterungen verwalten</button>              → bei ebird2ornitho auf <b>Erneut laden</b> (Kreis-Symbol) klicken
            </span>
          </li>
        </ol>
      </div>

      <a href="https://github.com/FlorianH27/ebird2ornitho/blob/main/README.md#update" target="_blank" style="font-size: 12px; text-decoration: underline;">
        Anleitung online öffnen
      </a>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
        <span style="font-size: 12px; font-weight: bold; color: #000; display: block; margin-bottom: 4px;">Optional: Location Library Backup</span>
        <span style="font-size: 11px; color: #475569; display: block; margin-bottom: 8px;">
          Alle Daten bleiben beim Update erhalten. Optional kann die Location-Library kopiert und nach dem Update in den Einstellungen wieder eingefügt werden:
        </span>
        <button id="copyLocationBtn" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; width: 100%; cursor: pointer;">
          Library in Zwischenablage kopieren
        </button>
      </div>

      ${remaining > 0 ? `
        <div style="margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
          <button id="unlockOnceBtn" style="background: transparent; color: #94a3b8; border: 1px solid #e2e8f0; padding: 8px 12px; font-size: 12px; border-radius: 6px; cursor: pointer;">
            Update überspringen
          </button>
        </div>
      ` : ""}
    </div>
  `;
  document.body.appendChild(overlay);

  // Link 1: Details öffnen
  document.getElementById("openDetailsBtn").addEventListener("click", () => {
    const extId = chrome.runtime.id;
    try {
      chrome.tabs.create({ url: `chrome://extensions/?id=${extId}` });
    } catch (err) {
      chrome.tabs.create({ url: "chrome://extensions" });
    }
  });

  // Link 2: Erweiterungen verwalten öffnen
  document.getElementById("openExtPageBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions" });
  });

  // Location Backup kopieren
  document.getElementById("copyLocationBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    const btn = e.target;
    try {
      const data = await chrome.storage.local.get("locationLinks");
      const locationString = data.locationLinks ? JSON.stringify(data.locationLinks, null, 2) : "Keine Location-Links im Speicher gefunden.";
      await navigator.clipboard.writeText(locationString);

      btn.style.background = "#dcfce7"; btn.style.color = "#166534"; btn.style.borderColor = "#86efac"; btn.textContent = "Kopiert!";
      setTimeout(() => {
        btn.style.background = "#ffffff"; btn.style.color = "#334155"; btn.style.borderColor = "#cbd5e1"; btn.textContent = "Bibliothek in Zwischenablage kopieren";
      }, 2000);
    } catch (err) {
      btn.textContent = "Fehler beim Kopieren";
    }
  });

  // Unlock Button
  if (remaining > 0) {
    document.getElementById("unlockOnceBtn").addEventListener("click", async () => {
      await chrome.storage.local.set({ unlockAttempts: unlockAttempts + 1 });
      overlay.remove();
      document.querySelectorAll("button").forEach(btn => btn.disabled = false);
    });
  }
}


// ======================================================
// Teil 5: Datenanzeige, Extraktion & Mapping
// ======================================================

function showData(data) {
  if (!data) return;
  const start = new Date(data.start);
  const end = new Date(data.end);

  // Ort anzeigen
  const locationEl = document.getElementById("locationDisplay");
  if (locationEl) {
    locationEl.textContent = data.location || "—";
  }

  // Datum & Zeit zusammen auf einer Zeile anzeigen
  const dateTimeEl = document.getElementById("dateTimeDisplay");
  if (dateTimeEl) {
    const formattedDate = start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const formatTime = d => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const formattedTime = `${formatTime(start)} - ${formatTime(end)}`;

    dateTimeEl.textContent = `${formattedDate}, ${formattedTime}`;
  }

  const comment = document.getElementById("commentText");
  const commentRow = document.getElementById("commentRow");
  if (comment && commentRow) {
    if (data.comment && data.comment.trim()) {
      comment.textContent = data.comment;
      comment.classList.remove("empty");
      comment.style.display = "block";
      commentRow.style.display = "flex";
    } else {
      commentRow.style.display = "none";
      comment.style.display = "none";
    }
  }

  const speciesList = Array.isArray(data.speciesList) ? data.speciesList : [];
  const useSubspecies = document.getElementById("includeSubspecies")?.checked ?? false;
  const recognized = speciesList.filter(s => (useSubspecies ? s.speciesCode_eigen : s.speciesCode) != null).length;

  const speciesEl = document.getElementById("speciesCombined");
  if (speciesEl) {
    speciesEl.innerHTML = `<span class="${recognized === speciesList.length && speciesList.length > 0 ? "green" : "red"}">${recognized}</span>`;
  }

  const debug = document.getElementById("speciesDebug");
  if (debug) debug.textContent = JSON.stringify(speciesList, null, 2);
}



let speciesMap = null;
async function loadSpeciesMap() {
  if (speciesMap) return speciesMap;
  const text = await (await fetch(chrome.runtime.getURL("ebird_names_to_code.csv"))).text();
  speciesMap = {};
  text.split(/\r?\n/).filter(line => line.trim() && !line.startsWith("DE;")).forEach(line => {
    const [de, en, fr, code] = line.split(";").map(v => v.trim());
    if (de) speciesMap[`de:${de}`] = code;
    if (en) speciesMap[`en:${en}`] = code;
    if (fr) speciesMap[`fr:${fr}`] = code;
  });
  return speciesMap;
}

let birdIdMap = null;
async function loadBirdIdMap() {
  if (birdIdMap) return birdIdMap;
  try {
    const response = await fetch("https://raw.githubusercontent.com/FlorianH27/ebird2ornitho/refs/heads/main/code_to_id.txt");
    birdIdMap = JSON.parse((await response.text()).replace(/'/g, '"'));
  } catch(error) {
    console.error("Fehler beim Laden von code_to_id.txt", error);
    birdIdMap = {};
  }
  return birdIdMap;
}

function getEbirdLanguage() {
  return new Promise(resolve => {
    chrome.storage.local.get({ ebirdLang: "de" }, ({ ebirdLang }) => resolve(ebirdLang));
  });
}

async function extractEbirdData() {
  setStatus("eBird wird ausgelesen...");
  ["failedSpeciesList", "failedAtlasList"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = "none"}
  });

  ["failedSpeciesItems", "failedAtlasItems"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {el.innerHTML = ""}
  });

  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) { setStatus("Kein aktiver Tab"); return; }

    let data;
    try {
      data = await chrome.tabs.sendMessage(tab.id, { action: "extractEbird" });
    } catch (e) {
      await chrome.tabs.reload(tab.id);

      await new Promise((resolve) => {
        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      data = await chrome.tabs.sendMessage(tab.id, { action: "extractEbird" });
    }

    if (!data) { setStatus("Keine Daten gefunden"); return; }

    const speciesList = await chrome.tabs.sendMessage(tab.id, { action: "extractSpecies" }) || [];
    const lang = await getEbirdLanguage();
    const map = await loadSpeciesMap();
    const birdMap = await loadBirdIdMap();
    const includeSubspecies = document.getElementById("includeSubspecies")?.checked ?? false;

    const speciesWithCodes = speciesList.map(species => {
      const mappedCode = map[`${lang}:${species.name}`] || null;
      const baseCode = includeSubspecies ? mappedCode : species.speciesCode;
      return { ...species, speciesCode_eigen: mappedCode, birdID: baseCode ? birdMap[baseCode] || null : null };
    });

    data.speciesList = speciesWithCodes;
    data.coordinates = data.coordinates || null;
    data.location = data.location || null;

    showData(data);
    await setStorage({ ebirdData: data, speciesData: speciesWithCodes });
    updateOpenLocationButton();
    setStatus("Daten erfolgreich extrahiert");
  } catch(error) {
    console.error("eBird Extraktion Fehler:", error);
    setStatus("Fehler beim Auslesen");
  }
}

// ======================================================
// Teil 6: Polygon / Point-in-Polygon Hilfsfunktionen
// ======================================================

function isPointInPolygon(point, vs) {
  const x = point[0], y = point[1]; // x = lon, y = lat
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInCountry(lat, lon, countryData) {
  if (!countryData.polygons) return false;
  return countryData.polygons.some(polygon => isPointInPolygon([lon, lat], polygon));
}

let countryDataCache = null;
async function loadCountryData() {
  if (countryDataCache) return countryDataCache;
  try {
    const rawGithubUrl = "https://raw.githubusercontent.com/FlorianH27/ebird2ornitho/main/country_polygons.json";
    const response = await fetch(rawGithubUrl);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    countryDataCache = await response.json();
  } catch (e) {
    console.error("Fehler beim Laden der Länder-Polygone von GitHub:", e);
    countryDataCache = {};
  }
  return countryDataCache;
}

// ======================================================
// Teil 7: Ornitho Actions & Visibility Guards
// ======================================================

async function insertMetadata() {
  setStatus("Metadaten werden eingefügt...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { action: "fillFromStorage" });
    setStatus(result?.success ? "Metadaten erfolgreich eingefügt" : "Metadaten einfügen fehlgeschlagen");
  } catch(error) {
    setStatus("Fehler beim Einfügen");
  }
}

async function transferSpecies() {
  const filterCheckbox = document.getElementById("toggleEmptySpecies");
  if (filterCheckbox && filterCheckbox.checked) {
    filterCheckbox.checked = false;
    filterCheckbox.dispatchEvent(new Event("change"));
  }

  setStatus("Arten werden eingefügt...");
  const { speciesData = [] } = await getStorage({ speciesData: [] });

  ["failedSpeciesList", "failedAtlasList"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = "none"}
  });

  ["failedSpeciesItems", "failedAtlasItems"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {el.innerHTML = ""}
  });

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { action: "transferSpeciesToOrnitho", speciesData });
    if (!result) { setStatus("Keine Antwort von Ornitho"); return; }

    const failedCount = result.failed?.length || 0;
    setStatus(`${speciesData.length - failedCount} von ${speciesData.length} Arten erfolgreich eingefügt`);

    if (failedCount > 0 && document.getElementById("failedSpeciesItems")) {
      document.getElementById("failedSpeciesItems").innerHTML = result.failed.map(s => `${s.name} (${s.count})`).join("<br>");
      document.getElementById("failedSpeciesList").style.display = "flex";
    }
    if (result.atlasFailed?.length && document.getElementById("failedAtlasItems")) {
      document.getElementById("failedAtlasItems").innerHTML = result.atlasFailed.map(item => item.name && item.code ? `${item.name} (${item.code})` : item.message || "Fehler").join("<br>");
      document.getElementById("failedAtlasList").style.display = "flex";
    }
  } catch(error) {
    setStatus("Arten einfügen fehlgeschlagen");
  }
}

async function updateLinkButton(forcedUrl = null) {
  const button = document.getElementById("linkBtn");
  if (!button) return;

  try {
    let url = forcedUrl || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.url || "";
    if (url.includes("index.php?m_id=1423&wizard_target=daily")) {
      button.style.display = "block";
      const { ebirdData, locationLinks = {} } = await getStorage(["ebirdData", "locationLinks"]);
      if (ebirdData?.location && locationLinks[ebirdData.location] === url) {
        button.textContent = "Verknüpfung mit eBird Location aufheben";
        button.dataset.mode = "unlink";
      } else {
        button.textContent = "Ornitho Location mit eBird verknüpfen";
        button.dataset.mode = "link";
      }
    } else {
      button.style.display = "none";
    }
  } catch (error) {
    button.style.display = "none";
  }
}

async function updateTransferButton(forcedUrl = null) {
  const transferButton = document.getElementById("transferSpeciesBtn");
  const emptySpeciesCard = document.getElementById("toggleEmptySpeciesCard");
  const failedAtlasList = document.getElementById("failedAtlasList");
  const failedSpeciesList = document.getElementById("failedSpeciesList");

  if (!transferButton && !emptySpeciesCard) return;

  try {
    let url = forcedUrl || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.url || "";
    const isCurrentStateDaily = url.includes("index.php?m_id=1423&wizard_current_state=daily");
    const displayStyle = isCurrentStateDaily ? "flex" : "none";

    if (transferButton) transferButton.style.display = isCurrentStateDaily ? "block" : "none";
    if (emptySpeciesCard) emptySpeciesCard.style.display = displayStyle;

    if (!isCurrentStateDaily) {
      if (failedAtlasList) failedAtlasList.style.display = "none";
      if (failedSpeciesList) failedSpeciesList.style.display = "none";
    }
  } catch (error) {
    console.error(error);
  }
}

async function linkLocation() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const button = document.getElementById("linkBtn");
    const { ebirdData } = await getStorage("ebirdData");

    if (!ebirdData?.location) { alert("Keine eBird-Location vorhanden. Bitte zuerst eBird-Daten auslesen."); return; }

    const location = ebirdData.location;
    const { locationLinks = {} } = await getStorage("locationLinks");

    if (button && button.dataset.mode === "unlink") {
      delete locationLinks[location];
      await setStorage({ locationLinks });
      setStatus(`Verknüpfung gelöscht: ${location}`);
    } else {
      locationLinks[location] = tab?.url;
      await setStorage({ locationLinks });
      setStatus(`Verknüpfung erstellt: ${location}`);
    }

    await updateLinkButton(tab?.url);
    updateOpenLocationButton();
  } catch(error) {
    console.error(error);
  }
}

async function updateOpenLocationButton() {
  const openButton = document.getElementById("openLocationBtn");
  const mapBtnContainer = document.getElementById("ornithoMapBtnContainer");

  const { ebirdData, locationLinks = {} } = await getStorage(["ebirdData", "locationLinks"]);
  const hasLink = ebirdData?.location && locationLinks[ebirdData.location];
  const hasCoordinates = !!ebirdData?.coordinates?.lat && !!ebirdData?.coordinates?.lon;

  // 1. Unveränderte Logik für Verknüpfungs-Button
  if (openButton) openButton.style.display = hasLink ? "flex" : "none";

  // 2. Dynamische Erzeugung der Karten-Buttons nach Ländern
  if (mapBtnContainer) {
    mapBtnContainer.innerHTML = "";

    if (hasCoordinates) {
      const lat = ebirdData.coordinates.lat;
      const lon = ebirdData.coordinates.lon;
      const countries = await loadCountryData();

      const matchedCodes = Object.keys(countries).filter(code => {
        return isPointInCountry(lat, lon, countries[code]);
      });

      matchedCodes.forEach(code => {
        const countryInfo = countries[code];
        const btn = document.createElement("button");
        btn.className = "ornitho-map-btn";

        // Domain aus der URL extrahieren (z. B. "https://www.ornitho.ch/..." -> "ornitho.ch")
        let domain = code; // Fallback auf Länderkürzel
        try {
          domain = new URL(countryInfo.url).hostname.replace(/^www\./, '');
        } catch (e) {
          console.warn(`Ungültige URL für ${code}:`, countryInfo.url);
        }

        btn.title = `Karte in ${domain} öffnen`;

        // Nur das Länderkürzel als Text setzen
        btn.textContent = code;

        btn.addEventListener("click", () => {
          const targetUrl = `${countryInfo.url}${lat},${lon}`;
          chrome.tabs.create({ url: targetUrl });
        });

        mapBtnContainer.appendChild(btn);
      });
    }
  }
}

async function openLocation() {
  const { ebirdData, locationLinks = {} } = await getStorage(["ebirdData", "locationLinks"]);
  const url = locationLinks[ebirdData?.location];
  if (!url) return;

  setStatus("Ornitho laden...");
  chrome.tabs.create({ url }, (tab) => {
    chrome.tabs.onUpdated.addListener(function listenForLoad(tabId, changeInfo) {
      if (tabId === tab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listenForLoad);
        setStatus("Tab geladen. Füge Metadaten automatisch ein...");
        setTimeout(async () => {
          try {
            const result = await chrome.tabs.sendMessage(tab.id, { action: "fillFromStorage" });
            setStatus(result?.success ? "Erfolgreich geöffnet und Metadaten eingefügt" : "Automatisch einfügen fehlgeschlagen.");
          } catch (error) {
            setStatus("Fehler beim automatischen Einfügen");
          }
        }, 200);
      }
    });
  });
}

async function getAtlasMap(country) {
  try {
    const text = await (await fetch(chrome.runtime.getURL("breedingcode.csv"))).text();
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return {};

    const headers = lines[0].split(";").map(h => h.trim());
    const countryIndex = headers.indexOf(country);
    const ebirdIndex = headers.indexOf("ebirdEU");
    if (countryIndex === -1 || ebirdIndex === -1) return {};

    const map = {};
    lines.slice(1).forEach(line => {
      const parts = line.split(";").map(x => x.trim());
      const ebirdCode = parts[ebirdIndex];
      const atlasCode = parts[countryIndex];
      if (ebirdCode && atlasCode && atlasCode !== "-") map[ebirdCode] = atlasCode;
    });
    return map;
  } catch(error) {
    return {};
  }
}

function initSpeciesFilter() {
  const checkbox = document.getElementById("toggleEmptySpecies");
  if (!checkbox) return;
  checkbox.addEventListener("change", event => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "toggleYellow", checked: event.target.checked });
    });
  });
}

function initActionButtons() {
  document.getElementById("extractBtn")?.addEventListener("click", extractEbirdData);
  document.getElementById("insertBtn")?.addEventListener("click", insertMetadata);
  document.getElementById("transferSpeciesBtn")?.addEventListener("click", transferSpecies);
  document.getElementById("linkBtn")?.addEventListener("click", linkLocation);
  document.getElementById("openLocationBtn")?.addEventListener("click", openLocation);
}

// ======================================================
// Teil 8: Initialisierung & Main Loop
// ======================================================

async function init() {
  console.log("[eBird2Ornitho] Sidepanel geladen: init() startet.");

  const manifest = chrome.runtime.getManifest();
  const versionElement = document.getElementById('extensionVersion');
  if (versionElement && manifest) {
    versionElement.textContent = `ebird2ornitho ${manifest.version}	`;
    versionElement.style.whiteSpace = "pre";
  }

  hideOpenLocationButton();
  await clearEbirdSessionData();

  // Settings & Storage Syncing
  initSettingsMenu();
  await initStrassentaubeSetting();
  await inituseAtlasCodesCTSetting();
  initHighCountSetting();
  initEbirdSettings();
  initBreedingSetting();
  initCommentsSetting();

  // UI Functionalities
  initActionButtons();
  initSpeciesFilter();

  const card = document.getElementById("toggleEmptySpeciesCard");
  if (card) card.style.display = "none";
  document.getElementById("transferSpeciesBtn")?.addEventListener("click", () => { if (card) card.style.display = "flex"; });

  // Messaging Map Listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getAtlasMap" && message.country) {
      getAtlasMap(message.country).then(sendResponse);
      return true;
    }
  });

  // Initiale URL Checks
  updateLinkButton();
  updateTransferButton();

  // URL-Wächter (onUpdated & onActivated)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active) {
      const targetUrl = changeInfo.url || (changeInfo.status === "complete" ? tab.url : null);
      if (targetUrl) {
        updateLinkButton(targetUrl);
        updateTransferButton(targetUrl);
      }
    }
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    setTimeout(async () => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab?.url) {
          updateLinkButton(tab.url);
          updateTransferButton(tab.url);
        }
      } catch (e) {
        console.error(e);
      }
    }, 50);
  });

  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      updateLinkButton();
      updateTransferButton();
    }
  });

  checkUpdate();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

