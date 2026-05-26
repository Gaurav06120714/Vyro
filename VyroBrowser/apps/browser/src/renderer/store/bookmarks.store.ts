import { create } from 'zustand';
import { BookmarkFolder } from '@shared/types/bookmark';

interface BookmarksStore {
  tree: BookmarkFolder[];
  setTree: (tree: BookmarkFolder[]) => void;
}

export const useBookmarksStore = create<BookmarksStore>((set) => ({
  tree: [],
  setTree: (tree) => set({ tree }),
}));
