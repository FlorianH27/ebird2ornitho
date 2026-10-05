// ============================================================================
// HILFSFUNKTIONEN & DATUMS- / ZEIT-LOGIK (ORNITHO)
// ============================================================================

function pad(n) {
  return String(n).padStart(2, "0");
}

function setDivDateAttributes(start, end) {
  const div = document.getElementById("divDate");
  if (!div) return;

  div.setAttribute("date",
    `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${start.getFullYear()}`
  );

  div.setAttribute("start_hour", start.getHours());
  div.setAttribute("start_minute", start.getMinutes());
  div.setAttribute("stop_hour", end.getHours());
  div.setAttribute("stop_minute", end.getMinutes());
}

function setHiddenTimes(start, end) {
  const startHourInput = document.getElementById("time_start_hour");
  const startMinInput = document.getElementById("time_start_minute");
  const stopHourInput = document.getElementById("time_stop_hour");
  const stopMinInput = document.getElementById("time_stop_minute");

  if (startHourInput) startHourInput.value = start.getHours();
  if (startMinInput) startMinInput.value = start.getMinutes();
  if (stopHourInput) stopHourInput.value = end.getHours();
  if (stopMinInput) stopMinInput.value = end.getMinutes();
}

function setVisibleTimes(start, end) {
  const inputs = document.querySelectorAll(".bx--time-picker__input-field");
  if (inputs.length < 2) return;

  inputs[0].value = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  inputs[1].value = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

  inputs.forEach(input => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function setDateInput(start) {
  const input = document.getElementById("start_date_obj");
  if (!input) return;

  input.value =
    `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${start.getFullYear()}`;

  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
}

function setComment(text) {
  const ta = document.querySelector('textarea[name="form_comment_REM"]');
  if (!ta) return;

  if (ta.value.trim() !== "") return;

  ta.value = text || "";
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  ta.dispatchEvent(new Event("change", { bubbles: true }));
}


// ============================================================================
// ARTPORTALEN METADATEN-FUNKTION (MODAL SUPPORT)
// ============================================================================

async function fillArtportalenModal(start) {
  console.log("[Artportalen] fillArtportalenModal gestartet.");

  const modal = document.querySelector('.modal-dialog[role="document"], .modal-content');
  if (!modal) {
    console.warn("[Artportalen] Kein Modal gefunden.");
    return false;
  }

  const setNativeValue = (element, value) => {
    let prototype = element;
    let descriptor = null;
    while (prototype && !descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      prototype = Object.getPrototypeOf(prototype);
    }

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  // 0. Auf den "Editera"-Button klicken
  const buttons = Array.from(modal.querySelectorAll('button'));
  const editButton = buttons.find(btn => {
    return btn.textContent.includes('Editera') || btn.querySelector('.fa-edit');
  });

  if (editButton) {
    console.log("[Artportalen] 'Editera'-Button gefunden, klicke...");
    editButton.click();
    editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } else {
    console.warn("[Artportalen] 'Editera'-Button nicht gefunden.");
  }

  // 1. Warten, bis die Datums- und Zeit-Inputs nach dem Edit-Klick im DOM erscheinen (max. 2 Sekunden)
  let dateInput = null;
  let timeInput = null;
  for (let i = 0; i < 20; i++) {
    dateInput = document.querySelector('input#start-date, input[type="date"], input[formcontrolname*="date"]');
    timeInput = document.querySelector('input#start-time, input[type="time"], input[formcontrolname*="time"]');
    if (dateInput && timeInput) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 2. Startdatum setzen
  if (dateInput) {
    const year = start.getFullYear();
    const month = pad(start.getMonth() + 1);
    const day = pad(start.getDate());
    const dateStr = `${year}-${month}-${day}`;
    console.log("[Artportalen] Setze Datum:", dateStr);
    setNativeValue(dateInput, dateStr);
  } else {
    console.warn("[Artportalen] Datums-Input-Tag konnte nicht gefunden werden.");
  }

  // 3. Startzeit setzen
  if (timeInput) {
    const hours = pad(start.getHours());
    const minutes = pad(start.getMinutes());
    const timeStr = `${hours}:${minutes}`;
    console.log("[Artportalen] Setze Zeit:", timeStr);
    setNativeValue(timeInput, timeStr);
  } else {
    console.warn("[Artportalen] Zeit-Input-Tag konnte nicht gefunden werden.");
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  // 4. Option "optionNo" auswählen
  const optionNo = document.querySelector('input[type="radio"]#optionNo, input[name="timeOptions"][value="false"]');
  if (optionNo) {
    console.log("[Artportalen] Wähle optionNo-Radio-Button aus.");
    optionNo.click();
    optionNo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    optionNo.dispatchEvent(new Event('change', { bubbles: true }));
    optionNo.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    console.warn("[Artportalen] Radio-Button #optionNo nicht gefunden.");
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  // 5. Auf den Starten-Button klicken ("okButton")
  const okButton = document.querySelector('button#okButton, button.btn-primary');
  if (okButton) {
    console.log("[Artportalen] Klicke 'Starta' (okButton).");
    okButton.click();
    okButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } else {
    console.warn("[Artportalen] Starta-Button nicht gefunden.");
  }

  return true;
}


// ============================================================================
// HAUPT-LISTENER (UNTERTEILUNG ORNITHO / ARTPORTALEN)
// ============================================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fillFromStorage") {
    chrome.storage.local.get("ebirdData", async ({ ebirdData }) => {
      if (!ebirdData) {
        sendResponse({ success: false, message: "Keine ebirdData gefunden" });
        return;
      }

      const start = new Date(ebirdData.start);
      const isArtportalenModalOpen = document.querySelector('.modal-dialog[role="document"]');

      // ==========================================
      // CASE 1: ARTPORTALEN METADATEN (MODAL)
      // ==========================================
      if (isArtportalenModalOpen) {
        await fillArtportalenModal(start);
        sendResponse({ success: true });
        return;
      }

      // ==========================================
      // CASE 2: ORNITHO METADATEN (ORIGINAL)
      // ==========================================
      const end = new Date(ebirdData.end);

      if (start.getTime() === end.getTime()) {
        end.setMinutes(end.getMinutes() + 5);
      }

      setDateInput(start);
      setDivDateAttributes(start, end);
      setHiddenTimes(start, end);

      if (typeof window.onDateChange === "function") {
        window.onDateChange();
      }

      setTimeout(() => {
        setVisibleTimes(start, end);
      }, 0);

      setComment(ebirdData.comment);

      const websiteBtn = document.querySelector('body input[name="addform"]');
      if (websiteBtn) {
        websiteBtn.focus();
      }

      sendResponse({ success: true });
    });
    return true;
  }
});