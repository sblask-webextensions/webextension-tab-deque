firefox-tab-deque
=================

A [Firefox extension](https://addons.mozilla.org/en-US/firefox/addon/tab-deque/)
for better tab handling. Inspired by Opera 12 and its `Activate the last
active tab` setting, which is not the same as `most recently used tab` or
`last tab selected` other extensions provide.

Building a deque of tabs:
-------------------------

 - When a tab is closed, it is removed from the deque and will not be selected
   again. If it was the current one, the next one from the front of the deque
   is selected.
 - Opening a tab in the background adds it at the end of the deque, so it will
   be selected after all others have been closed or minimized.
 - Opening a tab in the foreground adds it at the front of the deque and it is
   selected right away.
 - In both cases, the new tab is (visually) opened next to current tab, unless
   you set the `extensions.tabdeque.openTabsNextToCurrent` preference to
   `false` in `about:config`.
 - Selecting a tab moves it to the front of the deque.
 - Clicking the currently selected tab minimizes it by default which means
   that it is removed from the deque and will not be selected unless you
   manually do it. However, you can set
   `extensions.tabdeque.clickToBackground` to `true` which moves the tab to
   the end of the queue instead of removing it. Thus, the tab will be selected
   once you've closed or minimized all other tabs.
 - If all tabs are minimized, you will see whatever you've got the
   `browser.newtab.url` preference set to.

Keyboard Shortcuts and Javascript Hooks
---------------------------------------

Use `Shift PageDown` to minimize the currently selected tab. Use `Shift PageUp`
to select the next minimized tab. You can customize these shortcuts using the
[Customizable Shortcuts extension](https://addons.mozilla.org/en-US/firefox/addon/customizable-shortcuts/).
The corresponding functions are `gTabDeque.minimizeCurrentTab()` and
`gTabDeque.selectNextMinimizedTab()` which you can use for example with
[FireGestures](https://addons.mozilla.org/en-US/firefox/addon/firegestures/).

The same applies for
`Ctrl Alt PageDown`(`gTabDeque.sendCurrentTabToBackground()`) and
`Ctrl Alt PageUp`(`gTabDeque.selectLastTabOfDeque()`) which allow you to cycle
through the deque.

You can use `gTabDeque.moveTabToSecondPlaceInDeque(tab)` to move a tab to the
second place in the deque, which can be useful if you want to open links in
the background but want to look at them after closing/minimizing the current
one. [See an example for FireGestures](https://gist.github.com/sblask/9431758)

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/firefox-tab-deque).

Patches are welcome.

Installation
------------

To install from source, create a link
`~/.mozilla/firefox/$RANDOM_PROFILE_ID/extensions/tabdeque@sblask`
to your checkout folder.

