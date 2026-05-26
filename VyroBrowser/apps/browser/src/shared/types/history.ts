export interface HistoryEntry {
  id: number;
  profileId: string;
  url: string;
  title: string;
  favicon: string | null;
  visitCount: number;
  lastVisitedAt: number;
}
