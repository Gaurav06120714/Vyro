// Webview preload — runs in the context of every webview page.
// Does NOT expose anything to the page; used only to signal dom-ready.
document.addEventListener('DOMContentLoaded', () => {
  // Signal to parent renderer that this webview's DOM is ready.
  // The renderer listens for the webview's dom-ready event directly,
  // so no custom messaging is needed here. This file is intentionally minimal.
});
