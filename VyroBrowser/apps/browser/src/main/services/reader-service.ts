import { BrowserWindow } from 'electron';

export interface ReaderArticle {
  title: string;
  content: string;
  byline: string;
  excerpt: string;
  siteName?: string;
  textContent?: string;
}

// Reusable hidden BrowserWindow for extraction (one at a time, mutex via queue)
let hiddenWin: BrowserWindow | null = null;
let extractionBusy = false;
const extractionQueue: Array<() => void> = [];

function getOrCreateHiddenWin(): BrowserWindow {
  if (hiddenWin && !hiddenWin.isDestroyed()) return hiddenWin;
  hiddenWin = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: {
      javascript: true,
      contextIsolation: true,
    },
  });
  hiddenWin.on('closed', () => { hiddenWin = null; });
  return hiddenWin;
}

function acquireWin(): Promise<void> {
  if (!extractionBusy) {
    extractionBusy = true;
    return Promise.resolve();
  }
  return new Promise(resolve => { extractionQueue.push(resolve); });
}

function releaseWin(): void {
  const next = extractionQueue.shift();
  if (next) {
    next();
  } else {
    extractionBusy = false;
  }
}

export class ReaderService {
  async extract(url: string): Promise<ReaderArticle> {
    await acquireWin();
    const win = getOrCreateHiddenWin();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        releaseWin();
        reject(new Error('Timeout extracting reader content'));
      }, 15000);

      win.loadURL(url).catch((err: unknown) => {
        clearTimeout(timeout);
        releaseWin();
        reject(err instanceof Error ? err : new Error('Failed to load URL'));
      });

      win.webContents.once('did-finish-load', async () => {
        try {
          const html = await win.webContents.executeJavaScript(
            'document.documentElement.outerHTML'
          ) as string;

          clearTimeout(timeout);
          releaseWin();

          // Use @mozilla/readability + jsdom for clean article extraction
          let article: ReaderArticle;
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { JSDOM } = require('jsdom') as { JSDOM: new (html: string, opts?: { url?: string }) => { window: { document: Document } } };
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { Readability } = require('@mozilla/readability') as {
              Readability: new (doc: Document) => {
                parse(): {
                  title: string; content: string; textContent: string;
                  excerpt: string; byline: string; siteName: string;
                } | null
              }
            };

            const dom = new JSDOM(html, { url });
            const parsed = new Readability(dom.window.document).parse();

            if (parsed) {
              article = {
                title: parsed.title ?? '',
                content: parsed.content ?? '',
                byline: parsed.byline ?? '',
                excerpt: parsed.excerpt ?? '',
                siteName: parsed.siteName ?? undefined,
                textContent: parsed.textContent ?? undefined,
              };
            } else {
              throw new Error('Readability returned null');
            }
          } catch {
            // Fallback: basic DOM scrape if readability not available
            article = await win.webContents.executeJavaScript(`
              (function() {
                const title = document.title || '';
                const bylineMeta = document.querySelector('[name="author"]');
                const bylineEl = document.querySelector('.author, .byline, [itemprop="author"]');
                const byline = (bylineMeta ? bylineMeta.getAttribute('content') : bylineEl ? bylineEl.textContent : '') || '';
                let article = document.querySelector('article') ||
                              document.querySelector('[role="main"]') ||
                              document.querySelector('main') ||
                              document.querySelector('.post-content, .article-body, .entry-content') ||
                              document.body;
                const clone = article.cloneNode(true);
                const toRemove = clone.querySelectorAll(
                  'script,style,nav,header,footer,aside,' +
                  '.ad,.advertisement,.sidebar,.comments,' +
                  '[class*="ad-"],[id*="ad-"],[class*="social"],[class*="share"]'
                );
                toRemove.forEach(function(el) { el.remove(); });
                return {
                  title: title,
                  byline: byline.trim(),
                  content: clone.innerHTML,
                  excerpt: (clone.textContent || '').trim().slice(0, 200),
                };
              })()
            `) as ReaderArticle;
          }

          resolve(article);
        } catch (err) {
          clearTimeout(timeout);
          releaseWin();
          reject(err);
        }
      });

      win.webContents.once('did-fail-load', () => {
        clearTimeout(timeout);
        releaseWin();
        reject(new Error('Failed to load URL'));
      });
    });
  }
}
