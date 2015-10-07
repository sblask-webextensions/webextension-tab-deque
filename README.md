[![Build Status](https://travis-ci.org/sblask/firefox-tab-deque.svg?branch=master)](https://travis-ci.org/sblask/firefox-tab-deque)

firefox-tab-deque
=================

A [Firefox extension](https://addons.mozilla.org/en-US/firefox/addon/tab-deque/)
for better tab handling. Inspired by Opera 12 and its `Activate the last
active tab` setting, which is not the same as `most recently used tab` or
`last tab selected` other extensions provide.

Most users will recognize the behaviour from the way windows are handled on
their Desktop. When using Windows(with stacking disabled) or for example Xfce
under Linux, opening a window adds it to the taskbar, clicking another one will
focus that one, closing or minimizing will bring the previous one back to
focus. This extension will do that and more.

Building a deque of tabs:
-------------------------

 - When a tab is closed, it is removed from the deque and will not be selected
   again. If it was the current one, the next one from the front of the deque
   is selected.
 - Opening a tab in the background adds it at the end of the deque, so it will
   be selected after all others have been closed or minimized.
 - Opening a tab in the foreground adds it at the front of the deque and it is
   selected right away.
 - Selecting a tab moves it to the front of the deque.
 - Clicking the currently selected tab minimizes it by default which means
   that it is removed from the deque and will not be selected unless you
   manually do it. However, you can set
   `extensions.tabdeque.clickToBackground` to `true` which moves the tab to
   the end of the queue instead of removing it. Thus, the tab will be selected
   once you've closed or minimized all other tabs. Having one tab open,
   clicking it would not do anything(it will be minimized and selected again
   immediately). Having two tabs open, you would alternate between the two,
   with three tabs, you would cycle one -> two -> three -> one -> ...
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

Notes
-----

 - Previously there was a setting `extensions.tabdeque.openTabsNextToCurrent`,
   which has now been removed in favour the
   [Open Tabs Next to Current](https://addons.mozilla.org/en-US/firefox/addon/open-tabs-next-to-current/)
   Add-On.

Known Issues
------------

 - Tab Deque doesn't work well with [Tab Groups](https://support.mozilla.org/en-US/kb/tab-groups-organize-tabs). If the next tab in the deque is in another Tab Group it doesn't get selected on closing the current tab
 - There have been reports that [Tab Mix Plus](https://addons.mozilla.org/en-US/firefox/addon/tab-mix-plus/) is incompatible to Tab Deque, even though I am not sure what kind of problem you can expect.

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

