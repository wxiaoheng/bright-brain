import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import {v4 as uuid} from 'uuid';
import { initSqlite } from './backend/service/dbService';
import { changeSettings, constructFileData, getLocalImagePath, fileToBase64, saveBase64ToFile, isDev, initLocalFolders } from './backend/util/util';
import { fileURLToPath } from 'url'
import { getAllSettings, initSettings, saveSetting } from './backend/service/settingService';
import { deleteSession, getMessages, getSessions, initMessages, saveMessages, saveSessions, sessionExists, updateSessionTime } from './backend/service/messageService';
import { deleteKnowledge, getKnowledges, initKnowledges, saveKnowledge, searchSimilarKnowledge } from './backend/service/knowledgeService';
import { chat } from './backend/service/chat/chatService';
import { initServer } from './backend/server/server';

let mainWindow: BrowserWindow | null = null

// 在app.whenReady之前启用调试端口
if (isDev) {
  console.log('Enabling debug ports: 9222 (renderer), 9223 (main)')
  // 渲染进程调试端口
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
  // 主进程调试端口
  require('inspector').open(9223, '0.0.0.0', true)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    frame: false,
    titleBarStyle: 'hidden',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window loaded')
  })

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log('Renderer console:', message)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {

  initLocalFolders();

  initSqlite();
  
  initSettings();
  initMessages();
  initKnowledges();

  initServer();

  // IPC Handlers
  ipcMain.handle('chat:sendMessage', async (event, message: string, filePaths?: string[], sessionId?:string) => {
    console.log('Chat message received:', message, 'Files:', filePaths)
    const reply = event.sender as any
    if (!sessionId){
      sessionId = uuid();
    }
    if (!sessionExists(sessionId)){
      const title = message.length>30 ? message.substring(0, 30) : message || (filePaths && filePaths.length > 0 ? `[已上传 ${filePaths.length} 个文件]` : '新对话')
      saveSessions(sessionId, title);
    }
    try {
      const {answer, references} = await chat.streamingChat(message, filePaths || [], sessionId, reply);
      let attachments = '';
      if (filePaths?.length){
        const datas = filePaths.map(value=>{
          let data = constructFileData(value);
          let localPath = getLocalImagePath(data.name);
          saveBase64ToFile(data.preview, localPath);
          data.preview = localPath;
          return data;
        })
        attachments = JSON.stringify(datas);
      }
      saveMessages(sessionId, 'user', message, attachments, JSON.stringify(references))
      saveMessages(sessionId, 'assistant',answer, '', '')
      updateSessionTime(sessionId);
      return { success: true}
    } catch (error:any) {
      reply.send('chat:stream', {
            chunk:error.message,
            sessionId,
            done: true,
        })
      return { success: false}  
    }
  })

  ipcMain.handle('search:execute', async (_event, query: string, deepSearch = false) => {
    const results = await searchSimilarKnowledge(query, deepSearch);
    return { success: true, results:results }
  })

  // 统一由主进程判断打开方式：http(s) 用浏览器，本地路径 / file:// 用系统打开文件
  ipcMain.handle('shell:open', async (_event, target: string) => {
    const trimmed = (target || '').trim()
    if (!trimmed) return { success: false, error: 'empty target' }

    try {
      if (/^https?:\/\//i.test(trimmed)) {
        await shell.openExternal(trimmed)
        return { success: true }
      }

      const filePath = trimmed.startsWith('file://') ? fileURLToPath(trimmed) : trimmed
      const error = await shell.openPath(filePath)
      if (error) return { success: false, error }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) }
    }
  })

  ipcMain.handle('settings:get', async () => {
    try {
      return { success: true, settings:getAllSettings() }
    } catch (error) {
      console.error('Settings get error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('settings:save', async (_event, key:string, value:any) => {
    try {
      saveSetting(key, value);
      changeSettings(key, value);
      return { success: true }
    } catch (error) {
      console.error('Settings save error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('sessions:get', async ()=>{
    try {
      const sessions = getSessions();
      return { success: true, sessions }
    } catch (error) {
      console.error('sessions get error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('sessions:delete', async (_event, sessionId:string)=>{
    try {
      deleteSession(sessionId);
      return { success: true }
    } catch (error) {
      console.error('sessions get error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('messages:get', async (_event, sessionId:string)=>{
    try {
      const results = getMessages(sessionId);
      let messages:any[] = [];
      if (results && Array.isArray(results)){
        messages = results.map(value=>{
          let localPath = value.preview;
          if (localPath?.length){
            value.preview = fileToBase64(localPath);
          }
          return value;
        })
      }
      return { success: true, messages }
    } catch (error) {
      console.error('messages get error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('window:minimize', () => {
    console.log('Minimize called')
    if (mainWindow) {
      mainWindow.minimize()
    }
  })

  ipcMain.handle('window:maximize', () => {
    console.log('Maximize called')
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.handle('window:close', () => {
    console.log('Close called')
    if (mainWindow) {
      mainWindow.close()
    }
  })

  ipcMain.handle('dialog:showOpenDialog', async (_event, options?: { filters?: Array<{ name: string; extensions: string[] }>; multiple?: boolean; directory?: boolean }) => {
    if (!mainWindow) {
      return { canceled: true, filePaths: [] }
    }
    const dirMode = options?.directory === true
    const properties: ('openFile' | 'openDirectory' | 'multiSelections')[] = dirMode
      ? (options?.multiple ? ['openDirectory', 'multiSelections'] : ['openDirectory'])
      : (options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'])
    const result = await dialog.showOpenDialog(mainWindow, {
      properties,
      filters: options?.filters || [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
        { name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return {
      canceled: result.canceled,
      filePaths: result.filePaths
    }
  })

  ipcMain.handle('knowledge:list', async () => {
    try {
      const items = getKnowledges();
      return { success: true, items: items || [] }
    } catch (error) {
      console.error('knowledge list error:', error)
      return { success: false, items: [] }
    }
  })

  ipcMain.handle('knowledge:add', async (_event, item: { type: 'file' | 'directory' | 'url'; source: string; name?: string; id?:string }) => {
    try {
      const oldId = item.id;
      const id = uuid();
      if (oldId){
        await deleteKnowledge(oldId);
      }
      await saveKnowledge(id, item.type, item.source, item.name);
      return { success: true }
    } catch (error) {
      console.error('knowledge add error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('knowledge:remove', async (_event, id: string) => {
    try {
      await deleteKnowledge(id);
      return { success: true }
    } catch (error) {
      console.error('knowledge remove error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('file:readAsDataURL', async (_event, filePath: string) => {
    return constructFileData(filePath);
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})