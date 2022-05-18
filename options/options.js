const OPTION_DISABLE_KEYBOARD_SHORTCUTS = "disableKeyboardShortcuts";
const OPTION_ADD_BACKGROUND_TABS_TO_FRONT = "addBackgroundTabsToFront";

function restoreOptions() {
    browser.storage.local.get([
        OPTION_DISABLE_KEYBOARD_SHORTCUTS,
        OPTION_ADD_BACKGROUND_TABS_TO_FRONT,
    ]).then(
        result => {
            setBooleanValue(OPTION_DISABLE_KEYBOARD_SHORTCUTS, result[OPTION_DISABLE_KEYBOARD_SHORTCUTS]);
            setBooleanValue(OPTION_ADD_BACKGROUND_TABS_TO_FRONT, result[OPTION_ADD_BACKGROUND_TABS_TO_FRONT]);
        }
    );
}

function enableAutosave() {
    for (const input of document.querySelectorAll("input:not([type=radio]):not([type=checkbox]), textarea")) {
        input.addEventListener("input", saveOptions);
    }
    for (const input of document.querySelectorAll("input[type=radio], input[type=checkbox]")) {
        input.addEventListener("change", saveOptions);
    }
}

function setBooleanValue(elementID, newValue) {
    document.getElementById(elementID).checked = newValue;
}

function saveOptions(event) {
    event.preventDefault();
    browser.storage.local.set({
        [OPTION_DISABLE_KEYBOARD_SHORTCUTS]: document.getElementById(OPTION_DISABLE_KEYBOARD_SHORTCUTS).checked,
        [OPTION_ADD_BACKGROUND_TABS_TO_FRONT]: document.getElementById(OPTION_ADD_BACKGROUND_TABS_TO_FRONT).checked,
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
