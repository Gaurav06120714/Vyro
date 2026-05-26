class CommandPalette {
  constructor(sm) {
    this.sm = sm;
    this.visible = false;
    this._selectedIdx = 0;
    this._build();
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'cp-overlay hidden';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.panel = document.createElement('div');
    this.panel.className = 'cp-panel';

    this.input = document.createElement('input');
    this.input.className = 'cp-input';
    this.input.placeholder = 'Type a command...';
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('spellcheck', 'false');

    this.list = document.createElement('div');
    this.list.className = 'cp-list';

    this.panel.appendChild(this.input);
    this.panel.appendChild(this.list);
    this.overlay.appendChild(this.panel);
    document.body.appendChild(this.overlay);

    this.input.addEventListener('input', () => this._render(this.input.value));
    this.input.addEventListener('keydown', (e) => this._navigate(e));
  }

  _getCommands(query) {
    const all = this.sm.getAll();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(s =>
      s.label.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    );
  }

  _render(query) {
    const cmds = this._getCommands(query);
    this._selectedIdx = 0;
    this.list.innerHTML = '';
    if (cmds.length === 0) {
      this.list.innerHTML = '<div class="cp-empty">No commands found</div>';
      return;
    }
    cmds.forEach((cmd, i) => {
      const item = document.createElement('div');
      item.className = 'cp-item' + (i === 0 ? ' selected' : '');
      item.dataset.id = cmd.id;
      const kbd = this.sm.formatBinding(cmd.binding);
      item.innerHTML = `
        <div class="cp-item-left">
          <span class="cp-item-label">${cmd.label}</span>
          <span class="cp-item-cat">${cmd.category}</span>
        </div>
        <kbd class="cp-kbd">${kbd}</kbd>
      `;
      item.addEventListener('click', () => { this._execute(cmd.id); });
      item.addEventListener('mouseenter', () => {
        this._selectedIdx = i;
        this._highlight();
      });
      this.list.appendChild(item);
    });
  }

  _highlight() {
    this.list.querySelectorAll('.cp-item').forEach((el, i) => {
      el.classList.toggle('selected', i === this._selectedIdx);
    });
    const sel = this.list.querySelectorAll('.cp-item')[this._selectedIdx];
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  _navigate(e) {
    const items = this.list.querySelectorAll('.cp-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._selectedIdx = Math.min(this._selectedIdx + 1, items.length - 1);
      this._highlight();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._selectedIdx = Math.max(this._selectedIdx - 1, 0);
      this._highlight();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = items[this._selectedIdx];
      if (sel) this._execute(sel.dataset.id);
    }
    if (e.key === 'Escape') { this.hide(); }
  }

  _execute(id) {
    this.hide();
    const handler = this.sm._actions.get(id);
    if (handler) handler();
  }

  show() {
    this.visible = true;
    this.overlay.classList.remove('hidden');
    this.input.value = '';
    this._render('');
    requestAnimationFrame(() => this.input.focus());
    this.sm.pause();
  }

  hide() {
    this.visible = false;
    this.overlay.classList.add('hidden');
    this.sm.resume();
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }
}

window.CommandPalette = null;
window.CommandPaletteClass = CommandPalette;
