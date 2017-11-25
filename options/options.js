const OPTION_DISABLE_KEYBOARD_SHORTCUTS = "disableKeyboardShortcuts";
const CSS_ID_DISABLE_KEYBOARD_SHORTCUTS = "disableKeyboardShortcuts";

function restoreOptions() {
    browser.storage.local.get([
        OPTION_DISABLE_KEYBOARD_SHORTCUTS,
    ]).then(
        result => {
            setBooleanValue(CSS_ID_DISABLE_KEYBOARD_SHORTCUTS, result[OPTION_DISABLE_KEYBOARD_SHORTCUTS]);
        }
    );
}

function enableAutosave() {
    for (let input of document.querySelectorAll("input:not([type=radio]):not([type=checkbox]), textarea")) {
        input.addEventListener("input", saveOptions);
    }
    for (let input of document.querySelectorAll("input[type=radio], input[type=checkbox]")) {
        input.addEventListener("change", saveOptions);
    }
}

function setBooleanValue(elementID, newValue) {
    document.getElementById(elementID).checked = newValue;
}

function saveOptions(event) {
    event.preventDefault();
    browser.storage.local.set({
        [OPTION_DISABLE_KEYBOARD_SHORTCUTS]: document.getElementById(CSS_ID_DISABLE_KEYBOARD_SHORTCUTS).checked,
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
