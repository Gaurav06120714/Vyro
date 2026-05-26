import React, { useState, useEffect, useCallback } from 'react';
import { useDownloads } from '../../hooks/useDownloads';
import { ipc, IPC } from '../../lib/ipc';
import { Download, DownloadState } from '@shared/types/download';

function formatBytes(n: number): string {
  if (n === 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

function formatEta(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

const STATE_BADGE: Record<DownloadState, { label: string; className: string }> = {
  in_progress: { label: 'Downloading', className: 'bg-blue-500/20 text-blue-400' },
  paused: { label: 'Paused', className: 'bg-yellow-500/20 text-yellow-400' },
  completed: { label: 'Done', className: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelled', className: 'bg-white/10 text-white/40' },
  interrupted: { label: 'Failed', className: 'bg-red-500/20 text-red-400' },
};

interface DownloadRowProps {
  download: Download;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onOpen: (id: string) => void;
  onReveal: (id: string) => void;
  onDelete: (id: string) => void;
}

const DownloadRow: React.FC<DownloadRowProps> = ({ download, onPause, onResume, onOpen, onReveal, onDelete }) => {
  const d = download;
  const progress = d.totalBytes > 0 ? (d.receivedBytes / d.totalBytes) * 100 : 0;
  const badge = STATE_BADGE[d.state];
  const isActive = d.state === 'in_progress';
  const isDone = d.state === 'completed';

  return (
    <div className="px-3 py-3 hover:bg-white/3 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-white/80 truncate">{d.filename}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <p className="text-[10px] text-white/30 truncate mb-2">{d.url}</p>

      {/* Progress bar */}
      {(isActive || d.state === 'paused') && d.totalBytes > 0 && (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-full transition-all ${isActive ? 'bg-vyro-400' : 'bg-white/30'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {/* Stats */}
      {(isActive || d.state === 'paused') && (
        <p className="text-[10px] text-white/40 mb-2">
          {formatBytes(d.receivedBytes)} / {formatBytes(d.totalBytes)}
          {isActive && d.speed && d.speed > 0 && ` · ${formatSpeed(d.speed)}`}
          {isActive && d.eta !== undefined && d.eta > 0 && ` · ${formatEta(d.eta)} left`}
        </p>
      )}

      {isDone && (
        <p className="text-[10px] text-white/40 mb-2">{formatBytes(d.totalBytes)}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {isActive && (
          <button
            onClick={() => onPause(d.id)}
            className="text-[10px] px-2 py-0.5 rounded bg-white/8 text-white/50 hover:text-white transition-all"
          >Pause</button>
        )}
        {d.state === 'paused' && (
          <button
            onClick={() => onResume(d.id)}
            className="text-[10px] px-2 py-0.5 rounded bg-white/8 text-white/50 hover:text-white transition-all"
          >Resume</button>
        )}
        {isDone && d.savePath && (
          <>
            <button
              onClick={() => onOpen(d.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-white/8 text-white/50 hover:text-white transition-all"
            >Open</button>
            <button
              onClick={() => onReveal(d.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-white/8 text-white/50 hover:text-white transition-all"
            >Show in Finder</button>
          </>
        )}
        <button
          onClick={() => onDelete(d.id)}
          className="text-[10px] px-2 py-0.5 rounded bg-white/8 text-red-400/60 hover:text-red-400 transition-all ml-auto"
        >Remove</button>
      </div>
    </div>
  );
};

export const DownloadsPanel: React.FC = () => {
  const { downloads, pause, resume, openFile, revealFile, deleteRecord, clearCompleted } = useDownloads();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDownloads = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      // useDownloads fetches on mount; just wait a tick to confirm data is loaded
      await ipc.invoke(IPC.DOWNLOADS_GET_ALL);
    } catch {
      setError('Failed to load downloads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Mark loading done once downloads are fetched (initial mount)
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-white/70">Downloads</span>
        <button
          onClick={clearCompleted}
          className="text-xs text-white/40 hover:text-white transition-all"
        >
          Clear completed
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
            <svg className="w-8 h-8 text-red-400/50" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-white/50">{error}</p>
            <button onClick={loadDownloads} className="px-3 py-1.5 text-xs rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white transition-all">
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-3 p-3 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="flex flex-col gap-2 py-2">
                <div className="h-3 rounded bg-white/8 w-2/3" />
                <div className="h-2.5 rounded bg-white/5 w-full" />
                <div className="h-1 rounded-full bg-white/8 w-full mt-1" />
              </div>
            ))}
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30 p-4">
            <svg className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">No downloads yet</p>
            <p className="text-xs text-white/20 text-center">Files you download will appear here</p>
          </div>
        ) : (
          downloads.map(d => (
            <DownloadRow
              key={d.id}
              download={d}
              onPause={pause}
              onResume={resume}
              onOpen={openFile}
              onReveal={revealFile}
              onDelete={deleteRecord}
            />
          ))
        )}
      </div>
    </div>
  );
};
