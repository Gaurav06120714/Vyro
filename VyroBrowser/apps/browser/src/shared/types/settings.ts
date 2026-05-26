export type Theme = 'dark' | 'light' | 'system';
export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'brave';

export interface AppSettings {
  theme: Theme;
  searchEngine: SearchEngine;
  homePage: string;
  newTabPage: 'default' | 'blank';
  fontSize: number;
  adblockEnabled: boolean;
  aiModel: string;
  aiSystemPrompt: string;
  ollamaUrl: string;
  downloadPath: string;
  readerFontSize: number;
  readerWidth: 'narrow' | 'medium' | 'wide';
  readerTheme: 'light' | 'dark' | 'sepia';
  readerFont: 'serif' | 'sans' | 'mono';
  showSidebar: boolean;
  sidebarWidth: number;
  hardwareAcceleration: boolean;
  autoUpdate: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  searchEngine: 'google',
  homePage: 'https://www.google.com',
  newTabPage: 'default',
  fontSize: 16,
  adblockEnabled: true,
  aiModel: '',
  aiSystemPrompt: 'You are a helpful browser assistant. Be concise and clear.',
  ollamaUrl: 'http://localhost:11434',
  downloadPath: '',
  readerFontSize: 18,
  readerWidth: 'medium',
  readerTheme: 'light',
  readerFont: 'serif',
  showSidebar: false,
  sidebarWidth: 380,
  hardwareAcceleration: true,
  autoUpdate: false,
};
