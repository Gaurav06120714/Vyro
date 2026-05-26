import { IPC, IpcChannel } from '@shared/ipc-channels';

declare global {
  interface Window {
    vyro: {
      invoke: (channel: IpcChannel, ...args: unknown[]) => Promise<unknown>;
      on: (channel: IpcChannel, listener: (...args: unknown[]) => void) => () => void;
      off: (channel: IpcChannel) => void;
      platform: string;
    };
  }
}

export const ipc = {
  invoke<T = unknown>(channel: IpcChannel, ...args: unknown[]): Promise<T> {
    return window.vyro.invoke(channel, ...args) as Promise<T>;
  },
  on(channel: IpcChannel, listener: (...args: unknown[]) => void): () => void {
    return window.vyro.on(channel, listener);
  },
};

export { IPC };
