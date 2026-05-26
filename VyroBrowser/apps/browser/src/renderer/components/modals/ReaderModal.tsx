import React, { useState, useEffect } from 'react';
import { ipc, IPC } from '../../lib/ipc';

interface ReaderArticle {
  title: string;
  byline?: string;
  content: string;
  textContent?: string;
  readingTime?: number;
}

type ReaderTheme = 'light' | 'dark' | 'sepia';
type ReaderWidth = 'narrow' | 'medium' | 'wide';

const WIDTH_CLASSES: Record<ReaderWidth, string> = {
  narrow: 'max-w-xl',
  medium: 'max-w-2xl',
  wide: 'max-w-4xl',
};

const THEME_STYLES: Record<ReaderTheme, { bg: string; text: string; secondary: string }> = {
  light: { bg: '#ffffff', text: '#1a1a1a', secondary: '#666' },
  dark: { bg: '#0f0f10', text: '#e2e8f0', secondary: '#888' },
  sepia: { bg: '#f4ecd8', text: '#3b2a1a', secondary: '#7a5c3a' },
};

interface Props {
  url: string;
  onClose: () => void;
}

export const ReaderModal: React.FC<Props> = ({ url, onClose }) => {
  const [article, setArticle] = useState<ReaderArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [width, setWidth] = useState<ReaderWidth>('medium');
  const [theme, setTheme] = useState<ReaderTheme>('dark');
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsSupported, setTtsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setLoading(true);
    ipc.invoke<ReaderArticle>(IPC.READER_EXTRACT, { url })
      .then(result => {
        setArticle(result);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [url]);

  const handleTts = async () => {
    if (ttsActive) {
      await ipc.invoke(IPC.READER_TTS_STOP);
      setTtsActive(false);
    } else {
      if (article?.textContent) {
        const result = await ipc.invoke<{ ok: boolean; supported: boolean; error?: string }>(
          IPC.READER_TTS_START,
          { text: article.textContent }
        );
        if (result.supported === false) {
          setTtsSupported(false);
          return;
        }
        if (result.ok) {
          setTtsSupported(true);
          setTtsActive(true);
        }
      }
    }
  };

  const themeStyle = THEME_STYLES[theme];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-white/10"
          style={{ backgroundColor: themeStyle.bg }}
        >
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/10 transition-colors"
            style={{ color: themeStyle.secondary }}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {/* Font size */}
            <button
              onClick={() => setFontSize(s => Math.max(12, s - 2))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors text-sm font-bold"
              style={{ color: themeStyle.secondary }}
            >A-</button>
            <button
              onClick={() => setFontSize(s => Math.min(28, s + 2))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors text-sm font-bold"
              style={{ color: themeStyle.secondary }}
            >A+</button>

            {/* Width */}
            {(['narrow', 'medium', 'wide'] as ReaderWidth[]).map(w => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`px-2 py-1 rounded text-xs transition-colors ${width === w ? 'bg-black/20' : 'hover:bg-black/10'}`}
                style={{ color: themeStyle.secondary }}
              >
                {w === 'narrow' ? '|—|' : w === 'medium' ? '|——|' : '|———|'}
              </button>
            ))}

            {/* Theme */}
            {(['light', 'dark', 'sepia'] as ReaderTheme[]).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-2 py-1 rounded text-xs capitalize transition-colors ${theme === t ? 'bg-black/20' : 'hover:bg-black/10'}`}
                style={{ color: themeStyle.secondary }}
              >
                {t}
              </button>
            ))}

            {/* TTS — hidden if platform confirmed unsupported */}
            {ttsSupported !== false && (
              <button
                onClick={handleTts}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${ttsActive ? 'bg-vyro-500/30' : 'hover:bg-black/10'}`}
                style={{ color: ttsActive ? '#a78bfa' : themeStyle.secondary }}
                title={ttsActive ? 'Stop reading' : 'Read aloud'}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: themeStyle.bg, color: themeStyle.text }}
        >
          <div className={`mx-auto px-6 py-12 ${WIDTH_CLASSES[width]}`}>
            {loading && (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-30" />
              </div>
            )}

            {error && (
              <div className="text-center py-24 opacity-50">
                <p>Failed to extract article content.</p>
                <p className="text-sm mt-2">{error}</p>
              </div>
            )}

            {article && !loading && (
              <>
                <h1 className="text-3xl font-bold leading-tight mb-4" style={{ fontSize: fontSize * 1.6 }}>
                  {article.title}
                </h1>
                {article.byline && (
                  <p className="text-sm mb-2" style={{ color: themeStyle.secondary }}>{article.byline}</p>
                )}
                {article.readingTime && (
                  <p className="text-sm mb-8" style={{ color: themeStyle.secondary }}>
                    {article.readingTime} min read
                  </p>
                )}
                <div
                  className="prose max-w-none leading-relaxed"
                  style={{ fontSize }}
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
