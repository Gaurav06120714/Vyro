export interface Bookmark {
  id: number;
  profileId: string;
  folderId: number | null;
  url: string;
  title: string;
  favicon: string | null;
  sortIndex: number;
  createdAt: number;
}

export interface BookmarkFolder {
  id: number;
  profileId: string;
  parentId: number | null;
  name: string;
  sortIndex: number;
  createdAt: number;
  children: BookmarkFolder[];
  bookmarks: Bookmark[];
}
