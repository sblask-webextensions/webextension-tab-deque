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
        // TabSelect is triggered on the mimic when minimizing or closing the
        // last not minimized tab, but we don't want to add it to the deque
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
            // have to use mouseup and mouseup instead of click as selecting a
            // tab would minimize it again immediately otherwise
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
        // open a new tab if there aren't any minimized or other tabs
        // show special tab if all tabs are minimized
        // jump to next tab in deque if there are tabs that are no minimized
        if (gTabDeque.deque.length == 0 && gBrowser.tabs.length <= 2) {
            gTabDeque.openTab();
        } else if (gTabDeque.deque.length == 0) {
            gTabDeque.mimicAllTabsMinimized();
        } else if (closingTab.selected) {
            var currentIndex = gTabDeque.getTabIndex(closingTab);
            var nextIndex = gTabDeque.getTabIndex(gTabDeque.getNextTab());
            // the closing tab is still there when calculating the index,
            // but not when selecting, so need adjustment
            var adjustment = currentIndex < nextIndex ? -1 : 0;
            gBrowser.selectTabAtIndex(nextIndex + adjustment);
        }
    },

    minimizeCurrentTab: function() {
        gTabDeque.minimizeTab(gBrowser.selectedTab);
    },

    minimizeTab: function(tab) {
        gTabDeque.ensureInitialization();
        gTabDeque.removeTabFromDeque(tab);
        if (gTabDeque.deque.length == 0) {
            gTabDeque.mimicAllTabsMinimized();
        } else {
            var nextTabIndex = gTabDeque.getTabIndex(gTabDeque.getNextTab());
            gBrowser.selectTabAtIndex(nextTabIndex);
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

    progressListener: function(browser) {
        return { 
            QueryInterface: XPCOMUtils.generateQI([
                "nsIWebProgressListener",
                "nsISupportsWeakReference"
            ]),

            onStateChange: function(
                    aWebProgress, aRequest, aStateFlags, aStatus){
                // abort at the very beginning if at all
                if (aStateFlags & Ci.nsIWebProgressListener.STATE_START) {
                    // originalURI is not consistently available
                    if (!aRequest.originalURI) {
                        aRequest.QueryInterface(
                            Components.interfaces.nsIChannel);
                    }
                    var currentURI = browser.currentURI.asciiSpec;
                    var requestedURI = aRequest.originalURI.asciiSpec;
                    // ignore reloads
                    if (currentURI == requestedURI) {
                        return;
                    }
                    // redirect request into new tab
                    aRequest.cancel(Components.results.NS_BINDING_ABORTED);
                    gBrowser.loadOneTab(
                        aRequest.name, null, null, null, false, false);
                }
            }
        }
    },

    letTabOpenLinksInNewTab: function(tab) {
        var browser = gBrowser.getBrowserForTab(tab);
        var listener = gTabDeque.progressListener(browser);
        // keep reference, listener seems to be garbage collected otherwise
        gTabDeque.progressListenerInstance = listener;
        browser.addProgressListener(
            listener,
            Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT
        );
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
            document.getElementById('nav-bar').collapsed = true;
        } else {
            var mimicIndex =
                gTabDeque.getTabIndex(gTabDeque.allTabsMinimizedMimic);
            gBrowser.selectTabAtIndex(mimicIndex);
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

