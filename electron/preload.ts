import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  chat: {
    sendMessage: (message: string) => ipcRenderer.invoke('chat:sendMessage', message),
    onStream: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('chat:stream', listener)
      return () => ipcRenderer.removeListener('chat:stream', listener)
    },
  },
  search: {
    execute: (query: string) => ipcRenderer.invoke('search:execute', query),
  },
  settings: {
    get: () => {
      console.log('Preload: Calling settings:get')
      return ipcRenderer.invoke('settings:get')
    },
    save: (settings: any) => {
      console.log('Preload: Calling settings:save with:', settings)
      return ipcRenderer.invoke('settings:save', settings)
    },
  },
  window: {
    minimize: () => {
      console.log('Preload: Calling minimize')
      return ipcRenderer.invoke('window:minimize')
    },
    maximize: () => {
      console.log('Preload: Calling maximize')
      return ipcRenderer.invoke('window:maximize')
    },
    close: () => {
      console.log('Preload: Calling close')
      return ipcRenderer.invoke('window:close')
    },
  },
})

console.log('Preload script loaded')

