var gTabDeque = {

    deque: undefined,
    selectionChanged: false,

    onLoad: function() {
        if ('undefined' == typeof gBrowser) {
            return;
        }
        window.removeEventListener('load', gTabDeque.onLoad, false);
        window.addEventListener('unload', gTabDeque.onUnload, false);
        window.addEventListener("keyup", gTabDeque.onKeyUp, false);
        // need to listen on window for mousegestures
        window.addEventListener("mouseup", gTabDeque.onMouseUp, false);
        gBrowser.tabContainer.addEventListener("TabOpen", gTabDeque.onTabOpen, false);
        gBrowser.tabContainer.addEventListener("TabSelect", gTabDeque.onTabSelect, false);
        gBrowser.tabContainer.addEventListener("TabClose", gTabDeque.onTabClose, false);
    },

    onUnload: function() {
        window.removeEventListener('unload', gTabDeque.onUnload, false);
        window.removeEventListener("keyup", gTabDeque.onKeyUp, false);
        window.removeEventListener("mouseup", gTabDeque.onMouseUp, false);
        gBrowser.tabContainer.removeEventListener("TabOpen", gTabDeque.onTabOpen, false);
        gBrowser.tabContainer.removeEventListener("TabSelect", gTabDeque.onTabSelect, false);
        gBrowser.tabContainer.removeEventListener("TabClose", gTabDeque.onTabClose, false);
    },

    onTabOpen: function(anEvent) {
        // can't check whether tab is being opened in background - start at the
        // beginning and move to end of deque in onTabSelect if necessary
        gTabDeque.moveTabToDequeBeginning(anEvent.target);
        gBrowser.moveTabTo(anEvent.target, gBrowser.mCurrentTab.nextSibling._tPos);
    },

    onTabSelect: function(anEvent) {
        gTabDeque.moveTabToDequeEnd(anEvent.target);
        gTabDeque.selectionChanged = true;
    },

    onTabClose: function(anEvent) {
        var closingTab = anEvent.target;
        gTabDeque.ensureInitialization();
        gTabDeque.removeTabFromDeque(closingTab);
        if (gTabDeque.deque.length == 0) {
            gTabDeque.mimicAllTabsMinimized();
        } else {
            if (closingTab.selected) {
                var currentIndex = gTabDeque.getTabIndex(closingTab);
                var nextIndex = gTabDeque.getTabIndex(gTabDeque.getNextTab());
                // the closing tab is still there when calculating the index,
                // but not when selecting
                var adjustment = currentIndex < nextIndex ? -1 : 0;
                gBrowser.selectTabAtIndex(nextIndex + adjustment);
            }
        }
    },

    // can't differentiate between click on selected or unselected tab
    // so selectionChanged has to be checked to see whether selection changed
    // the relevant event order is (TabSelect ->) *Down -> *Up -> Click
    onMouseUp: function(anEvent) {
        gTabDeque.ensureInitialization();
        if (anEvent.button == 0 &&
            anEvent.target.nodeName == "tab" &&
            anEvent.target.selected &&
            !gTabDeque.selectionChanged) {
            gTabDeque.minimizeTab(anEvent.target);
        }
        // need this for selecting/closing with mouse: click/mousegesture
        gTabDeque.selectionChanged = false;
    },
    onKeyUp: function(anEvent) {
        // need this for selecting/closing with keyboard
        gTabDeque.selectionChanged = false;
    },

    minimizeTab: function(tab) {
        gTabDeque.removeTabFromDeque(tab);
        var tabToSelect = undefined;
        if (gTabDeque.deque.length == 0) {
            gTabDeque.mimicAllTabsMinimized();
        } else {
            gBrowser.selectTabAtIndex(gTabDeque.getTabIndex(gTabDeque.getNextTab()));
        }
    },

    mimicAllTabsMinimized: function() {
        document.getElementById("cmd_newNavigatorTab").doCommand();
    },
    moveTabToDequeBeginning: function(tab) {
        gTabDeque.ensureInitialization();
        // getting duplicates sometimes...
        gTabDeque.removeTabFromDeque(tab);
        gTabDeque.deque.unshift(tab);
    },

    moveTabToDequeEnd: function(tab) {
        gTabDeque.ensureInitialization();
        // getting duplicates sometimes...
        gTabDeque.removeTabFromDeque(tab);
        gTabDeque.deque.push(tab);
    },

    // can't be sure that events are fired for all tabs on startup
    // tabs are missing if initialized too early, use this before first access
    ensureInitialization: function() {
        if (!gTabDeque.deque) {
            gTabDeque.initDeque();
            gTabDeque.selectionChanged = false;
        }
    },

    initDeque: function() {
        gTabDeque.deque = new Array();
        for (var tabIndex = 0; tabIndex < gBrowser.tabs.length; tabIndex++) {
            gTabDeque.deque.push(gBrowser.tabs[tabIndex]);
        }
        return gTabDeque.deque;
    },

    removeTabFromDeque: function(tab) {
        var dequeIndex = gTabDeque.deque.indexOf(tab)
        if (gTabDeque.deque.indexOf(tab) >= 0) {
            gTabDeque.deque.splice(gTabDeque.deque.indexOf(tab), 1);
        }
    },

    getTabIndex: function(givenTab) {
        for (var tabIndex = 0; tabIndex < gBrowser.tabs.length; tabIndex++) {
            if (gBrowser.tabs[tabIndex] === givenTab) {
                return tabIndex;
            }
        }
        return -1;
    },

    getNextTab: function() {
        return gTabDeque.deque[gTabDeque.deque.length - 1];
    },

    // for debugging
    getDequeURLs: function() {
        var urls = new Array();
        var length = gTabDeque.deque.length
        for (var tabIndex = 0; tabIndex < gTabDeque.deque.length; tabIndex++) {
            urls.push(gTabDeque.getTabURL(gTabDeque.deque[tabIndex]));
        }
        return urls;
    },

    getTabURL: function(tab) {
        var browser = gBrowser.getBrowserForTab(tab);
        return browser.currentURI.spec;
    }
};

window.addEventListener('load', gTabDeque.onLoad, false);

