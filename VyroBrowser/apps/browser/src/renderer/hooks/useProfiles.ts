import { useEffect, useCallback } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useProfileStore } from '../store/profile.store';
import { Profile } from '@shared/types/profile';

export function useProfiles() {
  const { profiles, activeProfileId, setProfiles, setActiveProfileId } = useProfileStore();

  useEffect(() => {
    ipc.invoke<Profile[]>(IPC.PROFILES_GET_ALL).then(setProfiles).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createProfile = useCallback(async (name: string, avatar?: string): Promise<Profile> => {
    const profile = await ipc.invoke<Profile>(IPC.PROFILES_CREATE, { name, avatar });
    const updated = await ipc.invoke<Profile[]>(IPC.PROFILES_GET_ALL);
    setProfiles(updated);
    return profile;
  }, [setProfiles]);

  const deleteProfile = useCallback(async (id: string) => {
    await ipc.invoke(IPC.PROFILES_DELETE, { id });
    const updated = await ipc.invoke<Profile[]>(IPC.PROFILES_GET_ALL);
    setProfiles(updated);
  }, [setProfiles]);

  const updateProfile = useCallback(async (id: string, fields: { name?: string; avatar?: string }): Promise<Profile> => {
    const profile = await ipc.invoke<Profile>(IPC.PROFILES_UPDATE, { id, ...fields });
    const updated = await ipc.invoke<Profile[]>(IPC.PROFILES_GET_ALL);
    setProfiles(updated);
    return profile;
  }, [setProfiles]);

  const switchProfile = useCallback(async (id: string) => {
    await ipc.invoke(IPC.PROFILES_SWITCH, { id });
    setActiveProfileId(id);
  }, [setActiveProfileId]);

  return { profiles, activeProfileId, createProfile, deleteProfile, updateProfile, switchProfile };
}
