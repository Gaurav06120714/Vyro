import React from 'react';
import type { TaskStatus } from '@vyro/shared-types';

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  planning:  { label: 'Planning',  color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  running:   { label: 'Running',   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  paused:    { label: 'Paused',    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  completed: { label: 'Done',      color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  failed:    { label: 'Failed',    color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
      )}
      {cfg.label}
    </span>
  );
}
