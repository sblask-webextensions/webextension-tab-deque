const OPTION_DISABLE_KEYBOARD_SHORTCUTS = "disableKeyboardShortcuts";

let deques = undefined;
let nextTabId = undefined;

browser.commands.onCommand.addListener(command => {
    browser.storage.local.get(OPTION_DISABLE_KEYBOARD_SHORTCUTS, result => {
        if (!result[OPTION_DISABLE_KEYBOARD_SHORTCUTS]) {
            if (command === "send-tab-to-end-of-tabdeque") {
                runOnCurrentTab(
                    (tab) => {
                        let tabId = tab.id;
                        let windowId = tab.windowId;
                        sendTabToEndOfDeque(windowId, tabId);
                    }
                );
            } else if (command === "select-tab-from-end-of-tabdeque") {
                runOnCurrentTab(
                    (tab) => {
                        let windowId = tab.windowId;
                        selectTabFromEndOfDeque(windowId);
                    }
                );
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
            let tabId = tab.id;
            let windowId = tab.windowId;
            sendTabToEndOfDeque(windowId, tabId);
        }
    }
);

browser.tabs.onCreated.addListener(
    (tab) => {
        let tabId = tab.id;
        let windowId = tab.windowId;
        let currentDeque = backup(getWindowDeques(windowId)).current;

        if (currentDeque.indexOf(tabId) === -1) {
            currentDeque.push(tabId);
        }
    }
);

browser.tabs.onAttached.addListener(
    (tabId, attachInfo) => {
        let windowId = attachInfo.newWindowId;
        let currentDeque = backup(getWindowDeques(windowId)).current;

        currentDeque.unshift(tabId);
    }
);

browser.tabs.onActivated.addListener(
    (activeInfo) => {
        let tabId = activeInfo.tabId;
        let windowId = activeInfo.windowId;

        if (nextTabId !== undefined) {
            // skip default activation after remove
            if (nextTabId !== tabId) {
                return;
            } else {
                nextTabId = undefined;
            }
        }

        let currentDeque = backup(getWindowDeques(windowId)).current;

        removeFromDeque(tabId, currentDeque);
        currentDeque.unshift(tabId);
    }
);

browser.tabs.onRemoved.addListener(
    (tabId, removeInfo) => {
        let windowId = removeInfo.windowId;
        handleRemove(windowId, tabId);
    }
);

browser.tabs.onDetached.addListener(
    (tabId, detachInfo) => {
        let windowId = detachInfo.oldWindowId;
        handleRemove(windowId, tabId);
    }
);

function sendTabToEndOfDeque(windowId, tabId) {
    let currentDeque = backup(getWindowDeques(windowId)).current;

    removeFromDeque(tabId, currentDeque);
    currentDeque.push(tabId);
    browser.tabs.update(currentDeque[0], {active: true});
}

function selectTabFromEndOfDeque(windowId) {
    let currentDeque = backup(getWindowDeques(windowId)).current;
    let tabId = currentDeque[currentDeque.length - 1];

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
    let currentDeque = backup(getWindowDeques(windowId)).current;

    let wasFirstAndElementsLeft = removeFromDeque(tabId, currentDeque);
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
    let dequeIndex = deque.indexOf(tabId);

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
    for (let windowInfo of windowInfoArray) {
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
