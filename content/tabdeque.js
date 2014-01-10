var gTabDeque = {

    deque: undefined,
    // apparently one can't listen to click on tab directly and listening on tab
    // container fires the event after TabSelect, so we need this to figure out
    // whether it was a click on the current tab
    lastSelectedTab: undefined,

    onLoad: function() {
	    if ('undefined' == typeof gBrowser) {
	        return;
	    }
	    window.removeEventListener('load', gTabDeque.onLoad, false);
	    window.addEventListener('unload', gTabDeque.onUnload, false);
	    gBrowser.tabContainer.addEventListener("TabOpen", gTabDeque.onTabOpen, false);
	    gBrowser.tabContainer.addEventListener("TabSelect", gTabDeque.onTabSelect, false);
	    gBrowser.tabContainer.addEventListener("TabClose", gTabDeque.onTabClose, false);
	    gBrowser.tabContainer.addEventListener("click", gTabDeque.onClick, false);
    },

    onUnload: function() {
	    window.removeEventListener('unload', gTabDeque.onUnload, false);
	    gBrowser.tabContainer.removeEventListener("TabOpen", gTabDeque.onTabOpen, false);
	    gBrowser.tabContainer.removeEventListener("TabSelect", gTabDeque.onTabSelect, false);
	    gBrowser.tabContainer.removeEventListener("TabClose", gTabDeque.onTabClose, false);
	    gBrowser.tabContainer.removeEventListener("click", gTabDeque.onClick, false);
    },

    onTabOpen: function(anEvent) {
        // can't check whether tab is being opened in background - start at the
        // beginning and move to end of deque in onTabSelect if necessary
        gTabDeque.moveTabToDequeBeginning(anEvent.target);
	    gBrowser.moveTabTo(anEvent.target, gBrowser.mCurrentTab.nextSibling._tPos);
    },

    onTabSelect: function(anEvent) {
        gTabDeque.moveTabToDequeEnd(anEvent.target);
    },

    onTabClose: function(anEvent) {
        var closingTab = anEvent.target;
        gTabDeque.ensureInitialization();
        if (closingTab.selected) {
            gTabDeque.deque.pop();
            var currentIndex = gTabDeque.getTabIndex(closingTab);
            var nextIndex = gTabDeque.getTabIndex(gTabDeque.getNextTab());
            // the closing tab is still there when calculating the index,
            // but not when selecting
            var adjustment = currentIndex < nextIndex ? -1 : 0;
            gBrowser.selectTabAtIndex(nextIndex + adjustment);
        } else {
            gTabDeque.removeTabFromDeque(closingTab);
        }
    },

    onClick: function(anEvent) {
        var clickedTab = anEvent.target;
        gTabDeque.ensureInitialization();
        if (clickedTab == gTabDeque.lastSelectedTab) {
            var newlySelectedTab = gTabDeque.minimizeTab(clickedTab);
            gTabDeque.lastSelectedTab = newlySelectedTab
        } else {
            gTabDeque.lastSelectedTab = clickedTab;
        }
    },

    minimizeTab: function(tab) {
        gTabDeque.removeTabFromDeque(tab);
        var nextTab = gTabDeque.getNextTab();
        gBrowser.selectTabAtIndex(gTabDeque.getTabIndex(nextTab));
        return nextTab;
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
        }
        if (!gTabDeque.lastSelectedTab) {
            gTabDeque.lastSelectedTab = gBrowser.mCurrentTab
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

