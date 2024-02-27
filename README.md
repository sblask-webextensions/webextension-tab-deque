[![pre-commit Status](https://github.com/sblask/webextension-tab-deque/actions/workflows/pre-commit.yml/badge.svg)](https://github.com/sblask/webextension-tab-deque/actions/workflows/pre-commit.yml)

Tab Deque
=========

A webextension for better tab handling. Inspired by Opera 12 and its `Activate
the last active tab` setting, which is not the same as `most recently used tab`
or `last tab selected` other extensions provide.

Most users will recognize the behaviour from the way windows are handled on
their Desktop. When using Windows(with stacking disabled) or for example Xfce
under Linux, opening a window adds it to the taskbar, clicking another one will
focus that one, closing or minimizing will bring the previous one back to
focus. This extension will do that and more.

Building a deque of tabs:
-------------------------

 - When a tab is closed, it is removed from the deque. If it was the current
   one, the next one from the front of the deque is selected.
 - Opening a tab in the background adds it at the end of the deque, so it will
   be selected after all others have been closed.
 - Opening a tab in the foreground or selecting a tab moves it to the front of
   the deque.
 - You can also send a tab to the end of the deque, which means the next one
   from the front of the deque is selected. It's bit like minimizing a window
   on your desktop, but as there is no desktop to show when all other tabs have
   been "minimized"/closed, the tab gets re-selected. This is currently an
   option in the tab's (if supported by the browser) and page's context menu.
   Ideally a simple left click would do that too (like a previous version of
   this extension based on a different API did), but there is currently no API
   for detecting clicks on tabs. There is also a keyboard shortcut:
   `Ctrl-Down`.
 - A kind of undo of the latter is `Ctrl-Up`, it selects the tab at the end of
   the deque and moves it to the front of the deque.

Known Issues
------------

 - If you have autoplay of audio/video content enabled, unexpected tabs might
   start playing the content. As Tab Deque modifies the tab activation order,
   it might activate a tab different from what the browser expects. There is no
   way to work around this problem.

Privacy Policy
--------------

This extension does not collect or send data of any kind to third parties.

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/webextension-tab-deque)

Patches are welcome.
