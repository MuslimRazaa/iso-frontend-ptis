// Every modal in the app renders a `.modal-overlay` backdrop, but there's no
// single shared Modal component (each page hand-rolls its own open/close
// state) — so there's no one place to add "lock the page while I'm open".
// A MutationObserver watching for that class instead covers every modal at
// once, present and future, without touching each page's modal markup.
//
// Why body needs locking at all: `.modal-overlay` is `position: fixed` with
// its own `overflow-y: auto`, so it scrolls itself first — but once its own
// content stops needing to scroll (or the wheel/touch gesture keeps going
// after it bottoms out), the scroll falls through to whatever's behind it,
// and the page behind the modal visibly scrolls too.
let previousOverflow = '';
let locked = false;
let observer = null;

// Re-derives lock state from what's actually in the DOM after every mutation,
// instead of an add/remove counter — a counter can drift out of sync if a
// batch of React updates adds and removes overlay nodes in ways that don't
// pair up 1:1 (e.g. React replacing a node rather than toggling it).
function sync() {
  const anyOpen = document.querySelectorAll('.modal-overlay').length > 0;
  if (anyOpen && !locked) {
    locked = true;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else if (!anyOpen && locked) {
    locked = false;
    document.body.style.overflow = previousOverflow;
  }
}

export function initModalScrollLock() {
  if (observer) return; // already running (e.g. React StrictMode double-invoke)
  observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  sync(); // catch any modal already open at mount time
}
