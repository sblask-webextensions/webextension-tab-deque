var gTabDeque = {

    deque: undefined,

    onLoad: function() {
	    if ('undefined' == typeof gBrowser) {
	        return;
	    }
	    window.removeEventListener('load', gTabDeque.onLoad, false);
	    window.addEventListener('unload', gTabDeque.onUnload, false);
	    gBrowser.tabContainer.addEventListener("TabClose", gTabDeque.onTabClose, false);
	    gBrowser.tabContainer.addEventListener("TabOpen", gTabDeque.onTabOpen, false);
	    gBrowser.tabContainer.addEventListener("TabSelect", gTabDeque.onTabSelect, false);
    },

    onUnload: function() {
	    window.removeEventListener('unload', gTabDeque.onUnload, false);
	    gBrowser.tabContainer.removeEventListener("TabClose", gTabDeque.onTabClose, false);
	    gBrowser.tabContainer.removeEventListener("TabOpen", gTabDeque.onTabOpen, false);
	    gBrowser.tabContainer.removeEventListener("TabSelect", gTabDeque.onTabSelect, false);
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

    // tabs are missing if initialized too early, use this before first access
    ensureInitialization: function() {
	    if (!gTabDeque.deque) {
            gTabDeque.initDeque();
            return true;
        } else {
            return false;
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

