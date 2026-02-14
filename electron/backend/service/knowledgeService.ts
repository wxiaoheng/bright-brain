import { createTable, queryItem, queryItems, saveOrUpdate } from "./dbService";
import { addDocument, initVectorTable, searchSimilar } from "./rag/vectorService";
import * as lancedb from '@lancedb/lancedb';
import * as arrow from "apache-arrow";
import { getSearchLimit } from "./settingService";
import path from "path";
import fs from 'fs';
import * as iconv from 'iconv-lite';
import { getMdContent } from "../util/url2md";
import { getAppPath, writeFileContent } from "../util/util";
import { DATA_FOLDER, FILES_FOLDER } from "../util/const";


// 知识源表（文件/目录/URL）
const CREATE_KNOWLEDGE_TABLE = `
  CREATE TABLE IF NOT EXISTS knowledges (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )
`;
const QUERY_KNOWLEDGE = `SELECT * FROM knowledges ORDER BY created_at DESC`;
const QUERY_KNOWLEDGE_WITH_SOURCE = `SELECT * FROM knowledges where source=?`;
const SAVE_KNOWLEDGE = `INSERT INTO knowledges (id, type, source, name) VALUES (?,?, ?, ?)`;
const DELETE_KNOWLEDGE = `DELETE FROM knowledges WHERE id = ?`;


const CREATE_CHUNKS_TABLE = `
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )
`

const QUERY_CHUNK = `SELECT * FROM chunks where id = ?`;
const SAVE_CHUNK = `INSERT INTO chunks (id, file_id, title, content) VALUES (?,?, ?, ?)`;
const DELETE_CHUNK = `DELETE FROM chunks WHERE file_id = ?`;

const vectorTableName = 'bright_knowledge';

let table:lancedb.Table;
export async function initKnowledges(){
    createTable(CREATE_KNOWLEDGE_TABLE);
    createTable(CREATE_CHUNKS_TABLE);

    const schema = new arrow.Schema([
        new arrow.Field("source", new arrow.Utf8()),   
        new arrow.Field("text", new arrow.Utf8()),
        new arrow.Field("vector", new arrow.FixedSizeList(1024, new arrow.Field("item", new arrow.Float32()))),
        new arrow.Field("parent_id", new arrow.Utf8()),
        new arrow.Field("file_id", new arrow.Utf8()),
        new arrow.Field("file_name", new arrow.Utf8()),
        new arrow.Field("created_at", new arrow.Timestamp(arrow.TimeUnit.MILLISECOND, null))
    ]);  
    table = await initVectorTable(vectorTableName, schema);
    await table.createIndex("text", {config:lancedb.Index.fts()});
}

export function getKnowledges(){
    return queryItems(QUERY_KNOWLEDGE) || [];
}

export function getKnowledgeWithSource(source:string){
    return queryItem(QUERY_KNOWLEDGE_WITH_SOURCE, source);
}

export function getChunk(id:string){
    return queryItem(QUERY_CHUNK, id);
}

export async function saveKnowledge(id:string, type:'file'|'url'|'directory', source?:string, name?:string, body?:string){
    saveOrUpdate(SAVE_KNOWLEDGE, id, type, source, name || source)
    await addKnowledgeToVector(id, type, name|| '', source || '', body);
}

export function saveChunk(chunkId:string, fileId:string, title:string, text:string){
    saveOrUpdate(SAVE_CHUNK, chunkId, fileId, title, text)
}


export async function deleteKnowledge(id:string){
    saveOrUpdate(DELETE_KNOWLEDGE, id);
    saveOrUpdate(DELETE_CHUNK, id);
    await removeVectorContents(id);
    const file = path.join(getAppPath(), DATA_FOLDER, FILES_FOLDER, `${id}.md`);
    if (fs.existsSync(file)){
      fs.rmSync(file);
    }
}

export async function searchSimilarKnowledge(question:string, deepSearch:boolean){
  const results = await searchSimilar(table, question, getSearchLimit(), deepSearch, mappingMetadata);
  return searchParents(results);
}

function searchParents(items:any[]){
  for (const item of items){
    let id = item.parentId;
    const chunk = getChunk(id);
    if (chunk){
      item.text = chunk.content;
      item.parentId = '';
    }
  }
  return items;
}

function mappingMetadata(result:any){
  const {source, file_name, text, parent_id, _relevance_score} = result;
  return {source, name:file_name, text, parentId:parent_id, score:_relevance_score}
}

async function addKnowledgeToVector(id:string, type:string, name:string, source:string, body?:string){
  if (type === 'file'){
    if (!name){
      name = path.basename(source);
    }
    const ext = path.extname(source);
    if (ext == '.md'){
      // markdown文档
      if (!body){
        const buf = fs.readFileSync(source);
        body = iconv.decode(buf, 'utf8');
      }
      addDocument(table, body, {source, file_name:name, file_id:id})
    }
  }else if (type === 'directory'){

  }else {
    const {title, content} = await getMdContent(source, body);
    if (content){
      const filePath = path.join(getAppPath(), DATA_FOLDER, FILES_FOLDER, `${id}.md`);
      writeFileContent(filePath, content);
      addDocument(table, content, {source, file_name:title || name, file_id:id})
    }
  }
}

async function removeVectorContents(fileId:string){
  await table?.delete(`file_id="${fileId}"`);
}
