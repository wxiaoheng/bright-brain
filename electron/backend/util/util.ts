import { app } from 'electron';
import { chat } from "../llm/chat";
import { SETTING_KEY_API_KEY, SETTING_KEY_MODEL, SETTING_KEY_MODEL_PROVIDER } from './const';
import * as fs from 'fs';
import * as path from 'path';
import {v4 as uuid} from 'uuid';

export function getAppPath(){
  let appPath = app.getAppPath();
  if (fs.statSync(appPath).isFile()){
      appPath = path.dirname(appPath);
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
            const preview = readFileData(filePath)
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
  let localPath = path.join(getAppPath(), 'images');
  if (!fs.existsSync(localPath)){
      fs.mkdirSync(localPath);
  }
  let name = uuid();
  if (ext.length){
    name = `${name}.${ext}`;
  }
  return path.join(localPath, name);
}
