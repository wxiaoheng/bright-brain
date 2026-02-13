import { createTable, queryItem, queryItems, saveOrUpdate } from "./dbService";
import { formatDateManual } from "../util/util";

// session表建表语句
export const CREATE_SESSIONS_TABLE = `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY ,
      title TEXT NOT NULL,
      del INTEGER DEFAULT 0,
      
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )
  `;
// 查询所有session列表
export const QUERY_SESSIONS = `SELECT * FROM sessions WHERE del = 0 ORDER BY updated_at DESC`;

// 根据标题内容查询指定session信息
export const QUERY_SESSION_WITH_TITLE = `SELECT * FROM sessions where del = 0  AND title like ?`;

//指定session是否存在
export const EXISTS_SESSION = `
    SELECT EXISTS (
      SELECT 1 
      FROM sessions 
      WHERE id = ?
      AND del = 0
    ) as num`;

// 增加session信息
export const SAVE_SESSIONS = `INSERT OR REPLACE INTO sessions (id, title) VALUES (?, ?)`;

export const DELETE_SESSION = `UPDATE sessions SET del = 1 where id = ?`;

export const UPDATE_SESSION_TIME = `UPDATE sessions SET updated_at = ? where id = ?`;

// message表建表语句
export const CREATE_MESSAGES_TABLE = ` CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
      content TEXT NOT NULL,
      attachments TEXT,
      refers TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`

// 增加message信息
export const SAVE_MESSAGES = `INSERT OR REPLACE INTO messages (session_id, role, content, attachments, refers) VALUES (?, ?, ?, ?, ?)`;

//根据sessionId查询message消息
export const QUERY_MESSAGES_WITH_SESSION_ID = `SELECT * FROM messages where session_id= ? AND role in ('user', 'assistant')  ORDER BY id ASC`;


export function initMessages(){
    createTable(CREATE_SESSIONS_TABLE);
    createTable(CREATE_MESSAGES_TABLE);
}

export function getSessions(){
    return queryItems(QUERY_SESSIONS);
}

export function sessionExists(sessionId:string){
    const exsit = queryItem(EXISTS_SESSION, sessionId);
    return exsit.num > 0;
}

export function saveSessions(sessionId:string, title:string){
    saveOrUpdate(SAVE_SESSIONS, sessionId, title)
}

export function deleteSession(sessionId:string){
    saveOrUpdate(DELETE_SESSION, sessionId);
}

export function updateSessionTime(sessionId:string){
    saveOrUpdate(UPDATE_SESSION_TIME , formatDateManual(new Date()), sessionId);
}

export function saveMessages(sessionId:string, role:'user'|'assistant'|'system', message:string, attachments:string, refers:string){
    saveOrUpdate(SAVE_MESSAGES, sessionId, role, message, attachments, refers);
}

export function getMessages(sessionId:string){
    const messages = queryItems(QUERY_MESSAGES_WITH_SESSION_ID, sessionId);
    if (Array.isArray(messages)){
        messages.forEach(item=>{
            if (item.refers){
                const references = JSON.parse(item.refers);
                item.references = references;
            }else{
                item.references = [];
            }
        })
    }
    return messages;
}