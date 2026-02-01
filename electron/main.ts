import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { formatDateManual, isDev } from './utils'
import {v4 as uuid} from 'uuid';
import { createTable, queryItem, queryItems, saveOrUpdate } from './backend/db/db';
import { CREAT_SETTINGS_TABLE, CREATE_MESSAGES_TABLE, CREATE_SESSIONS_TABLE, DELETE_SESSION, EXISTS_SESSION, QUERY_MESSAGES_WITH_SESSION_ID, QUERY_SESSIONS, QUERY_SETTINGS, SAVE_MESSAGES, SAVE_SESSIONS, SAVE_SETTINGS, UPDATE_SESSION_TIME } from './backend/util/sql';
import { chat } from './backend/llm/chat';
import { changeSettings } from './backend/util/util';

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

  createTable(CREAT_SETTINGS_TABLE);
  createTable(CREATE_SESSIONS_TABLE);
  createTable(CREATE_MESSAGES_TABLE);

  // IPC Handlers
  ipcMain.handle('chat:sendMessage', async (event, message: string, sessionId?:string) => {
    console.log('Chat message received:', message)
    const reply = event.sender as any
    if (!sessionId){
      sessionId = uuid();
    }
    const exsit = queryItem(EXISTS_SESSION, sessionId);
    if (exsit.num == 0){
      saveOrUpdate(SAVE_SESSIONS, sessionId, message.length>30 ? message.substring(0, 30) : message)
    }
    try {
      const answer = await chat.streamingChat(message, sessionId, reply);
      saveOrUpdate(SAVE_MESSAGES, sessionId, 'user', message);
      saveOrUpdate(SAVE_MESSAGES, sessionId, 'assistant',answer);
      saveOrUpdate(UPDATE_SESSION_TIME , formatDateManual(new Date()), sessionId);
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

  ipcMain.handle('search:execute', async (_event, query: string) => {
    // TODO: Implement custom search logic
    return { success: true, results: [] }
  })

  ipcMain.handle('settings:get', async () => {
    try {
      const result = queryItems(QUERY_SETTINGS);
      let settings = {};
      if (result && Array.isArray(result)){
        settings = Object.fromEntries(
          result.map(item => [item.key, item.value])
        );
      }
      return { success: true, settings }
    } catch (error) {
      console.error('Settings get error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('settings:save', async (_event, key:string, value:any) => {
    try {
      saveOrUpdate(SAVE_SETTINGS, key, value);
      changeSettings(key, value);
      return { success: true }
    } catch (error) {
      console.error('Settings save error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('sessions:get', async ()=>{
    try {
      const sessions = queryItems(QUERY_SESSIONS);
      return { success: true, sessions }
    } catch (error) {
      console.error('sessions get error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('sessions:delete', async (_event, sessionId:string)=>{
    try {
      saveOrUpdate(DELETE_SESSION, sessionId);
      return { success: true }
    } catch (error) {
      console.error('sessions get error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('messages:get', async (_event, sessionId:string)=>{
    try {
      const messages = queryItems(QUERY_MESSAGES_WITH_SESSION_ID, sessionId);
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