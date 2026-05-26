import React, { useState, useRef, useEffect } from 'react';
import { TabGroup as TabGroupType, Tab } from '@shared/types/tab';
import { useTabsStore } from '../../store/tabs.store';

const GROUP_COLORS = [
  { name: 'red', bg: 'bg-red-500', hex: '#ef4444' },
  { name: 'orange', bg: 'bg-orange-500', hex: '#f97316' },
  { name: 'yellow', bg: 'bg-yellow-500', hex: '#eab308' },
  { name: 'green', bg: 'bg-green-500', hex: '#22c55e' },
  { name: 'teal', bg: 'bg-teal-500', hex: '#14b8a6' },
  { name: 'blue', bg: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'purple', bg: 'bg-purple-500', hex: '#a855f7' },
  { name: 'pink', bg: 'bg-pink-500', hex: '#ec4899' },
];

interface Props {
  group: TabGroupType;
  tabs: Tab[];
}

export const TabGroupComponent: React.FC<Props> = ({ group, tabs }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateGroup = useTabsStore(s => s.updateGroup);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleRename = () => {
    const trimmed = name.trim();
    if (trimmed) {
      updateGroup(group.id, { name: trimmed });
    } else {
      setName(group.name);
    }
    setEditing(false);
  };

  const handleColorSelect = (hex: string) => {
    updateGroup(group.id, { color: hex });
    setColorPickerOpen(false);
  };

  const toggleCollapse = () => {
    updateGroup(group.id, { collapsed: !group.collapsed });
  };

  const currentColor = GROUP_COLORS.find(c => c.hex === group.color) ?? GROUP_COLORS[5];

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Color swatch + label pill */}
      <div className="relative">
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white cursor-pointer select-none"
          style={{ backgroundColor: group.color + '33', borderColor: group.color + '66', border: '1px solid' }}
          onDoubleClick={() => setEditing(true)}
          onClick={() => !editing && setColorPickerOpen(v => !v)}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: group.color }}
          />
          {editing ? (
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setName(group.name); setEditing(false); }
                e.stopPropagation();
              }}
              onClick={e => e.stopPropagation()}
              className="bg-transparent outline-none w-16 text-xs"
              style={{ color: group.color }}
            />
          ) : (
            <span style={{ color: group.color }}>{group.name}</span>
          )}
          <span className="text-white/40 text-[10px]">({tabs.length})</span>
        </div>

        {/* Color picker popover */}
        {colorPickerOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-surface)] border border-white/10 rounded-xl p-2 flex gap-1.5 shadow-xl">
            {GROUP_COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => handleColorSelect(c.hex)}
                className={`w-5 h-5 rounded-full ${c.bg} hover:scale-110 transition-transform ${group.color === c.hex ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#1a1a2e]' : ''}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Collapse/expand button */}
      <button
        onClick={toggleCollapse}
        className="w-4 h-4 flex items-center justify-center rounded text-white/30 hover:text-white transition-colors"
        title={group.collapsed ? 'Expand group' : 'Collapse group'}
      >
        <svg
          className={`w-3 h-3 transition-transform ${group.collapsed ? '-rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};
