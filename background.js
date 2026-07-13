const OPTION_DISABLE_KEYBOARD_SHORTCUTS = "disableKeyboardShortcuts";
const OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT = "addBackgroundTabsAfterCurrent";

let deques = undefined;
let nextTabId = undefined;

browser.commands.onCommand.addListener(command => {
    browser.storage.local.get(OPTION_DISABLE_KEYBOARD_SHORTCUTS)
        .then(result => {
            if (!result[OPTION_DISABLE_KEYBOARD_SHORTCUTS]) {
                if (command === "send-tab-to-end-of-tabdeque") {
                    runOnCurrentTab(
                        (tab) => {
                            const tabId = tab.id;
                            const windowId = tab.windowId;
                            sendTabToEndOfDeque(windowId, tabId);
                        }
                    );
                } else if (command === "select-tab-from-end-of-tabdeque") {
                    runOnCurrentTab(
                        (tab) => {
                            const windowId = tab.windowId;
                            selectTabFromEndOfDeque(windowId);
                        }
                    );
                } else if (command === "toggle-add-background-tabs-after-current-option") {
                    browser.storage.local.get(OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT).then(
                        result => {
                            browser.storage.local.set({
                                [OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT]: !result[OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT]
                            });
                        }
                    )
                }
            }
        });
});

browser.contextMenus.create(
    {
        id: "send-tab-to-end-of-tabdeque",
        title: "Send tab to end of TabDeque",
        contexts: [
            "page",
            // firefox-only: "tab",
        ],
    }
);

browser.contextMenus.onClicked.addListener(
    (info, tab) => {
        if (info.menuItemId === "send-tab-to-end-of-tabdeque") {
            const tabId = tab.id;
            const windowId = tab.windowId;
            sendTabToEndOfDeque(windowId, tabId);
        }
    }
);

browser.tabs.onCreated.addListener(
    (tab) => {
        const tabId = tab.id;
        const windowId = tab.windowId;
        const currentDeque = backup(getWindowDeques(windowId)).current;

        if (currentDeque.indexOf(tabId) === -1) {
            browser.storage.local.get(OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT)
                .then(result => {
                    if (!result[OPTION_ADD_BACKGROUND_TABS_AFTER_CURRENT]) {
                        currentDeque.push(tabId);
                    } else {
                        currentDeque.splice(1, 0, tabId);
                    }
                });
        }
    }
);

browser.tabs.onAttached.addListener(
    (tabId, attachInfo) => {
        const windowId = attachInfo.newWindowId;
        const currentDeque = backup(getWindowDeques(windowId)).current;

        currentDeque.unshift(tabId);
    }
);

browser.tabs.onActivated.addListener(
    (activeInfo) => {
        const tabId = activeInfo.tabId;
        const windowId = activeInfo.windowId;

        if (nextTabId !== undefined) {
            // skip default activation after remove
            if (nextTabId !== tabId) {
                return;
            } else {
                nextTabId = undefined;
            }
        }

        const currentDeque = backup(getWindowDeques(windowId)).current;

        removeFromDeque(tabId, currentDeque);
        currentDeque.unshift(tabId);
    }
);

browser.tabs.onRemoved.addListener(
    (tabId, removeInfo) => {
        const windowId = removeInfo.windowId;
        handleRemove(windowId, tabId);
    }
);

browser.tabs.onDetached.addListener(
    (tabId, detachInfo) => {
        const windowId = detachInfo.oldWindowId;
        handleRemove(windowId, tabId);
    }
);

function sendTabToEndOfDeque(windowId, tabId) {
    const currentDeque = backup(getWindowDeques(windowId)).current;

    removeFromDeque(tabId, currentDeque);
    currentDeque.push(tabId);
    browser.tabs.update(currentDeque[0], {active: true});
}

function selectTabFromEndOfDeque(windowId) {
    const currentDeque = backup(getWindowDeques(windowId)).current;
    const tabId = currentDeque[currentDeque.length - 1];

    removeFromDeque(tabId, currentDeque);
    currentDeque.unshift(tabId);
    browser.tabs.update(currentDeque[0], {active: true});
}

function runOnCurrentTab(givenFunction) {
    browser.tabs.query(
        {
            active: true,
            currentWindow: true,
        }
    ).then(
        (tabs) => {
            givenFunction(tabs[0]);
        }
    );
}

function handleRemove(windowId, tabId) {
    const currentDeque = backup(getWindowDeques(windowId)).current;

    const wasFirstAndElementsLeft = removeFromDeque(tabId, currentDeque);
    if (wasFirstAndElementsLeft) {
        nextTabId = currentDeque[0];
        browser.tabs.update(nextTabId, {active: true});
    }
}

function getWindowDeques(windowId) {
    if (deques === undefined) {
        deques = {};
    }

    if (!deques[windowId]) {
        deques[windowId] = {
            previous: [],
            current: [],
        };
    }

    return deques[windowId];
}

function backup(windowDeques) {
    windowDeques.previous = windowDeques.current.slice();
    return windowDeques;
}

function removeFromDeque(tabId, deque) {
    const dequeIndex = deque.indexOf(tabId);

    if (dequeIndex >= 0) {
        deque.splice(dequeIndex, 1);
    }

    return dequeIndex == 0 && deque.length > 0;
}

function initializeDeques(windowInfoArray) {
    if (deques !== undefined) {
        return;
    }

    deques = {};
    for (const windowInfo of windowInfoArray) {
        deques[windowInfo.id] = {
            previous: [],
            current: windowInfo.tabs.map((tab) => { return tab.id; }),
        };
    }
}

browser.windows.getAll({
    populate: true,
    windowTypes: ["normal"],
}).then(initializeDeques);
