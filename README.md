[![Build Status](https://travis-ci.org/sblask/firefox-tab-deque.svg?branch=master)](https://travis-ci.org/sblask/firefox-tab-deque)

firefox-tab-deque
=================

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

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/firefox-tab-deque).

Patches are welcome.
