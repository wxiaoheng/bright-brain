import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  chat: {
    sendMessage: (message: string, filePaths?: string[], sessionId?:string) => ipcRenderer.invoke('chat:sendMessage', message, filePaths || [], sessionId),
    onStream: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('chat:stream', listener)
      return () => ipcRenderer.removeListener('chat:stream', listener)
    },
  },
  search: {
    execute: (query: string, deepSearch = false) => ipcRenderer.invoke('search:execute', query, deepSearch),
  },
  shell: {
    open: (target: string) => ipcRenderer.invoke('shell:open', target),
  },
  settings: {
    get: () => {
      console.log('Preload: Calling settings:get')
      return ipcRenderer.invoke('settings:get')
    },
    save: (key:string, value:any) => {
      console.log('Preload: Calling settings:save with:', key, value)
      return ipcRenderer.invoke('settings:save', key, value)
    },

  },
  sessions:{
    get: ()=> {
      return ipcRenderer.invoke('sessions:get')
    },
    delete:(sessionId:string)=>{
      return ipcRenderer.invoke('sessions:delete', sessionId);
    }
  },
  messages:{
    get: (sessionId:string)=> {
      return ipcRenderer.invoke('messages:get', sessionId);
    }
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
  dialog: {
    showOpenDialog: (options?: { filters?: Array<{ name: string; extensions: string[] }>; multiple?: boolean; directory?: boolean }) => {
      return ipcRenderer.invoke('dialog:showOpenDialog', options)
    },
  },
  knowledge: {
    list: () => ipcRenderer.invoke('knowledge:list'),
    add: (item: { type: 'file' | 'directory' | 'url'; source: string; name?: string; id?:string }) => ipcRenderer.invoke('knowledge:add', item),
    remove: (id: string) => ipcRenderer.invoke('knowledge:remove', id),
  },
  file: {
    readAsDataURL: (filePath: string) => {
      return ipcRenderer.invoke('file:readAsDataURL', filePath)
    },
  },
})

console.log('Preload script loaded')

