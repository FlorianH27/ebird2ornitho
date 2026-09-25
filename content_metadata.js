function pad(n) {
  return String(n).padStart(2, "0");
}

// ------------------ Artportalen Metadata Modal Support ------------------
async function fillArtportalenModal(start) {
  console.log("[Artportalen] fillArtportalenModal gestartet.");

  const modal = document.querySelector('.modal-dialog[role="document"]');
  if (!modal) {
    console.warn("[Artportalen] Kein Modal gefunden.");
    return false;
  }

  // Sicherer Setter für Angular-Inputs
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
    await new Promise(resolve => setTimeout(resolve, 200));
  } else {
    console.warn("[Artportalen] 'Editera'-Button nicht gefunden.");
  }

  // 1. Startdatum setzen (yyyy-MM-dd)
  const dateInput = modal.querySelector('#start-date');
  if (dateInput) {
    const year = start.getFullYear();
    const month = pad(start.getMonth() + 1);
    const day = pad(start.getDate());
    const dateStr = `${year}-${month}-${day}`;
    console.log("[Artportalen] Setze Datum:", dateStr);
    setNativeValue(dateInput, dateStr);
  }

  // 2. Startzeit setzen (HH:mm)
  const timeInput = modal.querySelector('#start-time');
  if (timeInput) {
    const hours = pad(start.getHours());
    const minutes = pad(start.getMinutes());
    const timeStr = `${hours}:${minutes}`;
    console.log("[Artportalen] Setze Zeit:", timeStr);
    setNativeValue(timeInput, timeStr);
  }

  await new Promise(resolve => setTimeout(resolve, 50));

  // 3. Option "Fynd får fältbesökets start- och sluttid" auswählen (id="optionNo")
  const optionNo = modal.querySelector('#optionNo');
  if (optionNo) {
    console.log("[Artportalen] Wähle optionNo aus.");
    optionNo.click();
    optionNo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    optionNo.dispatchEvent(new Event('change', { bubbles: true }));
    optionNo.dispatchEvent(new Event('input', { bubbles: true }));
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  // 4. Auf den Starten-Button klicken ("okButton")
  const okButton = modal.querySelector('#okButton');
  if (okButton) {
    console.log("[Artportalen] Klicke 'Starta' (okButton).");
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

      // Prüfen, ob wir uns im Artportalen-Modal befinden
      const isArtportalenModalOpen = document.querySelector('.modal-dialog[role="document"]');

      if (isArtportalenModalOpen) {
        await fillArtportalenModal(start);
        sendResponse({ success: true });
        return;
      }

      sendResponse({ success: true });
    });
    return true;
  }
});