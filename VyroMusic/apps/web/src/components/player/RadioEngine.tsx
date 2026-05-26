'use client';
/**
 * RadioEngine — Phase 2
 *
 * A zero-UI component that lives inside the player layout.
 * When playMode === 'radio' and fewer than 5 tracks remain in the queue,
 * it silently fetches the next radio batch from the API and appends them.
 */
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/player.store';
import { api } from '@/lib/api';
import type { Track } from '@vyro/types';

export function RadioEngine() {
  const { playMode, radioSeedId, queue, queueIndex, appendToQueue, setRadioLoaded } = usePlayerStore();
  const loading = useRef(false);

  useEffect(() => {
    if (playMode !== 'radio' || !radioSeedId) return;

    const remaining = queue.length - queueIndex - 1;
    if (remaining > 5 || loading.current) return;

    loading.current = true;
    const excludeIds = queue.map(t => t.id).join(',');

    api<{ tracks: Track[] }>(`/api/recommendations/radio/${radioSeedId}?exclude=${excludeIds}`)
      .then((data) => {
        if (data.tracks?.length) {
          appendToQueue(data.tracks);
          setRadioLoaded(true);
        }
      })
      .catch(console.error)
      .finally(() => { loading.current = false; });
  }, [playMode, radioSeedId, queue.length, queueIndex, appendToQueue, setRadioLoaded]);

  return null; // no UI — pure side-effect component
}
