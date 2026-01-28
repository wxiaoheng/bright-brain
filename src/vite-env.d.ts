declare module 'electron' {
  export interface IpcRendererInvokeEvent {
    sender: WebContents
  }
}
