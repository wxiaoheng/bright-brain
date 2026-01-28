export interface ElectronAPI {
  chat: {
    sendMessage: (message: string) => Promise<{ success: boolean; response: string }>
    onStream: (callback: (data: any) => void) => () => void
  }
  search: {
    execute: (query: string) => Promise<{ success: boolean; results: any[] }>
  }
  settings: {
    get: () => Promise<{ success: boolean; settings: any }>
    save: (settings: any) => Promise<{ success: boolean }>
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
