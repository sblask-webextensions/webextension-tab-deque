var gTabDeque = {

    deque: undefined,
    currentlySelectedTab: undefined,

    mimickingAllTabMinimized: false,
    allTabsMinimizedMimic: undefined,

    onLoad: function() {
        if ('undefined' == typeof gBrowser) {
            return;
        }
        window.removeEventListener('load', gTabDeque.onLoad, false);
        window.addEventListener('SSWindowClosing', gTabDeque.onClose, false);
        window.addEventListener('unload', gTabDeque.onUnload, false);
        gBrowser.tabContainer.addEventListener("TabOpen", gTabDeque.onTabOpen, false);
        gBrowser.tabContainer.addEventListener("TabSelect", gTabDeque.onTabSelect, false);
        gBrowser.tabContainer.addEventListener("TabClose", gTabDeque.onTabClose, false);

        // TabSelect is not always called when tabs are being restored
        gTabDeque.handleTabListeners(gBrowser.selectedTab);
    },

    onClose: function() {
        // we don't want the mimic to be restored after restart...
        if (gTabDeque.allTabsMinimizedMimic) {
            // we need at least one tab unminimized, otherwise the mimic would
            // be restored right away
            gTabDeque.maximizeNextMinimizedTab();
            gBrowser.unpinTab(gTabDeque.allTabsMinimizedMimic);
            gBrowser.removeTab(gTabDeque.allTabsMinimizedMimic);
        }
    },

    onUnload: function() {
        window.removeEventListener('unload', gTabDeque.onUnload, false);
        window.removeEventListener('close', gTabDeque.onClose, false);
        gBrowser.tabContainer.removeEventListener("TabOpen", gTabDeque.onTabOpen, false);
        gBrowser.tabContainer.removeEventListener("TabSelect", gTabDeque.onTabSelect, false);
        gBrowser.tabContainer.removeEventListener("TabClose", gTabDeque.onTabClose, false);

        gTabDeque.handleTabListeners(undefined);
    },

    onTabOpen: function(anEvent) {
        if (!gTabDeque.mimickingAllTabMinimized) {
            var tab = anEvent.target;
            // can't check whether tab is being opened in background - start at
            // beginning and move to end of deque in onTabSelect if necessary
            gTabDeque.moveTabToDequeBeginning(tab);
            gBrowser.moveTabTo(tab, gBrowser.mCurrentTab.nextSibling._tPos);
        }
    },

    onTabSelect: function(anEvent) {
        gTabDeque.handleTabListeners(anEvent.target)
        // TabSelect is triggered when opening the mimic the first time and
        // when closing the last not minimized tab, but we don't want to add it
        // to the deque
        if (!gTabDeque.mimickingAllTabMinimized &&
            anEvent.target !== gTabDeque.allTabsMinimizedMimic) {
            gTabDeque.moveTabToDequeEnd(anEvent.target);
        }
        if (anEvent.target === gTabDeque.allTabsMinimizedMimic) {
            document.getElementById('nav-bar').collapsed = true;
        } else {
            document.getElementById('nav-bar').collapsed = false;
        }
    },

    handleTabListeners: function(tab) {
        if (gTabDeque.currentlySelectedTab) {
            gTabDeque.currentlySelectedTab.removeEventListener("mousedown", gTabDeque.onSelectedTabMouseDown, false);
            gTabDeque.currentlySelectedTab.removeEventListener("mouseup", gTabDeque.onSelectedTabMouseUp, false);
        }
        if (tab){
            gTabDeque.currentlySelectedTab = tab
            gTabDeque.currentlySelectedTab.hasMouseDown = false
            // have to split this up, otherwise click would be triggered even
            // on freshly selected tab
            gTabDeque.currentlySelectedTab.addEventListener("mousedown", gTabDeque.onSelectedTabMouseDown, false);
            gTabDeque.currentlySelectedTab.addEventListener("mouseup", gTabDeque.onSelectedTabMouseUp, false);
        }
    },

    onSelectedTabMouseDown: function(anEvent) {
        var tab = anEvent.target;
        if (anEvent.button == 0) {
            tab.hasMouseDown = true;
        }
    },

    onSelectedTabMouseUp: function(anEvent) {
        var tab = anEvent.target;
        if (tab.hasMouseDown && anEvent.button == 0) {
            gTabDeque.ensureInitialization();
            gTabDeque.minimizeTab(anEvent.target);
            tab.hasMouseDown = false;
        }
    },

    onTabClose: function(anEvent) {
        var closingTab = anEvent.target;
        gTabDeque.ensureInitialization();
        gTabDeque.removeTabFromDeque(closingTab);
        if (gTabDeque.deque.length == 0 && gBrowser.tabs.length <= 2) {
            // there aren't any minimized tabs
            gTabDeque.openTab();
        } else if (gTabDeque.deque.length == 0) {
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

    minimizeCurrentTab: function() {
        gTabDeque.minimizeTab(gBrowser.selectedTab);
    },

    minimizeTab: function(tab) {
        gTabDeque.removeTabFromDeque(tab);
        if (gTabDeque.deque.length == 0) {
            gTabDeque.mimicAllTabsMinimized();
        } else {
            gBrowser.selectTabAtIndex(gTabDeque.getTabIndex(gTabDeque.getNextTab()));
        }
    },

    maximizeNextMinimizedTab: function() {    
        for (var tabIndex = 0; tabIndex < gBrowser.tabs.length; tabIndex++) {
            visibleTab = gBrowser.tabs[tabIndex];
            if (visibleTab != gTabDeque.allTabsMinimizedMimic &&
                gTabDeque.deque.indexOf(visibleTab) == -1
                ) {
                gBrowser.selectTabAtIndex(gTabDeque.getTabIndex(visibleTab));
                return;
            }
        }
    },

    openTab: function(anEvent) {
        var preferences = Components
            .classes['@mozilla.org/preferences-service;1']
            .getService(Components.interfaces.nsIPrefBranch);
        var url = preferences.getCharPref("browser.newtab.url");
        return gBrowser.loadOneTab(url, null, null, null, false, false);
    },

    letTabOpenLinksInNewTab: function(tab) {
        var progressListener = {
            onStateChange: function(aBrowser, aWebProgress, aRequest, aStateFlags, aStatus){
                // abort at the very beginning
                if (aStateFlags & Ci.nsIWebProgressListener.STATE_START) {
                    // open links in new tab while allowing reload
                    if (aBrowser === gBrowser.getBrowserForTab(tab) &&
                        aRequest.originalURI.asciiSpec != gBrowser.getBrowserForTab(tab).currentURI.asciiSpec
                    ) {
                        aRequest.cancel(Components.results.NS_BINDING_ABORTED);
                        gBrowser.loadOneTab(aRequest.name, null, null, null, false, false);
                    }
                }
            }
        }
        gBrowser.addTabsProgressListener(progressListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE);
    },

    mimicAllTabsMinimized: function() {
        if (!gTabDeque.allTabsMinimizedMimic) {
            gTabDeque.mimickingAllTabMinimized = true;
            gTabDeque.allTabsMinimizedMimic = gTabDeque.openTab();
            gTabDeque.letTabOpenLinksInNewTab(gTabDeque.allTabsMinimizedMimic);
            gTabDeque.mimickingAllTabMinimized = false;
            gTabDeque.allTabsMinimizedMimic.collapsed = true;
            gTabDeque.allTabsMinimizedMimic.disabled = true;
            gBrowser.pinTab(gTabDeque.allTabsMinimizedMimic);
            // TabSelect is triggered before gTabDeque.allTabsMinimizedMimic is set
            document.getElementById('nav-bar').collapsed = true;
        } else {
            gBrowser.selectTabAtIndex(gTabDeque.getTabIndex(gTabDeque.allTabsMinimizedMimic));
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

    // can't be sure that events are fired for all tabs on startup
    // tabs are missing if initialized too early, use this before first access
    ensureInitialization: function() {
        if (!gTabDeque.deque) {
            gTabDeque.initDeque();
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

