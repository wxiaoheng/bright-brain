import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { isDev } from './utils'

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

// IPC Handlers
ipcMain.handle('chat:sendMessage', async (event, message: string) => {
  console.log('Chat message received:', message)

  const reply = event.sender as any

  // 模拟流式响应
  const fullResponse = '这是 ' + message + ' 的模拟流式响应。流式响应可以让你看到像 ChatGPT 那样的逐字输出效果。'

  const words = fullResponse.split(' ')

  // 逐步发送每个词
  for (let i = 0; i < words.length; i++) {
    const chunk = words.slice(0, i + 1).join(' ')

    await new Promise(resolve => setTimeout(resolve, 100))

    reply.send('chat:stream', {
      chunk,
      done: false,
    })
  }

  reply.send('chat:stream', {
    done: true,
  })

  console.log('Stream completed')

  return { success: true, response: fullResponse }
})

ipcMain.handle('search:execute', async (_event, query: string) => {
  // TODO: Implement custom search logic
  return { success: true, results: [] }
})

ipcMain.handle('settings:get', async () => {
  // TODO: Implement settings retrieval
  console.log('Settings get called')
  try {
    return { success: true, settings: {} }
  } catch (error) {
    console.error('Settings get error:', error)
    return { success: false }
  }
})

ipcMain.handle('settings:save', async (_event, settings: any) => {
  // TODO: Implement settings save
  console.log('Settings save called, type:', typeof settings, 'value:', settings)
  try {
    console.log('Settings keys:', settings ? Object.keys(settings) : 'null')
    return { success: true }
  } catch (error) {
    console.error('Settings save error:', error)
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
