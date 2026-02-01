import { chat } from "../llm/chat";
import { SETTING_KEY_API_KEY, SETTING_KEY_MODEL, SETTING_KEY_MODEL_PROVIDER } from './const';


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