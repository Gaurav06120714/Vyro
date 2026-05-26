export type DownloadState = 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'interrupted';

export interface Download {
  id: string;
  profileId: string;
  url: string;
  filename: string;
  savePath: string | null;
  mimeType: string | null;
  totalBytes: number;
  receivedBytes: number;
  state: DownloadState;
  startedAt: number;
  completedAt: number | null;
  speed?: number; // bytes/sec, live only
  eta?: number;   // seconds remaining, live only
}
