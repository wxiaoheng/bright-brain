import * as path from 'path';
import * as fs from 'fs';
import { getAppPath } from '../util/util';
import { DATA_FOLDER, DB_FOLDER } from '../util/const';

const Database = require('better-sqlite3');

let appPath = getAppPath();
// 1.db文件存储目录
const dbPath = path.join(appPath, DATA_FOLDER, DB_FOLDER);
// 2. 初始化数据库连接
const db = new Database(path.join(dbPath, 'bright-brain.db'), { verbose: console.log });
db.pragma('journal_mode = WAL'); // 开启 WAL 模式，提高并发读写性能

export function getDb(){
    return db;
}

export function createTable(createSql:string){
    db.exec(createSql);
}

export function saveOrUpdate(sql:string, ...params: any[]){
    const statement = db.prepare(sql);
    statement.run(params);
}

export function queryItem(sql:string, ...params:any[]){
    const stmt = db.prepare(sql);
    const row = stmt.get(params);
    return row ? row : null;
}

export function queryItems(sql:string, ...params:any[]){
    const stmt = db.prepare(sql);
    return stmt.all(params);
}