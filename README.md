firefox-tab-deque
=================

A firefox extension for better tab handling. Inspired by Opera 12 and its `Activate the last active tab` setting.
Note, this is not the same as `most recently used tab` or `last tab selected` other extensions provide.

Building a deque of tabs:
-------------------------

 - When the current tab is closed, it is removed from the deque and the next one from the end is selected.
 - Opening a tab in the background adds it at the beginning, so it will be selected after all others have been closed or minimized.
 - Opening a tab in the foreground adds it at the end of the deque and it is selected right away.
 - In both cases, the new tab is opened next to current tab.
 - Selecting a tab moves it to the end of the deque.
 - Clicking the currently selected tab minimizes it, which means it is removed from the deque and will not be selected unless you manually do it.
 - If all tabs are minimized, you will see whatever you've got the `browser.newtab.url` preference set to.

Keyboard Shortcuts
------------------

Use `Shift PageDown` to minimize the currently selected tab. Use `Shift PageUp`
to select the next minimized tab. You can customize these shortcuts using the
[Customizable Shortcuts extension](https://addons.mozilla.org/en-US/firefox/addon/customizable-shortcuts/).
The corresponding functions are `gTabDeque.minimizeCurrentTab()` and
`gTabDeque.maximizeNextMinimizedTab()` which you can use for example with the
[FireGestures extension](https://addons.mozilla.org/en-US/firefox/addon/firegestures/).

You can report bugs on [Github](https://github.com/sblask/firefox-tab-deque). Patches are welcome.

To install from source, create a link `~/.mozilla/firefox/$RANDOM_PROFILE_ID/extensions/tabdeque@sblask` to your checkout folder.

