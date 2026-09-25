function pad(n) {
  return String(n).padStart(2, "0");
}


// ============================================================================
// ABSCHNITT 1: ORNITHO FUNKTIONALITÄT
// ============================================================================

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
  document.getElementById("time_start_hour").value = start.getHours();
  document.getElementById("time_start_minute").value = start.getMinutes();
  document.getElementById("time_stop_hour").value = end.getHours();
  document.getElementById("time_stop_minute").value = end.getMinutes();
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fillFromStorage") {
    chrome.storage.local.get("ebirdData", ({ ebirdData }) => {
      if (!ebirdData) return;

      const start = new Date(ebirdData.start);
      const end = new Date(ebirdData.end);

      if (start.getTime() === end.getTime()) {
        end.setMinutes(end.getMinutes() + 5);
      }

      // 1. Datum setzen
      setDateInput(start);

      // 2. divDate-State setzen
      setDivDateAttributes(start, end);

      // 3. hidden Inputs setzen
      setHiddenTimes(start, end);

      // 4. Component informieren
      if (typeof window.onDateChange === "function") {
        window.onDateChange();
      }

      // 5. sichtbare Inputs (nach Render-Zyklus)
      setTimeout(() => {
        setVisibleTimes(start, end);
      }, 0);

      // 6. Kommentar
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


// ============================================================================
// ----------------------------------------------------------------------------
// ============================================================================


// ============================================================================
// ABSCHNITT 2: ARTPORTALEN FUNKTIONALITÄT[cite: 2]
// ============================================================================

async function fillArtportalenModal(start) {
  const modal = document.querySelector('.modal-dialog[role="document"]');
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

  const buttons = Array.from(modal.querySelectorAll('button'));
  const editButton = buttons.find(btn => {
    return btn.textContent.includes('Editera') || btn.querySelector('.fa-edit');
  });


    editButton.click();
    editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 200));


  const dateInput = modal.querySelector('#start-date');
  if (dateInput) {
    const year = start.getFullYear();
    const month = pad(start.getMonth() + 1);
    const day = pad(start.getDate());
    const dateStr = `${year}-${month}-${day}`;
    setNativeValue(dateInput, dateStr);
  }

  const timeInput = modal.querySelector('#start-time');
  if (timeInput) {
    const hours = pad(start.getHours());
    const minutes = pad(start.getMinutes());
    const timeStr = `${hours}:${minutes}`;
    setNativeValue(timeInput, timeStr);
  }

  await new Promise(resolve => setTimeout(resolve, 50));

  const optionNo = modal.querySelector('#optionNo');
  if (optionNo) {
    optionNo.click();
    optionNo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    optionNo.dispatchEvent(new Event('change', { bubbles: true }));
    optionNo.dispatchEvent(new Event('input', { bubbles: true }));
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  const okButton = modal.querySelector('#okButton');
  if (okButton) {
    okButton.click();
    okButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  return true;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fillFromStorage") {
    chrome.storage.local.get("ebirdData", async ({ ebirdData }) => {
      if (!ebirdData) return;

      const start = new Date(ebirdData.start);
      await fillArtportalenModal(start);
      sendResponse({ success: true });
    });
    return true;
  }
});