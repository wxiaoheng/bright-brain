import * as lancedb from '@lancedb/lancedb';
import * as arrow from "apache-arrow";
import { join } from 'path';
import { getAppPath } from '../../util/util';
import { DATA_FOLDER, VECTOR_FOLDER } from '../../util/const';
import { getChunk } from '../../service/knowledgeService';
import { splitText } from './split/markdownSplitterService';
import { filterResult, getVector, rerank } from './embeddingService';

let db: lancedb.Connection | null = null;

export async function initVectorTable(tableName:string, schema:arrow.Schema){
    if (!db){
        // 数据库存在 userData 目录下的 vector-store 文件夹
        const dbPath = join(getAppPath(), DATA_FOLDER, VECTOR_FOLDER);
        db = await lancedb.connect(dbPath);
    }
    // 检查表是否存在，不存在则创建
    const tableNames = await db.tableNames();
    
    if (!tableNames?.includes(tableName)) {
        // 创建新表
        const table = await db!.createEmptyTable(tableName, schema ,{ mode: "overwrite" });
        return table;
    } else {
        return await db.openTable(tableName);
    }
}


/**
 * 添加文档到知识库
 * @param text 向量化的文本
 * @param data 需要额外存储的数据，json格式
 */
export async function addDocument(table:lancedb.Table, text: string, metadata: any) {

  const docs = await splitText(text, {}, metadata);

  console.log(`正在处理 ${docs.length} 个切片...`);

  // 2. 向量化 + 组装数据
  const datas: any[] = [];
  for (const doc of docs) {
    try {
      const vector = await getVector(doc.pageContent);
      datas.push({
        text: doc.pageContent,
        vector: vector,
        parent_id:doc.metadata.parent_id,
        ...metadata,
        created_at: Date.now()
      });
      // 避免 API 速率限制，稍微 sleep 一下
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error('Embedding failed for chunk:', e);
    }
  }

  // 3. 存入 LanceDB
  if (datas.length > 0) {
    // 追加数据
    await table.add(datas);
    console.log(`成功存入 ${datas.length} 条向量数据`);
    await table.createIndex("file_name", {config:lancedb.Index.fts()});
  }
}

// 相似搜索
export async function searchSimilar(table:lancedb.Table, queryText: string, limit = 5, deepSearch:boolean=false, mappingMetadata:any) {
  const threshold = 0.01;
  try{
    // 1. 把问题变成向量
    const queryVector = await getVector(queryText);

    // 2. 搜索
    const results = await table.query()
                              .fullTextSearch(queryText)
                              .nearestTo(queryVector)
                              .limit(limit*4)
                              .toArray();
    const mapping = results.filter(item=>{
      return item._relevance_score>threshold;
    }).map(result=>{
      return mappingMetadata(result);
    });
    let finalResults = [];
    if (deepSearch){
      finalResults = await rerank(queryText, mapping, limit);
    }else{
      finalResults = filterResult(mapping, limit);
    }
    // 根据子文档搜索父文档，向量库中存储的是切分细化的子文档，展示给调用方的用父文档
    return finalResults;
    
  }catch(err){
    console.error(err);
    return [];
  }
}
