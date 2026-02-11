import * as lancedb from '@lancedb/lancedb';
import * as arrow from "apache-arrow";
import { join } from 'path';
import { getAppPath } from '../util/util';
import { splitText } from './split/markdownSplitterService';
import { filterResult, getEmbedding, rerank } from './embedding';
import { DATA_FOLDER, VECTOR_FOLDER } from '../util/const';
import { queryItem } from '../db/db';
import { QUERY_CHUNK } from '../util/sql';

let db: lancedb.Connection | null = null;
let table: lancedb.Table | null = null;

const tableName = 'bright_knowledge';

// 初始化向量库
export async function initVectorDB() {
  // 数据库存在 userData 目录下的 vector-store 文件夹
  const dbPath = join(getAppPath(), DATA_FOLDER, VECTOR_FOLDER);

  db = await lancedb.connect(dbPath);
  
  // 检查表是否存在，不存在则创建
  const tableNames = await db.tableNames();
  
  if (!tableNames.includes(tableName)) {
      // 创建新表
    const schema = new arrow.Schema([
        new arrow.Field("source", new arrow.Utf8()),   
        new arrow.Field("text", new arrow.Utf8()),
        new arrow.Field("vector", new arrow.FixedSizeList(1024, new arrow.Field("item", new arrow.Float32()))),
        new arrow.Field("parent_id", new arrow.Utf8()),
        new arrow.Field("file_id", new arrow.Utf8()),
        new arrow.Field("file_name", new arrow.Utf8()),
        new arrow.Field("created_at", new arrow.Timestamp(arrow.TimeUnit.MILLISECOND, null))
    ]);  
    table = await db!.createEmptyTable(tableName, schema ,{ mode: "overwrite" });
    await table.createIndex("file_name", {config:lancedb.Index.fts()});
  } else {
    table = await db.openTable(tableName);
  }
}

export async function getTableNames() {
  if (!db) await initVectorDB();
  return await db!.tableNames();
}

/**
 * 添加文档到知识库
 * @param text 向量化的文本
 * @param data 需要额外存储的数据，json格式
 */
export async function addDocument(text: string, data: any) {
  if (!db) await initVectorDB();

  const docs = await splitText(text, {}, data);

  console.log(`正在处理 ${docs.length} 个切片...`);

  // 2. 向量化 + 组装数据
  const datas: any[] = [];
  for (const doc of docs) {
    try {
      const vector = await getEmbedding(doc.pageContent);
      datas.push({
        source:data.source || '',
        text: doc.pageContent,
        vector: vector,
        parent_id:doc.metadata.parentId,
        file_id:data.fileId,
        file_name:data.name,
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
    table = await db!.openTable(tableName);
    await table.add(datas);
    console.log(`成功存入 ${datas.length} 条向量数据`);
    await table.createIndex("file_name", {config:lancedb.Index.fts()});
  }
}

// 相似搜索
export async function searchSimilar(queryText: string, limit = 5, deepSearch:boolean=false, tname?:string) {
  const threshold = 0.01;
  try{
    table = await db!.openTable(tname || tableName);
    // 1. 把问题变成向量
    const queryVector = await getEmbedding(queryText);

    // 2. 搜索
    const results = await table.search(queryVector)
                              .fullTextSearch(queryText)
                              .limit(limit*4)
                              .toArray();
    const mapping = results.filter(item=>{
      return item._relevance_score>threshold;
    }).map(result=>{
      const {source, file_name, text, parent_id, _relevance_score} = result;
      return {source, name:file_name, text, parentId:parent_id, score:_relevance_score}
    });
    let finalResults = [];
    if (deepSearch){
      finalResults = await rerank(queryText, mapping, limit);
    }else{
      finalResults = filterResult(mapping, limit);
    }
    // 根据子文档搜索父文档，向量库中存储的是切分细化的子文档，展示给调用方的用父文档
    return searchParents(finalResults);
    
  }catch(err){
    console.error(err);
    return [];
  }
}

function searchParents(items:any[]){
  for (const item of items){
    let id = item.parentId;
    const chunk = queryItem(QUERY_CHUNK, id);
    if (chunk){
      item.text = chunk.content;
      item.parentId = '';
    }
  }
  return items;
}


export function removeContents(fileId:string){
  table?.delete(`file_id="${fileId}"`).then(result=>{
    console.log(result);
  });
}
