import { useEffect, useCallback } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useBookmarksStore } from '../store/bookmarks.store';
import { BookmarkFolder, Bookmark } from '@shared/types/bookmark';

export function useBookmarks() {
  const { tree, setTree } = useBookmarksStore();

  const loadTree = useCallback(async () => {
    try {
      const result = await ipc.invoke<BookmarkFolder[]>(IPC.BOOKMARKS_GET_TREE);
      setTree(result);
    } catch (err) {
      console.error('Bookmarks load error:', err);
    }
  }, [setTree]);

  useEffect(() => {
    loadTree();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addBookmark = useCallback(async (url: string, title: string, folderId?: number, favicon?: string): Promise<Bookmark> => {
    const bookmark = await ipc.invoke<Bookmark>(IPC.BOOKMARKS_ADD, { url, title, folderId, favicon });
    await loadTree();
    return bookmark;
  }, [loadTree]);

  const updateBookmark = useCallback(async (id: number, fields: { title?: string; url?: string; folderId?: number | null }) => {
    await ipc.invoke(IPC.BOOKMARKS_UPDATE, { id, ...fields });
    await loadTree();
  }, [loadTree]);

  const deleteBookmark = useCallback(async (id: number) => {
    await ipc.invoke(IPC.BOOKMARKS_DELETE, { id });
    await loadTree();
  }, [loadTree]);

  const createFolder = useCallback(async (name: string, parentId?: number): Promise<BookmarkFolder> => {
    const folder = await ipc.invoke<BookmarkFolder>(IPC.BOOKMARKS_FOLDER_CREATE, { name, parentId });
    await loadTree();
    return folder;
  }, [loadTree]);

  const deleteFolder = useCallback(async (id: number) => {
    await ipc.invoke(IPC.BOOKMARKS_FOLDER_DELETE, { id });
    await loadTree();
  }, [loadTree]);

  const exportBookmarks = useCallback(async (): Promise<string> => {
    return ipc.invoke<string>(IPC.BOOKMARKS_EXPORT);
  }, []);

  const importBookmarks = useCallback(async (html: string): Promise<number> => {
    const result = await ipc.invoke<{ count: number }>(IPC.BOOKMARKS_IMPORT, { html });
    await loadTree();
    return result.count;
  }, [loadTree]);

  return { tree, addBookmark, updateBookmark, deleteBookmark, createFolder, deleteFolder, exportBookmarks, importBookmarks, reload: loadTree };
}
