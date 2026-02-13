import { app } from 'electron';
import { DATA_FOLDER, DB_FOLDER, FILES_FOLDER, IMAGES_FOLDER, SETTING_KEY_API_KEY, SETTING_KEY_MODEL, SETTING_KEY_MODEL_PROVIDER, VECTOR_FOLDER } from './const';
import * as fs from 'fs';
import * as path from 'path';
import {v4 as uuid} from 'uuid';
import * as iconv from 'iconv-lite';
import { chat } from '../service/chat/chatService';

export const isDev = process.env.NODE_ENV === 'development'

export function formatDateManual(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，要+1
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function getAppPath(){
  let appPath = app.getAppPath();
  if (app.isPackaged){
      appPath = path.dirname(path.dirname(appPath));
  }
  return appPath;
}

export function changeSettings(key:string, value:string){
    try {
        if (key == SETTING_KEY_API_KEY || key == SETTING_KEY_MODEL || key === SETTING_KEY_MODEL_PROVIDER){
            chat.newChatClient();
        }
    } catch (error) {
        console.error(error);
    }
}

export const serialize = (obj:any) => JSON.stringify(obj);
export const deserialize = (str:string) => JSON.parse(str);


export function constructFileData(filePath:string){
        const fileName = filePath.split(/[/\\]/).pop() || 'unknown'
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)
        const fileType = isImage ? 'image' : 'file'

        // 对于图片，读取并生成预览
        if (isImage) {
          try {
            const preview = fileToBase64(filePath)
            return {
              path: filePath,
              preview,
              name: fileName,
              type: fileType
            }
          } catch (error) {
            console.error('Error reading image:', error)
            // 如果读取失败，仍然添加文件但无预览
            return {
              path: filePath,
              preview: '',
              name: fileName,
              type: fileType
            }
          }
        } else {
          // 非图片文件直接添加
          return {
            path: filePath,
            preview: '',
            name: fileName,
            type: fileType
          }
        }
}

export function fileToBase64(filePath:string){
    const fileBuffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    let mimeType = 'image/jpeg'
    
    // 根据文件扩展名确定 MIME 类型
    if (ext === '.png') mimeType = 'image/png'
    else if (ext === '.gif') mimeType = 'image/gif'
    else if (ext === '.webp') mimeType = 'image/webp'
    else if (ext === '.bmp') mimeType = 'image/bmp'
    else if (ext === '.mp4') mimeType = 'video/mp4'
    else if (ext === '.webm') mimeType = 'video/webm'
    else if (ext === '.mov') mimeType = 'video/quicktime'
    
    const base64 = fileBuffer.toString('base64')
    return `data:${mimeType};base64,${base64}`
}

/**
 * 将Base64字符串保存为文件到指定目录
 * @param base64String - 完整的Base64字符串
 * @param filePath - 文件全路径
 * @returns Promise<string> 返回保存文件的完整路径
 */
export async function saveBase64ToFile(
    base64String: string, 
    filePath: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            
            // 分离Base64数据
            const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
            // 创建Buffer从Base64字符串
            const buffer = Buffer.from(base64Data, 'base64');
            // 写入文件
            fs.writeFile(filePath, buffer, (error) => {
                if (error) {
                    reject(new Error(`文件写入失败: ${error.message}`));
                } else {
                    console.log(`文件已保存到: ${filePath}`);
                    resolve(filePath);
                }
            });
            
        } catch (error) {
            reject(new Error(`处理Base64数据失败: ${error instanceof Error ? error.message : '未知错误'}`));
        }
    });
}


export function getLocalImagePath(fileName:string){
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  let localPath = path.join(getAppPath(), DATA_FOLDER, IMAGES_FOLDER);
  let name = uuid();
  if (ext.length){
    name = `${name}.${ext}`;
  }
  return path.join(localPath, name);
}


/**
 * 初始化存放数据的目录
 */
export function initLocalFolders(){
  const app = getAppPath();
  const data = ensureFolderExist(app, DATA_FOLDER);
  ensureFolderExist(data, IMAGES_FOLDER);
  ensureFolderExist(data, FILES_FOLDER);
  ensureFolderExist(data, DB_FOLDER);
  ensureFolderExist(data, VECTOR_FOLDER);
}

/**
 * 确保目录存在
 * @param parent 
 * @param folder 
 * @returns 
 */
export function ensureFolderExist(parent:string, folder:string){
  if (!fs.existsSync(parent)){
      fs.mkdirSync(parent);
  }
  const local = path.join(parent, folder);
  if (!fs.existsSync(local)){
      fs.mkdirSync(local);
  }
  return local;
}

function getSlidingWindows(text:string, windowSize = 512, overlap = 100) {
    if (text.length <= windowSize) return [text];
    
    const chunks:string[] = [];
    let start = 0;
    while (start < text.length) {
        // 保证切分点尽量不切断单词（简单优化，可忽略）
        let end = Math.min(start + windowSize, text.length);
        chunks.push(text.slice(start, end));
        if (end === text.length) break;
        start += (windowSize - overlap);
    }
    return chunks;
}

/**
 * 写文件
 * @param filePath 
 * @param content 
 * @param encoding 
 */
export async function writeFileContent(filePath: string, content: string, encoding:string = 'utf8') {
  const buf = iconv.encode(content, encoding);
  await fs.promises.writeFile(filePath, buf);
}