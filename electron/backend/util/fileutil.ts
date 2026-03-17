import { readFile } from "fs/promises"
import { existsSync, readdirSync, statSync } from "fs"
import path from 'path';

export async function exists(p: string): Promise<boolean> {
    return existsSync(p)
  }

export async function isDir(p: string): Promise<boolean> {
    try {
      return statSync(p).isDirectory()
    } catch {
      return false
    }
  }

export async function readText(p: string): Promise<string> {
    return readFile(p, "utf-8")
  }

  export async function readJson<T = any>(p: string): Promise<T> {
    return JSON.parse(await readFile(p, "utf-8"))
  }

  export async function readBytes(p: string): Promise<Buffer> {
    return readFile(p)
  }

  export async function readArrayBuffer(p: string): Promise<ArrayBuffer> {
    const buf = await readFile(p)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  }



export function getFilesRecursive(dir: string, fileList: string[] = [], excludes?:string[], limit:number=10, baseDir: string = dir): string[] {
  const files = readdirSync(dir, { withFileTypes: true })

  for (const file of files) {
    const res = path.resolve(dir, file.name);
    const relativePath = path.relative(baseDir, res);

    // 排除隐藏文件 (以.开头) 和 ss.md
    if (excludes?.find(exc=>exc === file.name)) continue;

    if (file.isDirectory()) {
      getFilesRecursive(res, fileList, excludes, limit, baseDir);
    } else {
      fileList.push(relativePath);
    }
    
    // 提前退出以优化性能
    if (fileList.length >= limit) break;
  }
  return fileList.slice(0, limit);
}