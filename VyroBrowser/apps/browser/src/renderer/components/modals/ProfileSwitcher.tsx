import React, { useState } from 'react';
import { useProfiles } from '../../hooks/useProfiles';

const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
  'bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
];

function profileColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface Props {
  onClose: () => void;
}

export const ProfileSwitcher: React.FC<Props> = ({ onClose }) => {
  const { profiles, activeProfileId, switchProfile, createProfile, deleteProfile } = useProfiles();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProfile(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  const handleSwitch = async (id: string) => {
    await switchProfile(id);
    onClose();
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await deleteProfile(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[var(--bg-base)] border border-white/10 rounded-2xl shadow-2xl w-80 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <span className="font-medium text-white/80 text-sm">Switch Profile</span>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="py-2 max-h-72 overflow-y-auto">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer group"
              onClick={() => handleSwitch(profile.id)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${profileColor(profile.id)}`}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-white/70 flex-1 truncate">{profile.name}</span>
              {activeProfileId === profile.id && (
                <svg className="w-4 h-4 text-vyro-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {activeProfileId !== profile.id && !profile.isDefault && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(profile.id); }}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded text-xs transition-all ${
                    confirmDelete === profile.id ? 'text-red-400 opacity-100' : 'text-white/30 hover:text-red-400'
                  }`}
                  title={confirmDelete === profile.id ? 'Click again to confirm' : 'Delete profile'}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-white/8 p-3">
          {showCreate ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Profile name"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-vyro-500/50"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-3 py-1.5 rounded-lg text-sm bg-vyro-600/80 text-white hover:bg-vyro-500 transition-all disabled:opacity-40"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="px-2 py-1.5 rounded-lg text-sm text-white/40 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              New Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
