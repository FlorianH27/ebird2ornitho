// Funktion: blendet alles aus, außer die Boxen mit box_yellow
function toggleYellowBoxes(checked) {
    // Alle .specie Elemente durchsuchen
    const species = document.querySelectorAll('.specie');

    species.forEach(specie => {
        const yellowBox = specie.querySelector('.box_yellow');
        if (yellowBox) {
            // gelbe Boxen immer sichtbar
            specie.style.display = 'block';
        } else {
            // andere ausblenden, wenn Checkbox aktiv ist
            specie.style.display = checked ? 'none' : 'block';
        }
    });


	
    // Wenn Checkbox aktiv → automatisch nach oben scrollen
    if (checked) {
        window.scrollTo({ top: 280, behavior: 'smooth' });
    }
}

// Listener registrieren, sobald ein Message vom Sidepanel kommt
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggleYellow') {
        toggleYellowBoxes(msg.checked);
    }
});
