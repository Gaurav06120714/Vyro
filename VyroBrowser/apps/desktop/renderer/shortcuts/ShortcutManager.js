/**
 * ShortcutManager — renderer-side (IPC-driven)
 *
 * Root cause of broken shortcuts in Electron:
 *   When a <webview> has focus, ALL keydown events go to the webview process.
 *   document.addEventListener in the renderer NEVER fires.
 *
 * Fix: All shortcuts are fired from main process Menu accelerators via IPC.
 *   This file just receives them and dispatches to action handlers.
 */
class ShortcutManager {
  constructor() {
    this._actions      = new Map();
    this._shortcuts    = [];
    this._defaults     = [];
    this._platform     = process.platform === 'darwin' ? 'mac' : 'win';
    this._storage_key  = 'vyro-shortcuts-v1';
    this._paused       = false;
    this._listeners    = new Map();

    try {
      this._userOverrides = JSON.parse(localStorage.getItem(this._storage_key) || '{}');
    } catch { this._userOverrides = {}; }

    this._initIPC();
    this._initUIKeyboard();
  }

  // IPC from main — fires regardless of webview focus
  _initIPC() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('shortcut:action', (_, actionId, payload) => {
      if (this._paused) return;
      this._dispatch(actionId, payload);
    });
  }

  // Keyboard listener only for our own UI elements (address bar, modals)
  _initUIKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (this._paused) return;
      const active = document.activeElement;

      if (active?.id === 'address-bar') {
        if (e.key === 'Enter')  { e.preventDefault(); this._dispatch('navigate-address'); }
        if (e.key === 'Escape') { e.preventDefault(); active.blur(); }
        return;
      }
      if (active?.id === 'nt-search-input') {
        if (e.key === 'Enter') { e.preventDefault(); this._dispatch('navigate-nt-search'); }
        return;
      }
      if (e.key === 'Escape') {
        if (window.CommandPalette?.visible) { window.CommandPalette.hide(); e.preventDefault(); return; }
        if (window.ShortcutsModal?.visible) { window.ShortcutsModal.hide(); e.preventDefault(); return; }
        if (window.ShortcutsPage?.visible)  { window.ShortcutsPage.hide();  e.preventDefault(); return; }
      }
    }, true);
  }

  registerAction(id, handler) { this._actions.set(id, handler); }

  _dispatch(id, payload) {
    const handler = this._actions.get(id);
    if (handler) {
      try { handler(payload); } catch (err) { console.error('[Shortcuts] action "' + id + '" threw:', err); }
    }
    this._emit('shortcut:fired', { id, payload });
  }

  loadDefaults(defaults) {
    this._defaults  = defaults;
    this._shortcuts = defaults.map(def => {
      const binding = this._userOverrides[def.id] || def[this._platform] || def.mac;
      return { ...def, binding };
    });
  }

  setCustomBinding(id, binding) {
    const conflict = this._shortcuts.find(s => s.id !== id && this._bindingsEqual(s.binding, binding));
    if (conflict) return { error: 'conflict', conflictId: conflict.id, conflictLabel: conflict.label };
    this._userOverrides[id] = binding;
    localStorage.setItem(this._storage_key, JSON.stringify(this._userOverrides));
    this.loadDefaults(this._defaults);
    this._emit('shortcuts:updated', {});
    return { ok: true };
  }

  resetToDefaults() {
    this._userOverrides = {};
    localStorage.removeItem(this._storage_key);
    this.loadDefaults(this._defaults);
    this._emit('shortcuts:updated', {});
  }

  resetOne(id) {
    delete this._userOverrides[id];
    localStorage.setItem(this._storage_key, JSON.stringify(this._userOverrides));
    this.loadDefaults(this._defaults);
  }

  _bindingsEqual(a, b) {
    if (!a || !b) return false;
    return a.key === b.key && !!a.meta === !!b.meta &&
           !!a.ctrl === !!b.ctrl && !!a.shift === !!b.shift && !!a.alt === !!b.alt;
  }

  formatBinding(binding) {
    if (!binding) return '—';
    const mac = this._platform === 'mac';
    const parts = [];
    if (binding.meta)  parts.push(mac ? '⌘' : 'Win');
    if (binding.ctrl)  parts.push(mac ? '⌃' : 'Ctrl');
    if (binding.alt)   parts.push(mac ? '⌥' : 'Alt');
    if (binding.shift) parts.push(mac ? '⇧' : 'Shift');
    const LABELS = { arrowleft:'←',arrowright:'→',arrowup:'↑',arrowdown:'↓',
      escape:'Esc',enter:'↩',backspace:'⌫',delete:'Del','[':'[',']':']',
      '=':'+','-':'−',',':',','.','.','f1':'F1','f11':'F11','f7':'F7' };
    const k = (binding.key || '').toLowerCase();
    parts.push(LABELS[k] || k.toUpperCase());
    return mac ? parts.join('') : parts.join('+');
  }

  getAll()    { return this._shortcuts; }
  getById(id) { return this._shortcuts.find(s => s.id === id); }
  pause()     { this._paused = true; }
  resume()    { this._paused = false; }

  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(cb);
  }
  _emit(event, data) {
    (this._listeners.get(event) || []).forEach(cb => cb(data));
  }
}

window.ShortcutManager = ShortcutManager;
