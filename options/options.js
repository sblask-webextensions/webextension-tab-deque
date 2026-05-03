const OPTION_DISABLE_KEYBOARD_SHORTCUTS = "disableKeyboardShortcuts";
const CSS_ID_DISABLE_KEYBOARD_SHORTCUTS = "disableKeyboardShortcuts";
const OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT = "addBackgroundTabsAfterCurrent";
const CSS_ID_ADD_BACKGROUND_TABS_AFTER_CURRENT = "addBackgroundTabsAfterCurrent";

function restoreOptions() {
    browser.storage.local.get([
        OPTION_DISABLE_KEYBOARD_SHORTCUTS,
        OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT,
    ]).then(
        result => {
            setBooleanValue(CSS_ID_DISABLE_KEYBOARD_SHORTCUTS, result[OPTION_DISABLE_KEYBOARD_SHORTCUTS]);
            setBooleanValue(CSS_ID_ADD_BACKGROUND_TABS_AFTER_CURRENT, result[OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT]);
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
        [OPTION_DISABLE_KEYBOARD_SHORTCUTS]: document.getElementById(CSS_ID_DISABLE_KEYBOARD_SHORTCUTS).checked,
        [OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT]: document.getElementById(CSS_ID_ADD_BACKGROUND_TABS_AFTER_CURRENT).checked,
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
