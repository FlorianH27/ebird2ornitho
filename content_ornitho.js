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

      sendResponse({ success: true });
    });
    return true;
  }
});
