const OPTION_DISABLE_KEYBOARD_SHORTCUTS = "disableKeyboardShortcuts";
const STATE_STORAGE_KEY = "tabDequeState";

let deques = undefined;
let nextTabId = undefined;
let statePromise = undefined;
let stateQueue = Promise.resolve();

browser.commands.onCommand.addListener(command => {
    runWithState(async () => {
        const result = await browser.storage.local.get(OPTION_DISABLE_KEYBOARD_SHORTCUTS);
        if (result[OPTION_DISABLE_KEYBOARD_SHORTCUTS]) {
            return;
        }

        const currentTab = (await browser.tabs.query({active: true, currentWindow: true}))[0];
        if (command === "send-tab-to-end-of-tabdeque") {
            const tabId = currentTab.id;
            const windowId = currentTab.windowId;
            await sendTabToEndOfDeque(windowId, tabId);
        } else if (command === "select-tab-from-end-of-tabdeque") {
            const windowId = currentTab.windowId;
            await selectTabFromEndOfDeque(windowId);
        }
    });
});

browser.runtime.onInstalled.addListener(() => {
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
});

browser.contextMenus.onClicked.addListener(
    (info, tab) => {
        if (info.menuItemId === "send-tab-to-end-of-tabdeque") {
            runWithState(() => sendTabToEndOfDeque(tab.windowId, tab.id));
        }
    }
);

browser.tabs.onCreated.addListener(
    (tab) => {
        runWithState(() => {
            const tabId = tab.id;
            const windowId = tab.windowId;
            const currentDeque = backup(getWindowDeques(windowId)).current;

            if (currentDeque.indexOf(tabId) === -1) {
                currentDeque.push(tabId);
            }
        });
    }
);

browser.tabs.onAttached.addListener(
    (tabId, attachInfo) => {
        runWithState(() => {
            const windowId = attachInfo.newWindowId;
            const currentDeque = backup(getWindowDeques(windowId)).current;

            currentDeque.unshift(tabId);
        });
    }
);

browser.tabs.onActivated.addListener(
    (activeInfo) => {
        runWithState(() => {
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
        });
    }
);

browser.tabs.onRemoved.addListener(
    (tabId, removeInfo) => runWithState(() => handleRemove(removeInfo.windowId, tabId))
);

browser.tabs.onDetached.addListener(
    (tabId, detachInfo) => runWithState(() => handleRemove(detachInfo.oldWindowId, tabId))
);

function runWithState(givenFunction) {
    stateQueue = stateQueue
        .catch(() => undefined)
        .then(ensureState)
        .then(givenFunction)
        .then(saveState);
    stateQueue.catch(error => console.error(error));
}

function ensureState() {
    if (statePromise === undefined) {
        statePromise = restoreState().catch(error => {
            statePromise = undefined;
            throw error;
        });
    }

    return statePromise;
}

async function restoreState() {
    const result = await browser.storage.session.get(STATE_STORAGE_KEY);
    const state = result[STATE_STORAGE_KEY];

    if (state && state.deques) {
        deques = state.deques;
        nextTabId = state.nextTabId || undefined;
        return;
    }

    const windowInfoArray = await browser.windows.getAll({
        populate: true,
        windowTypes: ["normal"],
    });
    initializeDeques(windowInfoArray);
}

function saveState() {
    return browser.storage.session.set({
        [STATE_STORAGE_KEY]: {
            deques: deques,
            nextTabId: nextTabId,
        },
    });
}

function sendTabToEndOfDeque(windowId, tabId) {
    const currentDeque = backup(getWindowDeques(windowId)).current;

    removeFromDeque(tabId, currentDeque);
    currentDeque.push(tabId);
    return browser.tabs.update(currentDeque[0], {active: true});
}

function selectTabFromEndOfDeque(windowId) {
    const currentDeque = backup(getWindowDeques(windowId)).current;
    const tabId = currentDeque[currentDeque.length - 1];

    removeFromDeque(tabId, currentDeque);
    currentDeque.unshift(tabId);
    return browser.tabs.update(currentDeque[0], {active: true});
}

function handleRemove(windowId, tabId) {
    const currentDeque = backup(getWindowDeques(windowId)).current;

    const wasFirstAndElementsLeft = removeFromDeque(tabId, currentDeque);
    if (wasFirstAndElementsLeft) {
        nextTabId = currentDeque[0];
        return browser.tabs.update(nextTabId, {active: true});
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
    deques = {};
    for (const windowInfo of windowInfoArray) {
        deques[windowInfo.id] = {
            previous: [],
            current: windowInfo.tabs.map((tab) => { return tab.id; }),
        };
    }
}
