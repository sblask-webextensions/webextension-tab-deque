let deques = {};

browser.tabs.onCreated.addListener(
    (tab) => {
        let tabId = tab.id;
        let windowId = tab.windowId;
        let currentDeque = backup(getWindowDeques(windowId)).current;

        currentDeque.push(tabId);
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

function handleRemove(windowId, tabId) {
    let windowDeques = getWindowDeques(windowId);
    windowDeques.current = windowDeques.previous.slice();
    let currentDeque = windowDeques.current;

    let wasFirstAndElementsLeft = removeFromDeque(tabId, currentDeque);
    if (wasFirstAndElementsLeft) {
        browser.tabs.update(currentDeque[0], {active: true});
    }
}

function getWindowDeques(windowId) {
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
