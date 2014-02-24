Components.utils.import("resource://gre/modules/devtools/Console.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

var initFunction = function(domWindow) {
    var extensionResource = "chrome://tabdeque/content/tabdeque.jsm";
    Components.utils.import(extensionResource);
    domWindow.gTabDeque = new TabDeque();
    domWindow.gTabDeque.initialize(domWindow);
};

var destroyFunction = function(domWindow) {
    domWindow.gTabDeque.destroy();
    domWindow.gTabDeque = undefined;
};

var setDefaultPreferences = function() {
    var branch = Services.prefs.getDefaultBranch("extensions.tabdeque.");
    branch.setBoolPref("openTabsNextToCurrent", true);
};

function simpleToDomWindow(aWindow) {
    return aWindow.QueryInterface(Components.interfaces.nsIDOMWindow);
}

function toDomWindow(aWindow) {
    return aWindow
              .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
              .getInterface(Components.interfaces.nsIDOMWindowInternal ||
                  Components.interfaces.nsIDOMWindow);
}

var windowListener = {
    onOpenWindow: function (aWindow) {
        var domWindow = toDomWindow(aWindow);
        var onLoadFunction = function() {
            domWindow.removeEventListener("load", arguments.callee, false);
            initFunction(domWindow);
        };
        domWindow.addEventListener("load", onLoadFunction, false);
    },
    onCloseWindow: function (aWindow) {},
    onWindowTitleChange: function (aWindow, aTitle) {}
};

var windowMediator =
    Components.classes["@mozilla.org/appshell/window-mediator;1"]
        .getService(Components.interfaces.nsIWindowMediator);

function callOnOpenWindows(someFunction) {
    var openWindows = windowMediator.getEnumerator("navigator:browser");
    while (openWindows.hasMoreElements()) {
        someFunction(simpleToDomWindow(openWindows.getNext()));
    }
}

function install() {}
function uninstall() {}
function startup(data, reason) {
    setDefaultPreferences();
    callOnOpenWindows(initFunction);
    windowMediator.addListener(windowListener);
}
function shutdown(data, reason) {
    windowMediator.removeListener(windowListener);
    callOnOpenWindows(destroyFunction);
}

