// 设置表建表语句
export const CREAT_SETTINGS_TABLE = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `;
// 查询所有设置信息
export const QUERY_SETTINGS = `SELECT * FROM settings`;

// 查询指定设置信息
export const QUERY_SETTING = `SELECT * FROM settings where key = ?`;
// 增加/更新设置信息
export const SAVE_SETTINGS = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`;

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
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`

// 增加message信息
export const SAVE_MESSAGES = `INSERT OR REPLACE INTO messages (session_id, role, content, attachments) VALUES (?, ?, ?, ?)`;

//根据sessionId查询message消息
export const QUERY_MESSAGES_WITH_SESSION_ID = `SELECT * FROM messages where session_id= ?  ORDER BY id ASC`;

// 知识源表（文件/目录/URL）
export const CREATE_KNOWLEDGE_TABLE = `
  CREATE TABLE IF NOT EXISTS knowledges (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )
`;
export const QUERY_KNOWLEDGE = `SELECT * FROM knowledges ORDER BY created_at DESC`;
export const SAVE_KNOWLEDGE = `INSERT INTO knowledges (id, type, source, name) VALUES (?,?, ?, ?)`;
export const DELETE_KNOWLEDGE = `DELETE FROM knowledges WHERE id = ?`;


export const CREATE_CHUNKS_TABLE = `
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )
`

export const QUERY_CHUNK = `SELECT * FROM chunks where id = ?`;
export const SAVE_CHUNK = `INSERT INTO chunks (id, file_id, title, content) VALUES (?,?, ?, ?)`;
export const DELETE_CHUNK = `DELETE FROM chunks WHERE file_id = ?`;