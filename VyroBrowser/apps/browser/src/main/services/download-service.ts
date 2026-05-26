import { DownloadItem, shell } from 'electron';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Download, DownloadState } from '../../shared/types/download';

type ProgressCallback = (id: string, received: number, total: number, state: DownloadState, speed: number) => void;
type CompleteCallback = (id: string, savePath: string) => void;

export class DownloadService {
  private activeDownloads = new Map<string, DownloadItem>();
  private notifyProgress: ProgressCallback | null = null;
  private notifyComplete: CompleteCallback | null = null;

  constructor(private db: Database.Database) {}

  setProgressCallback(cb: ProgressCallback): void { this.notifyProgress = cb; }
  setCompleteCallback(cb: CompleteCallback): void { this.notifyComplete = cb; }

  handleWillDownload(profileId: string, item: DownloadItem): void {
    const id = uuidv4();
    const filename = item.getFilename();
    const url = item.getURL();
    const totalBytes = item.getTotalBytes();

    this.db.prepare(
      'INSERT INTO downloads (id, profile_id, url, filename, total_bytes) VALUES (?, ?, ?, ?, ?)'
    ).run(id, profileId, url, filename, totalBytes);

    this.activeDownloads.set(id, item);

    let lastTime = Date.now();
    let lastReceived = 0;

    item.on('updated', (_event, state) => {
      const received = item.getReceivedBytes();
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      const speed = elapsed > 0 ? (received - lastReceived) / elapsed : 0;
      lastTime = now;
      lastReceived = received;

      const dlState: DownloadState = state === 'progressing'
        ? (item.isPaused() ? 'paused' : 'in_progress')
        : 'interrupted';

      this.db.prepare(
        'UPDATE downloads SET received_bytes = ?, state = ? WHERE id = ?'
      ).run(received, dlState, id);

      this.notifyProgress?.(id, received, item.getTotalBytes(), dlState, speed);
    });

    item.once('done', (_event, state) => {
      this.activeDownloads.delete(id);
      const savePath = item.getSavePath();
      const dlState: DownloadState = state === 'completed' ? 'completed'
        : state === 'cancelled' ? 'cancelled'
        : 'interrupted';

      this.db.prepare(
        'UPDATE downloads SET state = ?, save_path = ?, completed_at = unixepoch(), received_bytes = total_bytes WHERE id = ?'
      ).run(dlState, savePath, id);

      if (state === 'completed') this.notifyComplete?.(id, savePath);
    });
  }

  getAll(profileId: string): Download[] {
    return (this.db.prepare(
      'SELECT * FROM downloads WHERE profile_id = ? ORDER BY started_at DESC'
    ).all(profileId) as Record<string, unknown>[]).map(this.toDownload);
  }

  pause(id: string): void { this.activeDownloads.get(id)?.pause(); }
  resume(id: string): void { this.activeDownloads.get(id)?.resume(); }
  cancel(id: string): void { this.activeDownloads.get(id)?.cancel(); }

  open(id: string): void {
    const row = this.db.prepare('SELECT save_path FROM downloads WHERE id = ?').get(id) as { save_path: string } | undefined;
    if (row?.save_path) shell.openPath(row.save_path);
  }

  reveal(id: string): void {
    const row = this.db.prepare('SELECT save_path FROM downloads WHERE id = ?').get(id) as { save_path: string } | undefined;
    if (row?.save_path) shell.showItemInFolder(row.save_path);
  }

  deleteRecord(id: string): void {
    this.db.prepare('DELETE FROM downloads WHERE id = ?').run(id);
  }

  clearCompleted(profileId: string): void {
    this.db.prepare(
      "DELETE FROM downloads WHERE profile_id = ? AND state IN ('completed', 'cancelled', 'interrupted')"
    ).run(profileId);
  }

  private toDownload(row: Record<string, unknown>): Download {
    return {
      id: row.id as string,
      profileId: row.profile_id as string,
      url: row.url as string,
      filename: row.filename as string,
      savePath: row.save_path as string | null,
      mimeType: row.mime_type as string | null,
      totalBytes: row.total_bytes as number,
      receivedBytes: row.received_bytes as number,
      state: row.state as DownloadState,
      startedAt: row.started_at as number,
      completedAt: row.completed_at as number | null,
    };
  }
}
