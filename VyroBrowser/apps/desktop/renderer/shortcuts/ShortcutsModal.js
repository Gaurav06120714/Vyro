class ShortcutsModal {
  constructor(sm) {
    this.sm = sm;
    this.visible = false;
    this._build();
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'sm-overlay hidden';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.panel = document.createElement('div');
    this.panel.className = 'sm-panel';

    this.panel.innerHTML = `
      <div class="sm-header">
        <div class="sm-title">
          <svg width="20" height="20" viewBox="0 0 80 80" fill="none">
            <path d="M40 4 L72 22 L72 58 L40 76 L8 58 L8 22 Z" fill="#6366f1"/>
            <path d="M24 28 L40 54 L56 28" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          Keyboard Shortcuts
        </div>
        <div class="sm-header-right">
          <input class="sm-search" placeholder="Search shortcuts..." autocomplete="off" spellcheck="false" />
          <button class="sm-close">✕</button>
        </div>
      </div>
      <div class="sm-body" id="sm-body"></div>
      <div class="sm-footer">
        <span>Press <kbd>F1</kbd> to toggle this panel</span>
        <button class="sm-settings-btn" id="sm-open-settings">Customize Shortcuts →</button>
      </div>
    `;

    this.overlay.appendChild(this.panel);
    document.body.appendChild(this.overlay);

    this.panel.querySelector('.sm-close').addEventListener('click', () => this.hide());
    this.panel.querySelector('.sm-search').addEventListener('input', (e) => this._render(e.target.value));
    this.panel.querySelector('#sm-open-settings').addEventListener('click', () => {
      this.hide();
      window.openSettingsPage && window.openSettingsPage('shortcuts');
    });

    this.overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }

  _groupByCategory(shortcuts) {
    const groups = {};
    shortcuts.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }

  _render(query) {
    const body = this.panel.querySelector('#sm-body');
    let shortcuts = this.sm.getAll();
    if (query) {
      const q = query.toLowerCase();
      shortcuts = shortcuts.filter(s =>
        s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    }
    const groups = this._groupByCategory(shortcuts);
    body.innerHTML = '';

    Object.entries(groups).forEach(([cat, items]) => {
      const section = document.createElement('div');
      section.className = 'sm-section';
      section.innerHTML = `<div class="sm-cat-title">${cat}</div>`;
      const grid = document.createElement('div');
      grid.className = 'sm-grid';
      items.forEach(s => {
        const row = document.createElement('div');
        row.className = 'sm-row';
        row.innerHTML = `
          <span class="sm-label">${s.label}</span>
          <kbd class="sm-kbd">${this.sm.formatBinding(s.binding)}</kbd>
        `;
        grid.appendChild(row);
      });
      section.appendChild(grid);
      body.appendChild(section);
    });

    if (Object.keys(groups).length === 0) {
      body.innerHTML = '<div class="sm-empty">No shortcuts match your search</div>';
    }
  }

  show() {
    this.visible = true;
    this.overlay.classList.remove('hidden');
    this._render('');
    this.panel.querySelector('.sm-search').focus();
    this.sm.pause();
  }

  hide() {
    this.visible = false;
    this.overlay.classList.add('hidden');
    this.sm.resume();
  }

  toggle() { this.visible ? this.hide() : this.show(); }
}

window.ShortcutsModal = null;
window.ShortcutsModalClass = ShortcutsModal;
