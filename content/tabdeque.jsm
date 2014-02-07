Components.utils.import("resource://gre/modules/devtools/Console.jsm");

EXPORTED_SYMBOLS = ["TabDeque"];

function TabDeque() {
    this.deque = undefined;
    this.currentlySelectedTab = undefined;

    this.mimickingAllTabMinimized = false;
    this.allTabsMinimizedMimic = undefined;

    this.keyset = undefined;

    this.makeKeyset = function() {
        var namespace =
            "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        this.keyset =
            this.domWindow.document.createElementNS(namespace, "keyset");
        this.keyset.setAttribute("id", "tabdequeKeyset");
        var mainKeyset = this.domWindow.document.getElementById("mainKeyset");
        mainKeyset.parentNode.appendChild(this.keyset)
    }

    this.removeKeyboardShortcuts = function() {
        if (this.keyset) {
            this.keyset.parentNode.removeChild(this.keyset);
            this.keyset = undefined;
        }
    }

    this.makeKeyboardShortcutElement = function(id, keycode, modifiers, fun) {
        var element = this.domWindow.document.createElement("key");
        element.setAttribute("id", id);
        element.setAttribute("keycode", keycode);
        element.setAttribute("modifiers", modifiers);
        element.setAttribute("oncommand", "void(0);");
        element.addEventListener("command", fun, true);
        return element;
    }

    this.addKeyboardShortcuts = function() {
        this.makeKeyset();
        var minimizeElement = this.makeKeyboardShortcutElement(
            "tabdeque-minimize-current-tab",
            "VK_PAGE_DOWN",
            "shift",
            this.minimizeCurrentTab.bind(this)
        );
        this.keyset.appendChild(minimizeElement);
        var maximizeElement = this.makeKeyboardShortcutElement(
            "tabdeque-maximize-next-minimized-tab",
            "VK_PAGE_UP",
            "shift",
            this.maximizeNextMinimizedTab.bind(this)
        );
        this.keyset.appendChild(maximizeElement);
    }

    this.initialize = function(domWindow) {
        if (!domWindow ||
            !domWindow.gBrowser ||
            !domWindow.gBrowser.tabContainer) {
            return;
        }
        this.domWindow = domWindow;
        this.gBrowser = domWindow.gBrowser;
        this.tabContainer = domWindow.gBrowser.tabContainer;

        this.domWindow.addEventListener('SSWindowClosing', this.onClose, false);
        this.tabContainer.addEventListener("TabOpen", this.onTabOpen, false);
        this.tabContainer.addEventListener("TabSelect", this.onTabSelect, false);
        this.tabContainer.addEventListener("TabClose", this.onTabClose, false);

        // TabSelect is not always called when tabs are being restored
        this.handleTabListeners(this.gBrowser.selectedTab);

        this.addKeyboardShortcuts();
    }

    this.destroyMimic = function() {
        // we don't want the mimic to be restored after restart...
        if (this.allTabsMinimizedMimic) {
            // we need at least one tab unminimized, otherwise the mimic would
            // be restored right away
            this.maximizeNextMinimizedTab();
            this.gBrowser.unpinTab(this.allTabsMinimizedMimic);
            this.gBrowser.removeTab(this.allTabsMinimizedMimic);
        }
    }

    this.onClose = function() {
        this.destroyMimic()
    }.bind(this)

    this.destroy = function() {
        if (!this.domWindow ||
            !this.domWindow.gBrowser ||
            !this.domWindow.gBrowser.tabContainer) {
            return;
        }

        this.removeKeyboardShortcuts();

        this.domWindow.removeEventListener('SSWindowClosing', this.onClose, false);
        this.tabContainer.removeEventListener("TabOpen", this.onTabOpen, false);
        this.tabContainer.removeEventListener("TabSelect", this.onTabSelect, false);
        this.tabContainer.removeEventListener("TabClose", this.onTabClose, false);

        this.handleTabListeners(undefined);

        this.destroyMimic();
    }

    this.onTabOpen = function(anEvent) {
        if (!this.mimickingAllTabMinimized) {
            var tab = anEvent.target;
            // can't check whether tab is being opened in background - start at
            // beginning and move to end of deque in onTabSelect if necessary
            this.moveTabToDequeBeginning(tab);
            this.gBrowser.moveTabTo(tab, this.gBrowser.mCurrentTab.nextSibling._tPos);
        }
    }.bind(this)

    this.onTabSelect = function(anEvent) {
        this.handleTabListeners(anEvent.target)
        // TabSelect is triggered on the mimic when minimizing or closing the
        // last not minimized tab, but we don't want to add it to the deque
        if (!this.mimickingAllTabMinimized &&
            anEvent.target !== this.allTabsMinimizedMimic) {
            this.moveTabToDequeEnd(anEvent.target);
        }
        if (anEvent.target === this.allTabsMinimizedMimic) {
            this.domWindow.document.getElementById('nav-bar').collapsed = true;
        } else {
            this.domWindow.document.getElementById('nav-bar').collapsed = false;
        }
    }.bind(this)

    this.handleTabListeners = function(tab) {
        if (this.currentlySelectedTab) {
            this.currentlySelectedTab.removeEventListener("mousedown", this.onSelectedTabMouseDown, false);
            this.currentlySelectedTab.removeEventListener("mouseup", this.onSelectedTabMouseUp, false);
        }
        if (tab){
            this.currentlySelectedTab = tab
            this.currentlySelectedTab.hasMouseDown = false
            // have to use mouseup and mouseup instead of click as selecting a
            // tab would minimize it again immediately otherwise
            this.currentlySelectedTab.addEventListener("mousedown", this.onSelectedTabMouseDown, false);
            this.currentlySelectedTab.addEventListener("mouseup", this.onSelectedTabMouseUp, false);
        }
    }

    this.onSelectedTabMouseDown = function(anEvent) {
        var tab = anEvent.target;
        if (anEvent.button == 0) {
            tab.hasMouseDown = true;
        }
    }.bind(this)

    this.onSelectedTabMouseUp = function(anEvent) {
        var tab = anEvent.target;
        if (tab.hasMouseDown && anEvent.button == 0) {
            this.ensureInitialization();
            this.minimizeTab(anEvent.target);
            tab.hasMouseDown = false;
        }
    }.bind(this)

    this.onTabClose = function(anEvent) {
        var closingTab = anEvent.target;
        this.ensureInitialization();
        this.removeTabFromDeque(closingTab);
        // open a new tab if there aren't any minimized or other tabs
        // show special tab if all tabs are minimized
        // jump to next tab in deque if there are tabs that are no minimized
        var openTabCount = this.allTabsMinimizedMimic ? -1 : 0
        openTabCount += this.gBrowser.tabs.length;
        var allTabsMinimized = this.deque.length == 0;
        if (openTabCount <= 1) {
            this.openTab();
        } else if (allTabsMinimized) {
            this.mimicAllTabsMinimized();
        } else if (closingTab.selected) {
            var currentIndex = this.getTabIndex(closingTab);
            var nextIndex = this.getTabIndex(this.getNextTab());
            // the closing tab is still there when calculating the index,
            // but not when selecting, so need adjustment
            var adjustment = currentIndex < nextIndex ? -1 : 0;
            this.gBrowser.selectTabAtIndex(nextIndex + adjustment);
        }
    }.bind(this)

    this.minimizeCurrentTab = function() {
        this.minimizeTab(this.gBrowser.selectedTab);
    }

    this.minimizeTab = function(tab) {
        this.ensureInitialization();
        this.removeTabFromDeque(tab);
        if (this.deque.length == 0) {
            this.mimicAllTabsMinimized();
        } else {
            var nextTabIndex = this.getTabIndex(this.getNextTab());
            this.gBrowser.selectTabAtIndex(nextTabIndex);
        }
    }

    this.maximizeNextMinimizedTab = function() {
        var tabs = this.gBrowser.tabs;
        for (var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            var maybeMinimizedTab = tabs[tabIndex];
            if (maybeMinimizedTab != this.allTabsMinimizedMimic &&
                this.deque.indexOf(maybeMinimizedTab) == -1
                ) {
                var minimizedTabIndex = this.getTabIndex(maybeMinimizedTab);
                this.gBrowser.selectTabAtIndex(minimizedTabIndex);
                return;
            }
        }
    }

    this.openTab = function(anEvent) {
        var preferences = Components
            .classes['@mozilla.org/preferences-service;1']
            .getService(Components.interfaces.nsIPrefBranch);
        var url = preferences.getCharPref("browser.newtab.url");
        return this.gBrowser.loadOneTab(url, {inBackground: false});
    }

    this.progressListener = function(browser) {
        Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
        const START = Components.interfaces.nsIWebProgressListener.STATE_START;
        return {
            QueryInterface: XPCOMUtils.generateQI([
                "nsIWebProgressListener",
                "nsISupportsWeakReference"
            ]),

            onStateChange: function(
                    aWebProgress, aRequest, aStateFlags, aStatus){
                // abort at the very beginning if at all
                if (aStateFlags & START) {
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
                    this.gBrowser.loadOneTab(
                        aRequest.name, null, null, null, false, false);
                }
            }.bind(this)
        }
    }

    this.letTabOpenLinksInNewTab = function(tab) {
        var browser = this.gBrowser.getBrowserForTab(tab);
        var listener = this.progressListener(browser);
        // keep reference, listener seems to be garbage collected otherwise
        this.progressListenerInstance = listener;
        browser.addProgressListener(
            listener,
            Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT
        );
    }

    this.mimicAllTabsMinimized = function() {
        if (!this.allTabsMinimizedMimic) {
            this.mimickingAllTabMinimized = true;
            this.allTabsMinimizedMimic = this.openTab();
            this.letTabOpenLinksInNewTab(this.allTabsMinimizedMimic);
            this.mimickingAllTabMinimized = false;
            this.allTabsMinimizedMimic.collapsed = true;
            this.allTabsMinimizedMimic.disabled = true;
            this.gBrowser.pinTab(this.allTabsMinimizedMimic);
            this.domWindow.document.getElementById('nav-bar').collapsed = true;
        } else {
            var mimicIndex =
                this.getTabIndex(this.allTabsMinimizedMimic);
            this.gBrowser.selectTabAtIndex(mimicIndex);
        }
    }

    this.moveTabToDequeBeginning = function(tab) {
        this.ensureInitialization();
        // getting duplicates sometimes...
        this.removeTabFromDeque(tab);
        this.deque.unshift(tab);
    }

    this.moveTabToDequeEnd = function(tab) {
        this.ensureInitialization();
        // getting duplicates sometimes...
        this.removeTabFromDeque(tab);
        this.deque.push(tab);
    }

    // can't be sure that events are fired for all tabs on startup
    // tabs are missing if initialized too early, use this before first access
    this.ensureInitialization = function() {
        if (!this.deque) {
            this.initDeque();
        }
    }

    this.initDeque = function() {
        this.deque = new Array();
        var tabs = this.gBrowser.tabs;
        for (var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            this.deque.push(tabs[tabIndex]);
        }
        return this.deque;
    }

    this.removeTabFromDeque = function(tab) {
        var dequeIndex = this.deque.indexOf(tab)
        if (this.deque.indexOf(tab) >= 0) {
            this.deque.splice(this.deque.indexOf(tab), 1);
        }
    }

    this.getTabIndex = function(givenTab) {
        var tabs = this.gBrowser.tabs;
        for (var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            if (tabs[tabIndex] === givenTab) {
                return tabIndex;
            }
        }
        return -1;
    }

    this.getNextTab = function() {
        return this.deque[this.deque.length - 1];
    }

    // for debugging
    this.getDequeURLs = function() {
        var urls = new Array();
        var length = this.deque.length
        for (var tabIndex = 0; tabIndex < this.deque.length; tabIndex++) {
            urls.push(this.getTabURL(this.deque[tabIndex]));
        }
        return urls;
    }

    this.getTabURL = function(tab) {
        var browser = this.gBrowser.getBrowserForTab(tab);
        return browser.currentURI.spec;
    }
};

