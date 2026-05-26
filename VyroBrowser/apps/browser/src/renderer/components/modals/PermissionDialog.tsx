import React, { useEffect, useState } from 'react';
import { Modal } from '../shared/Modal';
import { useUiStore } from '../../store/ui.store';
import { ipc, IPC } from '../../lib/ipc';

interface PermissionRequest {
  requestId: string;
  permission: string;
  origin: string;
}

export const PermissionDialog: React.FC = () => {
  const closeModal = useUiStore(s => s.closeModal);
  const [request, setRequest] = useState<PermissionRequest | null>(null);

  useEffect(() => {
    const off = ipc.on(IPC.PERMISSION_REQUEST, (...args: unknown[]) => {
      setRequest(args[0] as PermissionRequest);
    });
    return off;
  }, []);

  const respond = async (granted: boolean) => {
    if (!request) return;
    await ipc.invoke(IPC.PERMISSION_RESPOND, { requestId: request.requestId, granted });
    setRequest(null);
    closeModal();
  };

  if (!request) return null;

  return (
    <Modal open title="Permission Request" onClose={() => respond(false)}>
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-white/70">
          <span className="text-white font-medium">{request.origin}</span> is requesting permission for{' '}
          <span className="text-vyro-400 font-medium">{request.permission}</span>.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => respond(false)} className="px-4 py-1.5 text-white/50 hover:text-white rounded-lg transition-colors">
            Block
          </button>
          <button onClick={() => respond(true)} className="px-4 py-1.5 bg-vyro-600 hover:bg-vyro-500 text-white rounded-lg transition-colors">
            Allow
          </button>
        </div>
      </div>
    </Modal>
  );
};
