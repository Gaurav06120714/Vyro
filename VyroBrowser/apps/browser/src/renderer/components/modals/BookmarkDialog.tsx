import React from 'react';
import { Modal } from '../shared/Modal';
import { useUiStore } from '../../store/ui.store';
import { useTabsStore } from '../../store/tabs.store';
import { ipc, IPC } from '../../lib/ipc';
import { DEFAULT_PROFILE_ID } from '@shared/constants';

export const BookmarkDialog: React.FC = () => {
  const closeModal = useUiStore(s => s.closeModal);
  const activeTab = useTabsStore(s => s.activeTab());
  const addToast = useUiStore(s => s.addToast);

  const handleSave = async () => {
    if (!activeTab) return;
    try {
      await ipc.invoke(IPC.BOOKMARKS_ADD, {
        profileId: activeTab.profileId ?? DEFAULT_PROFILE_ID,
        url: activeTab.url,
        title: activeTab.title,
        favicon: activeTab.favicon,
        folderId: null,
      });
      addToast('Bookmark saved', 'success');
    } catch {
      addToast('Failed to save bookmark', 'error');
    }
    closeModal();
  };

  return (
    <Modal open title="Add Bookmark" onClose={closeModal}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-white/70 truncate">{activeTab?.url}</p>
        <div className="flex justify-end gap-2">
          <button onClick={closeModal} className="px-4 py-1.5 text-sm text-white/50 hover:text-white rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-vyro-600 hover:bg-vyro-500 text-white rounded-lg transition-colors">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};
