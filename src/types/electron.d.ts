export interface ElectronAPI {
  chat: {
    sendMessage: (message: string, filePaths?: string[], sessionId?:string) => Promise<{ success: boolean; response: string }>
    onStream: (callback: (data: any) => void) => () => void
  }
  search: {
    execute: (query: string) => Promise<{ success: boolean; results: any[] }>
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
    showOpenDialog: (options?: { filters?: Array<{ name: string; extensions: string[] }>; multiple?: boolean }) => Promise<{ canceled: boolean; filePaths: string[] }>
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
