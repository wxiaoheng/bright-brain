import { zp } from "../util/const";
import { createTable, queryItem, queryItems, saveOrUpdate } from "./dbService";

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

export function initSettings(){
    createTable(CREAT_SETTINGS_TABLE);
}

export function getModelSettings(){
    const apiKey = queryItem(QUERY_SETTING, 'apiKey');
    if (!apiKey) throw new Error('请先在设置中配置 API Key');

    const model = queryItem(QUERY_SETTING, 'model');
    if (!model) throw new Error('请先在设置中配置模型');

    const modelProvider = queryItem(QUERY_SETTING, 'modelProvider')?.value || zp;
    return {apiKey:apiKey.value, model:model.value, modelProvider};
}

export function getAllSettings(){
    const result = queryItems(QUERY_SETTINGS);
    let settings = {};
    if (result && Array.isArray(result)){
        settings = Object.fromEntries(
            result.map(item => [item.key, item.value])
        );
    }
    return settings;
}

export function getSearchLimit(){
    const defaultLimit = 3;
    try{
        const limit = queryItem(QUERY_SETTING, 'topN');
        if (limit){
            return limit as number;
        }
    }catch(err){
        return defaultLimit;
    }
    return defaultLimit;
}

export function saveSetting(key:string, value:string){
    saveOrUpdate(SAVE_SETTINGS, key, value);
}