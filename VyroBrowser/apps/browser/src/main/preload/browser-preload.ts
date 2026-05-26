import { contextBridge, ipcRenderer } from 'electron';
import { INVOKE_ALLOWLIST, PUSH_ALLOWLIST, IpcChannel } from '../../shared/ipc-channels';

const allowedInvoke = new Set<string>([...INVOKE_ALLOWLIST, 'shell:open-external']);
const allowedPush   = new Set<string>(PUSH_ALLOWLIST);

contextBridge.exposeInMainWorld('vyro', {
  invoke: (channel: IpcChannel, ...args: unknown[]) => {
    if (!allowedInvoke.has(channel)) throw new Error(`IPC invoke blocked: ${channel}`);
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: IpcChannel, listener: (...args: unknown[]) => void) => {
    if (!allowedPush.has(channel)) throw new Error(`IPC on blocked: ${channel}`);
    const wrapped = (_: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
  off: (channel: IpcChannel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  platform: process.platform,
});
