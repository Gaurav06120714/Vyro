class ShortcutsPage {
  constructor(sm) {
    this.sm = sm;
    this.recording = null;
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'sp-page hidden';
    this.el.id = 'shortcuts-page';

    this.el.innerHTML = `
      <div class="sp-header">
        <div class="sp-title">
          <button class="sp-back" id="sp-back">←</button>
          Keyboard Shortcuts
        </div>
        <div class="sp-actions">
          <input class="sp-search" placeholder="Search shortcuts..." autocomplete="off" />
          <button class="sp-reset-all" id="sp-reset-all">Reset All to Default</button>
        </div>
      </div>
      <div class="sp-body" id="sp-body"></div>
    `;

    document.body.appendChild(this.el);

    this.el.querySelector('#sp-back').addEventListener('click', () => this.hide());
    this.el.querySelector('#sp-reset-all').addEventListener('click', () => {
      if (confirm('Reset all shortcuts to defaults?')) {
        this.sm.resetToDefaults();
        this._render('');
      }
    });
    this.el.querySelector('.sp-search').addEventListener('input', (e) => this._render(e.target.value));
    this.sm.on('shortcuts:updated', () => this._render(this.el.querySelector('.sp-search').value || ''));
  }

  _render(query) {
    const body = this.el.querySelector('#sp-body');
    let shortcuts = this.sm.getAll();
    if (query) {
      const q = query.toLowerCase();
      shortcuts = shortcuts.filter(s =>
        s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    }

    const groups = {};
    shortcuts.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    body.innerHTML = '';

    Object.entries(groups).forEach(([cat, items]) => {
      const section = document.createElement('div');
      section.className = 'sp-section';
      section.innerHTML = `<div class="sp-cat">${cat}</div>`;

      const table = document.createElement('div');
      table.className = 'sp-table';

      items.forEach(s => {
        const isCustom = !!this.sm._userOverrides[s.id];
        const row = document.createElement('div');
        row.className = 'sp-tr';
        row.dataset.id = s.id;

        const isRecording = this.recording === s.id;
        const kbdText = isRecording ? 'Press keys...' : this.sm.formatBinding(s.binding);
        const kbdClass = `sp-kbd${isRecording ? ' recording' : ''}`;

        row.innerHTML = `
          <div class="sp-td-label">
            <span class="sp-shortcut-label">${s.label}</span>
            ${s.description ? `<span class="sp-shortcut-desc">${s.description}</span>` : ''}
          </div>
          <div class="sp-td-kbd">
            <kbd class="${kbdClass}" data-id="${s.id}">${kbdText}</kbd>
          </div>
          <div class="sp-td-actions">
            ${isCustom ? `<button class="sp-reset-one" data-id="${s.id}" title="Reset to default">↺</button>` : ''}
          </div>
        `;

        row.querySelector('.sp-kbd').addEventListener('click', (e) => {
          e.stopPropagation();
          this._startRecording(s.id);
        });

        const resetBtn = row.querySelector('.sp-reset-one');
        if (resetBtn) {
          resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sm.resetOne(s.id);
            this._render(query);
          });
        }

        table.appendChild(row);
      });

      section.appendChild(table);
      body.appendChild(section);
    });
  }

  _startRecording(id) {
    this.recording = id;
    this._render(this.el.querySelector('.sp-search').value || '');
    this.sm.pause();

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        this.recording = null;
        this._render(this.el.querySelector('.sp-search').value || '');
        this.sm.resume();
        document.removeEventListener('keydown', handler, true);
        return;
      }

      // Ignore modifier-only keypresses
      if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return;

      const binding = {
        key: e.key.toLowerCase(),
        meta: e.metaKey,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
      };

      const result = this.sm.setCustomBinding(id, binding);
      if (result.error === 'conflict') {
        const kbdEl = this.el.querySelector(`.sp-tr[data-id="${id}"] .sp-kbd`);
        if (kbdEl) {
          kbdEl.textContent = `Conflict with "${result.conflictLabel}"`;
          kbdEl.classList.add('conflict');
        }
        setTimeout(() => {
          this.recording = null;
          this._render(this.el.querySelector('.sp-search').value || '');
          this.sm.resume();
        }, 1500);
      } else {
        this.recording = null;
        this._render(this.el.querySelector('.sp-search').value || '');
        this.sm.resume();
      }
      document.removeEventListener('keydown', handler, true);
    };

    setTimeout(() => document.addEventListener('keydown', handler, true), 50);
  }

  show() {
    this.el.classList.remove('hidden');
    this._render('');
    this.sm.pause();
  }

  hide() {
    this.el.classList.add('hidden');
    this.sm.resume();
  }
}

window.ShortcutsPageClass = ShortcutsPage;
window.ShortcutsPage = null;
