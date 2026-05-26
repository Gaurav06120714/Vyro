// ─────────────────────────────────────────────────────────────────────────────
// SuggestionDropdown v2 — Arc/Brave-style, grouped, animated
// Shared between AddressBar, NewTab, CommandPalette
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom';
import { KeywordSuggestion, IntentType, SuggestionGroup } from '@shared/keyword-engine/types';

// ── Intent metadata ───────────────────────────────────────────────────────────

export const INTENT_META: Record<NonNullable<IntentType>, { label: string; cls: string }> = {
  streaming: { label: '▶ Streaming', cls: 'text-red-400 bg-red-500/10 border border-red-500/15' },
  video:     { label: '🎬 Video',    cls: 'text-orange-400 bg-orange-500/10 border border-orange-500/15' },
  shopping:  { label: '🛒 Shopping', cls: 'text-green-400 bg-green-500/10 border border-green-500/15' },
  coding:    { label: '⌨ Dev',      cls: 'text-blue-400 bg-blue-500/10 border border-blue-500/15' },
  music:     { label: '🎵 Music',    cls: 'text-purple-400 bg-purple-500/10 border border-purple-500/15' },
  social:    { label: '💬 Social',   cls: 'text-pink-400 bg-pink-500/10 border border-pink-500/15' },
};

// ── Group headers ─────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<SuggestionGroup, string> = {
  top:         '',                 // no header for top match
  intent:      'SMART SUGGESTIONS',
  suggestions: 'SUGGESTIONS',
  search:      'SEARCH',
};

// ── Type icon (SVG fallback when no favicon) ──────────────────────────────────

const TypeIcon: React.FC<{ type: KeywordSuggestion['type'] }> = ({ type }) => {
  if (type === 'search') return (
    <svg className="w-3.5 h-3.5 text-white/30" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  );
  if (type === 'url') return (
    <svg className="w-3.5 h-3.5 text-white/30" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
    </svg>
  );
  if (type === 'smart-search' || type === 'intent') return (
    <svg className="w-3.5 h-3.5 text-vyro-400" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
  );
  return (
    <svg className="w-3.5 h-3.5 text-white/25" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
    </svg>
  );
};

// ── Single row ────────────────────────────────────────────────────────────────

interface RowProps {
  s: KeywordSuggestion;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
  onHover: () => void;
}

const Row: React.FC<RowProps> = ({ s, selected, compact, onSelect, onHover }) => {
  const intentMeta = s.intent ? INTENT_META[s.intent] : null;
  const isHistory = s.type === 'url' && s.usageCount > 0;

  return (
    <div
      className={[
        'relative flex items-center gap-2.5 cursor-pointer transition-colors duration-75',
        compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
        selected ? 'bg-vyro-600/20' : 'hover:bg-white/[0.04]',
      ].join(' ')}
      onMouseEnter={onHover}
      onMouseDown={e => { e.preventDefault(); onSelect(); }}
    >
      {/* Selected accent */}
      {selected && <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-vyro-500" />}

      {/* Favicon / icon */}
      <div className={[
        'shrink-0 flex items-center justify-center rounded-md overflow-hidden',
        compact ? 'w-5 h-5' : 'w-6 h-6',
        'bg-white/[0.06]',
      ].join(' ')}>
        {s.favicon ? (
          <img
            src={s.favicon}
            className="w-4 h-4 object-contain rounded-sm"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            alt=""
          />
        ) : <TypeIcon type={s.type} />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className={['truncate font-medium leading-tight', selected ? 'text-white' : 'text-white/85', compact ? 'text-[13px]' : 'text-sm'].join(' ')}>
          {s.label}
        </div>
        <div className={['truncate text-white/35 leading-tight mt-px', compact ? 'text-[11px]' : 'text-xs'].join(' ')}>
          {s.sublabel}
        </div>
      </div>

      {/* Right badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isHistory && (
          <span className="text-[10px] text-white/20 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded-md">visited</span>
        )}
        {intentMeta && (
          <span className={['text-[10px] font-medium px-1.5 py-0.5 rounded-md', intentMeta.cls].join(' ')}>
            {intentMeta.label}
          </span>
        )}
        {s.type === 'keyword' && !s.intent && (
          <span className="text-[11px] text-white/20 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded-md">↵</span>
        )}
        {s.type === 'smart-search' && (
          <span className="text-[10px] text-vyro-400/80 bg-vyro-500/10 border border-vyro-500/20 px-1.5 py-0.5 rounded-md">search</span>
        )}
        {s.usageCount > 2 && s.type !== 'url' && (
          <span className="text-[10px] text-white/15">{s.usageCount}×</span>
        )}
      </div>
    </div>
  );
};

// ── Exported dropdown ─────────────────────────────────────────────────────────

export interface SuggestionDropdownProps {
  suggestions: KeywordSuggestion[];
  selectedIdx: number;
  anchorRect: DOMRect | null;
  onSelect: (s: KeywordSuggestion) => void;
  onHover: (idx: number) => void;
  compact?: boolean;
}

export const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  suggestions, selectedIdx, anchorRect, onSelect, onHover, compact = false,
}) => {
  if (!suggestions.length || !anchorRect) return null;

  const minWidth = compact ? 400 : 520;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.bottom + 5,
    left: anchorRect.left,
    width: Math.max(anchorRect.width, minWidth),
    zIndex: 9999,
  };

  // Group items while preserving insertion order for rendering
  const orderedGroups: SuggestionGroup[] = ['top', 'intent', 'suggestions', 'search'];
  const byGroup = new Map<SuggestionGroup, Array<{ s: KeywordSuggestion; globalIdx: number }>>();

  suggestions.forEach((s, i) => {
    const g = (s.group ?? 'suggestions') as SuggestionGroup;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push({ s, globalIdx: i });
  });

  return ReactDOM.createPortal(
    <div
      style={style}
      className={[
        'overflow-hidden border border-white/[0.07]',
        'bg-[var(--bg-surface)]/97 backdrop-blur-2xl',
        'shadow-[0_12px_40px_-4px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)]',
        'rounded-2xl',
      ].join(' ')}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-vyro-500/25 to-transparent" />

      <div className="py-1">
        {orderedGroups.map(group => {
          const items = byGroup.get(group);
          if (!items?.length) return null;
          const showHeader = group !== 'top' && GROUP_LABELS[group];

          return (
            <div key={group}>
              {showHeader && (
                <div className="px-3.5 pt-2.5 pb-1">
                  <span className="text-[9px] font-bold tracking-[0.12em] text-white/20 uppercase">
                    {GROUP_LABELS[group]}
                  </span>
                </div>
              )}

              {items.map(({ s, globalIdx }) => (
                <Row
                  key={s.url + globalIdx}
                  s={s}
                  selected={globalIdx === selectedIdx}
                  compact={compact}
                  onSelect={() => onSelect(s)}
                  onHover={() => onHover(globalIdx)}
                />
              ))}

              {/* Divider between groups (except last) */}
              {group !== 'search' && items.length > 0 && byGroup.size > 1 && (
                <div className="mx-3 my-1 border-t border-white/[0.05]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Keyboard hint footer */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-white/[0.05] bg-white/[0.015]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/20">↑↓ navigate</span>
          <span className="text-white/10">·</span>
          <span className="text-[10px] text-white/20">↵ open</span>
          <span className="text-white/10">·</span>
          <span className="text-[10px] text-white/20">Esc close</span>
        </div>
        <span className="text-[10px] text-vyro-500/30 font-medium">Vyro Smart Search</span>
      </div>
    </div>,
    document.body,
  );
};
