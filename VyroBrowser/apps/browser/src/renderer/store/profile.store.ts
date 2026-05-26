import { create } from 'zustand';
import { Profile } from '@shared/types/profile';
import { DEFAULT_PROFILE_ID } from '@shared/constants';

interface ProfileStore {
  profiles: Profile[];
  activeProfileId: string;
  setProfiles: (p: Profile[]) => void;
  setActiveProfileId: (id: string) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profiles: [],
  activeProfileId: DEFAULT_PROFILE_ID,
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfileId: (activeProfileId) => set({ activeProfileId }),
}));
