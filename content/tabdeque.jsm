Components.utils.import("resource://gre/modules/devtools/Console.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

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
        mainKeyset.parentNode.appendChild(this.keyset);
    };

    this.removeKeyboardShortcuts = function() {
        if (this.keyset) {
            this.keyset.parentNode.removeChild(this.keyset);
            this.keyset = undefined;
        }
    };

    this.makeKeyboardShortcutElement = function(id, keycode, modifiers, fun) {
        var element = this.domWindow.document.createElement("key");
        element.setAttribute("id", id);
        element.setAttribute("keycode", keycode);
        element.setAttribute("modifiers", modifiers);
        element.setAttribute("oncommand", "void(0);");
        element.addEventListener("command", fun, true);
        return element;
    };

    this.addKeyboardShortcuts = function() {
        this.makeKeyset();
        var minimizeElement =
            this.makeKeyboardShortcutElement(
                "tabdeque-minimize-current-tab",
                "VK_PAGE_DOWN",
                "shift",
                this.minimizeCurrentTab.bind(this)
            );
        this.keyset.appendChild(minimizeElement);
        var maximizeElement =
            this.makeKeyboardShortcutElement(
                "tabdeque-maximize-next-minimized-tab",
                "VK_PAGE_UP",
                "shift",
                this.selectNextMinimizedTab.bind(this)
            );
        this.keyset.appendChild(maximizeElement);
        var sendCurrentTabToBackgroundElement =
            this.makeKeyboardShortcutElement(
                "tabdeque-send-current-tab-to-background",
                "VK_PAGE_DOWN",
                "accel alt",
                this.sendCurrentTabToBackground.bind(this)
            );
        this.keyset.appendChild(sendCurrentTabToBackgroundElement);
        var selectLastTabOfDequeElement =
            this.makeKeyboardShortcutElement(
                "tabdeque-select-last-tab-of-deque",
                "VK_PAGE_UP",
                "accel alt",
                this.selectLastTabOfDeque.bind(this)
            );
        this.keyset.appendChild(selectLastTabOfDequeElement);
    };

    this.initialize = function(domWindow) {
        if (!domWindow ||
            !domWindow.gBrowser ||
            !domWindow.gBrowser.tabContainer) {
            return;
        }
        this.domWindow = domWindow;
        this.gBrowser = domWindow.gBrowser;
        this.tabContainer = domWindow.gBrowser.tabContainer;

        // we don't want the mimic to be restored after restart...
        this.domWindow.addEventListener('SSWindowClosing', this.onClose);
        this.tabContainer.addEventListener("TabOpen", this.onTabOpen);
        this.tabContainer.addEventListener("TabSelect", this.onTabSelect);
        this.tabContainer.addEventListener("TabClose", this.onTabClose);

        // TabSelect is not always called when tabs are being restored
        this.handleTabListeners(this.gBrowser.selectedTab);

        this.addKeyboardShortcuts();
    };

    this.destroyMimic = function() {
        if (this.allTabsMinimizedMimic) {
            // we need at least one tab unminimized and allTabsMinimizedMimic
            // undefined, otherwise the mimic would be recreated right away
            this.selectNextMinimizedTab();
            var mimic = this.allTabsMinimizedMimic;
            this.allTabsMinimizedMimic = undefined;
            this.gBrowser.unpinTab(mimic);
            this.gBrowser.removeTab(mimic);
        }
    };

    this.onClose = function() {
        this.destroyMimic();
    }.bind(this);

    this.destroy = function() {
        if (!this.domWindow ||
            !this.domWindow.gBrowser ||
            !this.domWindow.gBrowser.tabContainer) {
            return;
        }

        this.removeKeyboardShortcuts();

        this.domWindow.removeEventListener('SSWindowClosing', this.onClose);
        this.tabContainer.removeEventListener("TabOpen", this.onTabOpen);
        this.tabContainer.removeEventListener("TabSelect", this.onTabSelect);
        this.tabContainer.removeEventListener("TabClose", this.onTabClose);

        this.handleTabListeners(undefined);

        this.destroyMimic();
    };

    this.onTabOpen = function(anEvent) {
        if (this.mimickingAllTabMinimized) {
            // mimic should not be added to deque
            return;
        }
        var tab = anEvent.target;
        // Can't check whether tab is being opened in background - assume here
        // it is. It's moved beginning of deque in onTabSelect if it was opened
        // in foreground.
        this.moveTabToDequeEnd(tab);
        if (Services.prefs.getBoolPref("extensions.tabdeque.openTabsNextToCurrent")) {
            this.gBrowser.moveTabTo(tab, this.gBrowser.mCurrentTab.nextSibling._tPos);
        }
    }.bind(this);

    this.onTabSelect = function(anEvent) {
        this.handleTabListeners(anEvent.target);
        // TabSelect is triggered on the mimic when minimizing or closing the
        // last not minimized tab, but we don't want to add it to the deque
        if (!this.mimickingAllTabMinimized &&
            anEvent.target !== this.allTabsMinimizedMimic) {
            this.moveTabToDequeFront(anEvent.target);
        }
        if (anEvent.target === this.allTabsMinimizedMimic) {
            this.domWindow.document.getElementById('nav-bar').hidden = true;
        } else {
            this.domWindow.document.getElementById('nav-bar').hidden = false;
        }
    }.bind(this);

    this.handleTabListeners = function(tab) {
        if (this.currentlySelectedTab) {
            this.currentlySelectedTab.removeEventListener(
                "mousedown",
                this.onSelectedTabMouseDown
            );
            this.currentlySelectedTab.removeEventListener(
                "mouseup",
                this.onSelectedTabMouseUp
            );
        }
        if (tab){
            this.currentlySelectedTab = tab;
            this.currentlySelectedTab.hasMouseDown = false;
            // have to use mouseup and mouseup instead of click as selecting a
            // tab would minimize it again immediately otherwise
            this.currentlySelectedTab.addEventListener(
                "mousedown",
                this.onSelectedTabMouseDown
            );
            this.currentlySelectedTab.addEventListener(
                "mouseup",
                this.onSelectedTabMouseUp
            );
        }
    };

    this.onSelectedTabMouseDown = function(anEvent) {
        if (anEvent.originalTarget.className !== 'tab-close-button') {
            var tab = anEvent.target;
            if (anEvent.button === 0) {
                tab.hasMouseDown = true;
            }
        }
    }.bind(this);

    this.onSelectedTabMouseUp = function(anEvent) {
        var tab = anEvent.target;
        if (tab.hasMouseDown && anEvent.button === 0) {
            this.ensureInitialization();
            this.minimizeTab(
                anEvent.target,
                Services.prefs.getBoolPref("extensions.tabdeque.clickToBackground")
            );
            tab.hasMouseDown = false;
        }
    }.bind(this);

    this.onTabClose = function(anEvent) {
        var closingTab = anEvent.target;
        this.ensureInitialization();
        this.removeFromDeque(closingTab);
        // open a new tab if there aren't any minimized or other tabs
        // show special tab if all tabs are minimized
        // jump to next tab in deque if there are tabs that are no minimized
        var openTabCount = this.allTabsMinimizedMimic ? -1 : 0;
        openTabCount += this.gBrowser.tabs.length;
        var allTabsMinimized = this.isDequeEmpty();
        if (openTabCount <= 1) {
            this.openTab();
        } else if (allTabsMinimized) {
            this.mimicAllTabsMinimized();
        } else if (closingTab.selected) {
            var currentIndex = this.getTabBarIndex(closingTab);
            var nextIndex = this.getTabBarIndex(this.getFirstFromDeque());
            // the closing tab is still there when calculating the index,
            // but not when selecting, so need adjustment
            var adjustment = currentIndex < nextIndex ? -1 : 0;
            this.gBrowser.selectTabAtIndex(nextIndex + adjustment);
        }
    }.bind(this);

    this.minimizeCurrentTab = function() {
        this.minimizeTab(this.gBrowser.selectedTab, false);
    };

    this.sendCurrentTabToBackground = function() {
        this.minimizeTab(this.gBrowser.selectedTab, true);
    };

    this.selectLastTabOfDeque = function() {
        this.ensureInitialization();
        if (this.isDequeEmpty()) {
            return;
        }
        var lastTab = this.getLastFromDeque();
        this.moveTabToDequeFront(lastTab);
        var lastTabIndex = this.getTabBarIndex(lastTab);
        this.gBrowser.selectTabAtIndex(lastTabIndex);
    };

    this.minimizeTab = function(tab, toBackground) {
        this.ensureInitialization();
        if (toBackground) {
            this.moveTabToDequeEnd(tab);
        } else {
            this.removeFromDeque(tab);
        }
        if (this.isDequeEmpty()) {
            this.mimicAllTabsMinimized();
        } else {
            var nextTabIndex = this.getTabBarIndex(this.getFirstFromDeque());
            this.gBrowser.selectTabAtIndex(nextTabIndex);
        }
    };

    this.selectNextMinimizedTab = function() {
        var tabs = this.gBrowser.tabs;
        for (var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            var maybeMinimizedTab = tabs[tabIndex];
            if (maybeMinimizedTab != this.allTabsMinimizedMimic &&
                this.deque.indexOf(maybeMinimizedTab) == -1
                ) {
                var minimizedTabIndex = this.getTabBarIndex(maybeMinimizedTab);
                this.gBrowser.selectTabAtIndex(minimizedTabIndex);
                return;
            }
        }
    };

    this.openTab = function(anEvent) {
        var url = Services.prefs.getCharPref("browser.newtab.url");
        return this.gBrowser.loadOneTab(url, {inBackground: false});
    };

    this.progressListener = function(browser) {
        Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
        var START = Components.interfaces.nsIWebProgressListener.STATE_START;
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
        };
    };

    this.letTabOpenLinksInNewTab = function(tab) {
        var browser = this.gBrowser.getBrowserForTab(tab);
        var listener = this.progressListener(browser);
        // keep reference, listener seems to be garbage collected otherwise
        this.progressListenerInstance = listener;
        browser.addProgressListener(
            listener,
            Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT
        );
    };

    this.mimicAllTabsMinimized = function() {
        if (!this.allTabsMinimizedMimic) {
            this.mimickingAllTabMinimized = true;
            this.allTabsMinimizedMimic = this.openTab();
            this.letTabOpenLinksInNewTab(this.allTabsMinimizedMimic);
            this.mimickingAllTabMinimized = false;
            this.allTabsMinimizedMimic.collapsed = true;
            this.allTabsMinimizedMimic.disabled = true;
            this.gBrowser.pinTab(this.allTabsMinimizedMimic);
            this.domWindow.document.getElementById('nav-bar').hidden = true;
        } else {
            var mimicIndex =
                this.getTabBarIndex(this.allTabsMinimizedMimic);
            this.gBrowser.selectTabAtIndex(mimicIndex);
        }
    };

    this.moveTabToDequeEnd = function(tab) {
        this.ensureInitialization();
        this.addToDequeEnd(this.removeFromDeque(tab));
    };

    this.moveTabToDequeFront = function(tab) {
        this.ensureInitialization();
        this.addToDequeFront(this.removeFromDeque(tab));
    };

    this.moveTabToSecondPlaceInDeque = function(tab) {
        this.ensureInitialization();
        var firstTab = this.getFirstFromDeque(true);
        if (tab !== firstTab) {
            this.addToDequeFront(tab);
        }
        this.addToDequeFront(firstTab);
    };

    // can't be sure that events are fired for all tabs on startup
    // tabs are missing if initialized too early, use this before first access
    this.ensureInitialization = function() {
        if (!this.deque) {
            this.initDeque();
        }
    };

    this.initDeque = function() {
        this.deque = [];
        var tabs = this.gBrowser.tabs;
        for (var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            this.addToDequeEnd(tabs[tabIndex]);
        }
        return this.deque;
    };

    this.isDequeEmpty = function() {
        return this.deque.length === 0;
    };

    this.addToDequeFront = function(tab) {
        this.deque.unshift(tab);
    };

    this.addToDequeEnd = function(tab) {
        this.deque.push(tab);
    };

    this.getFirstFromDeque = function(remove) {
        if (remove) {
            return this.deque.shift();
        } else {
            return this.deque[0];
        }
    };

    this.getLastFromDeque = function(remove) {
        if (remove) {
            return this.deque.pop();
        } else {
            return this.deque[this.deque.length - 1];
        }
    };

    this.removeFromDeque = function(tab) {
        var dequeIndex = this.deque.indexOf(tab);
        if (this.deque.indexOf(tab) >= 0) {
            this.deque.splice(this.deque.indexOf(tab), 1);
        }
        return tab;
    };

    this.getTabBarIndex = function(givenTab) {
        var tabs = this.gBrowser.tabs;
        for (var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            if (tabs[tabIndex] === givenTab) {
                return tabIndex;
            }
        }
        return -1;
    };

    // for debugging
    this.getDequeURLs = function() {
        var urls = [];
        var length = this.deque.length;
        for (var tabIndex = 0; tabIndex < this.deque.length; tabIndex++) {
            urls.push(this.getTabURL(this.deque[tabIndex]));
        }
        return urls;
    };

    this.getTabURL = function(tab) {
        var browser = this.gBrowser.getBrowserForTab(tab);
        return browser.currentURI.spec;
    };
}

