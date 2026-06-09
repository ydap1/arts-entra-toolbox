// Forwards structured log lines from the main process to the renderer's log pane
// (mirror of Write-AppLog). The renderer subscribes via window.api.onLog.

import { BrowserWindow } from 'electron'

export type LogColor =
  | 'Text'
  | 'TextDim'
  | 'Muted'
  | 'Success'
  | 'Danger'
  | 'Warning'
  | 'Accent'

export function appLog(msg: string, color: LogColor = 'TextDim'): void {
  const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
  const line = `[${ts}]  ${msg}`
  console.log(line)
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('log:line', { line, color })
  }
}
