import React, { useState } from 'react';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useTabsStore } from '../../store/tabs.store';
import { BookmarkFolder, Bookmark } from '@shared/types/bookmark';

interface BookmarkItemProps {
  bookmark: Bookmark;
  onDelete: (id: number) => void;
  onOpenInTab: (url: string) => void;
}

const BookmarkItem: React.FC<BookmarkItemProps> = ({ bookmark, onDelete, onOpenInTab }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer rounded-lg mx-1 group"
        onClick={() => onOpenInTab(bookmark.url)}
        onContextMenu={e => { e.preventDefault(); setMenuOpen(v => !v); }}
      >
        {bookmark.favicon ? (
          <img src={bookmark.favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" />
        ) : (
          <div className="w-4 h-4 rounded-sm bg-white/10 shrink-0 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white/30" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <span className="text-xs text-white/70 truncate flex-1">{bookmark.title || bookmark.url}</span>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-white/30 hover:text-white transition-all"
        >
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          className="absolute right-2 top-8 z-50 bg-[var(--bg-surface)] border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/8 hover:text-white"
            onClick={() => { onOpenInTab(bookmark.url); setMenuOpen(false); }}
          >Open</button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-white/8"
            onClick={() => { onDelete(bookmark.id); setMenuOpen(false); }}
          >Delete</button>
        </div>
      )}
    </div>
  );
};

interface FolderNodeProps {
  folder: BookmarkFolder;
  onDelete: (id: number) => void;
  onOpenInTab: (url: string) => void;
  onDeleteBookmark: (id: number) => void;
}

const FolderNode: React.FC<FolderNodeProps> = ({ folder, onDelete, onOpenInTab, onDeleteBookmark }) => {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer rounded-lg mx-1 group"
        onClick={() => setOpen(v => !v)}
      >
        <svg
          className={`w-3 h-3 text-white/30 transition-transform ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <svg className="w-3.5 h-3.5 text-vyro-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <span className="text-xs text-white/60 truncate flex-1">{folder.name}</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(folder.id); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-white/20 hover:text-red-400 transition-all"
        >
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="pl-4">
          {folder.children.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              onDelete={onDelete}
              onOpenInTab={onOpenInTab}
              onDeleteBookmark={onDeleteBookmark}
            />
          ))}
          {folder.bookmarks.map(bm => (
            <BookmarkItem
              key={bm.id}
              bookmark={bm}
              onDelete={onDeleteBookmark}
              onOpenInTab={onOpenInTab}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const BookmarksPanel: React.FC = () => {
  const { tree, createFolder, deleteFolder, deleteBookmark } = useBookmarks();
  const activateTab = useTabsStore(s => s.activateTab);
  const createTab = useTabsStore(s => s.createTab);
  const tabs = useTabsStore(s => s.tabs);
  const activeTabId = useTabsStore(s => s.activeTabId);

  const openInTab = (url: string) => {
    const active = tabs.find(t => t.id === activeTabId);
    if (active) {
      // Navigate active tab via store update — main process handles actual nav via webview
      createTab({ url });
    } else {
      createTab({ url });
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt('Folder name:');
    if (name?.trim()) {
      await createFolder(name.trim());
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-white/70">Bookmarks</span>
        <button
          onClick={handleCreateFolder}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/8 transition-all"
        >
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Folder
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30 p-4">
            <svg className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            <p className="text-sm">No bookmarks yet</p>
            <p className="text-xs text-white/20 text-center">Bookmark pages using the toolbar button</p>
          </div>
        ) : (
          tree.map(folder => (
            <FolderNode
              key={folder.id}
              folder={folder}
              onDelete={deleteFolder}
              onOpenInTab={openInTab}
              onDeleteBookmark={deleteBookmark}
            />
          ))
        )}
      </div>
    </div>
  );
};
