import fs from 'fs/promises';
import path from 'path';
import { MarkdownTextSplitter } from '@langchain/textsplitters';
import { MarkdownHeaderSplitter } from './markdownHeaderSplitter';
import {v4 as uuid} from 'uuid';
import { saveOrUpdate } from '../../db/db';
import { SAVE_CHUNK } from '../../util/sql';
/**
 * 切分单个 Markdown 文件
 * @param {string} filePath - 文件路径
 * @param {object} options - 覆盖默认配置
 * @returns {Promise<Array>} - 返回切分后的文档数组
 */
export async function splitFile(filePath:string, options = {}, metadata = {}) {
  try {
    // 1. 读取文件内容
    const content = await fs.readFile(path.normalize(filePath), 'utf-8');

    const allMetadata = {source:filePath, ...metadata};

    return splitText(content, options, allMetadata, false);

  } catch (error) {
    console.error(`处理文件失败: ${filePath}`, error);
    throw error;
  }
}

export async function splitText(text:string, options = {}, metadata:Record<string, any> = {}, saveDb:boolean = true) {

    // 做父子文档，先按标题切分父文档，再针对父文档进行内容切分成子文档并向量化
    const chunks = new MarkdownHeaderSplitter().splitText(text);

    const defaultOptions = {
      chunkSize: 500,    // 每个块的最大字符数
      chunkOverlap: 100,  // 块与块之间的重叠字符数（防止语义在切分处断裂）
      ...options
    };
    const splitter = new MarkdownTextSplitter(defaultOptions);
    let docs:any[] = [];
    for (const chunk of chunks){
      const chunkTitle = chunk.metadata.title;
      const chunkText = `${chunkTitle}\n${chunk.pageContent}`;
      const splits = await splitter.createDocuments([chunkText], [metadata]);
      if (saveDb){
        // 将父文档内容存到sqlite中
        const chunkId = uuid();
        saveOrUpdate(SAVE_CHUNK, chunkId, metadata.fileId, chunkTitle, chunkText)
        splits.forEach(value=>{
          value.metadata.fileId = metadata.fileId;
          value.metadata.parentId=chunkId;
          docs.push(value);
        })
      }
    }

  return docs;
}