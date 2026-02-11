export interface KnowledgeSourceItem {
  id: string
  type: 'file' | 'directory' | 'url'
  source: string
  name: string | null
  created_at: string
}

export interface ElectronAPI {
  chat: {
    sendMessage: (message: string, filePaths?: string[], sessionId?:string) => Promise<{ success: boolean; response: string }>
    onStream: (callback: (data: any) => void) => () => void
  }
  search: {
    execute: (query: string, deepSearch?: boolean) => Promise<{ success: boolean; results: any[] }>
  }
  shell: {
    open: (target: string) => Promise<{ success: boolean; error?: string }>
  }
  settings: {
    get: () => Promise<{ success: boolean; settings: any }>
    save: (key:string, value:any) => Promise<{ success: boolean }>
  }
  sessions:{
    get: ()=> Promise<{ success: boolean; sessions: any }> 
    delete:(sessionId:string)=> Promise<{ success: boolean }>
  }
  messages:{
    get: (sessionId:string)=> Promise<{ success: boolean; messages: any[] }>
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
  dialog: {
    showOpenDialog: (options?: { filters?: Array<{ name: string; extensions: string[] }>; multiple?: boolean; directory?: boolean }) => Promise<{ canceled: boolean; filePaths: string[] }>
  }
  knowledge: {
    list: () => Promise<{ success: boolean; items: KnowledgeSourceItem[] }>
    add: (item: { type: 'file' | 'directory' | 'url'; source: string; name?: string; id?:string}) => Promise<{ success: boolean }>
    remove: (id: string) => Promise<{ success: boolean }>
  }
  file: {
    readAsDataURL: (filePath: string) => Promise<{path: string,preview:string,name: string, type: "video" | "image" | "file"}>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
