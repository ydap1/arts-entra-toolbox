import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

// Thin, channel-agnostic bridge. The renderer's typed `api` wrapper (renderer/src/api.ts)
// supplies the channel names; tokens never cross this boundary.
const bridge = {
  invoke: (channel: string, payload?: unknown): Promise<unknown> =>
    ipcRenderer.invoke(channel, payload),
  onLog: (cb: (line: string, color: string) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, data: { line: string; color: string }): void =>
      cb(data.line, data.color)
    ipcRenderer.on('log:line', handler)
    return () => ipcRenderer.removeListener('log:line', handler)
  }
}

contextBridge.exposeInMainWorld('bridge', bridge)

export type Bridge = typeof bridge
