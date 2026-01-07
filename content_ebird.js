// ----------------- Duration Parsing -----------------
function parseDurationText(text) {
  if (!text) return 0;

  text = text.toLowerCase().replace(/\s+/g, ""); // alles klein, Leerzeichen entfernen
  let totalMinutes = 0;

  // Stunden optional: "7h", "7hr", "7heure"
  const hrMatch = text.match(/(\d+)(h|hr|heure)/);
  if (hrMatch) totalMinutes += parseInt(hrMatch[1], 10) * 60;

  // Minuten optional: "17min", "17m", "17minute"
  const minMatch = text.match(/(\d+)(m|min|minute)/);
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);

  return totalMinutes;
}

// ----------------- eBird Daten Extraktion -----------------
function extractEbirdData() {
  try {
    // Startzeit auslesen
    let startDate = null;
    const timeEl =
      document.querySelector("div.SectionHeading-heading time[datetime]") ||
      document.querySelector("time[datetime]");

    if (timeEl) {
      const datetime = timeEl.getAttribute("datetime");
      startDate = new Date(datetime);
      if (isNaN(startDate)) startDate = null;
    }

    if (!startDate) startDate = new Date();

    // Dauer aus dem Badge-Label extrahieren
    const durationLabel = Array.from(document.querySelectorAll(".Badge-label"))
      .find(span => /(\d+\s*(h|hr|heure|m|min|minute))/.test(span.textContent.toLowerCase()));

    let durationMinutes = 0;
    if (durationLabel) durationMinutes = parseDurationText(durationLabel.textContent.trim());

    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // Kommentar auslesen
    let comment = "";
    const commentEl = document.querySelector(
      'section[aria-labelledby="checklist-comments"] p:not(.u-text-1)'
    );
    if (commentEl) comment = commentEl.textContent.trim();

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      displayStart: startDate.toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short"
      }),
      displayEnd: endDate.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      comment
    };
  } catch (err) {
    console.error("Error extracting eBird data:", err);
    return {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      displayStart: "(kein Datum)",
      displayEnd: "(kein Datum)",
      comment: ""
    };
  }
}

// ----------------- Species Extraktion -----------------
let strassentaubeEnabled = false;
chrome.storage.local.get(['enableStrassentaube'], data => {
  strassentaubeEnabled = !!data.enableStrassentaube;
});

async function extractSpecies() {
  try {
    const storageData = await new Promise(resolve =>
      chrome.storage.local.get(['enableStrassentaube'], resolve)
    );
    const strassentaubeEnabled = !!storageData.enableStrassentaube;

    const sections = document.querySelectorAll("li[data-observation] section.Observation");

    const speciesList = Array.from(sections)
      .map(section => {
        const nameEl = section.querySelector(".Observation-species .Heading-main");
        const countEl = section.querySelector(
          ".Observation-numberObserved > span > span:not(.is-visuallyHidden)"
        );
        const commentEl = section.querySelector(".Observation-comments p");

        if (!nameEl || !countEl) return null;

        const rawCount = countEl.textContent.trim();
        const count = /^\d+$/.test(rawCount) ? parseInt(rawCount, 10) : rawCount;

        const breedingEl = section.querySelector(".Observation-meta .Observation-meta-item-value");
        const breedingCode = breedingEl ? breedingEl.textContent.trim() : "";

        const breedingLa = section.querySelector(".Observation-meta .Observation-meta-item-label");
        const breedingLang = breedingLa
          ? breedingLa.textContent.trim()
              .replace("Indice de nidification et de comportement:", "FR")
              .replace("Brutzeit- & Verhaltenscode:", "DE")
              .replace("Breeding Behavior Code:", "EN")
              .replace("Códigos de cría y comportamiento", "ES")
              .replace("Codice comportamentale di nidificazione:", "IT")
          : "";

        let speciesCode = section.id || null;
        if (strassentaubeEnabled && speciesCode === "rocpig") {
          speciesCode = "rocpig1";
        }

        return {
          speciesCode,
          name: nameEl.textContent.trim(),
          count,
          comment: commentEl ? commentEl.textContent.trim() : "",
          breedingCode,
          breedingLang
        };
      })
      .filter(Boolean);

    return speciesList;
  } catch (err) {
    console.error("Error extracting species:", err);
    return [];
  }
}

// ----------------- Kommentar Helper -----------------
async function shouldSetComment(comment) {
  const { includeComments, enableHighCountString, highCountString } = await new Promise(resolve =>
    chrome.storage.local.get(
      { includeComments: true, enableHighCountString: false, highCountString: "" },
      resolve
    )
  );

  if (!includeComments) return false;
  if (!comment || !comment.trim()) return false;

  // nur prüfen, wenn HighCount aktiv ist und ein nicht-leerer String gesetzt ist
  if (enableHighCountString && highCountString?.trim()) {
    const cleanComment = comment.trim().toLowerCase();
    const cleanHighString = highCountString.trim().toLowerCase();
    if (cleanComment.includes(cleanHighString)) return false;
  }

  return true;
}


// ----------------- Message Listener -----------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extractEbird") {
    sendResponse(extractEbirdData());
  }

  if (msg.action === "extractSpecies") {
    extractSpecies().then(list => sendResponse(list));
    return true; // async sendResponse
  }

  return true;
});
