import { ChatZhipuAI } from "@langchain/community/chat_models/zhipuai";
import {ChatAlibabaTongyi} from "@langchain/community/chat_models/alibaba_tongyi"
import {ChatDeepSeek} from "@langchain/deepseek"
import { QUERY_SETTING } from "../util/sql";
import { ds, qw, zp } from "../util/const";
import { queryItem } from "../db/db";

export const getModel = ()=>{
  const apiKey = queryItem(QUERY_SETTING, 'apiKey');
  if (!apiKey) throw new Error('请先在设置中配置 API Key');

  const model = queryItem(QUERY_SETTING, 'model');
  if (!model) throw new Error('请先在设置中配置模型');

  const modelProvider = queryItem(QUERY_SETTING, 'modelProvider')?.value || zp;
  
  if (modelProvider == zp){
    return new ChatZhipuAI({
      model: model.value,//"glm-4.7-flashx", // Available models:
      zhipuAIApiKey: apiKey.value, 
    });
  }else if (modelProvider == qw){
    return new ChatAlibabaTongyi({
      model:model.value,
      alibabaApiKey:apiKey.value,
    })
  }else if (modelProvider == ds){
    return new ChatDeepSeek({
      apiKey:apiKey.value,
      model:model.value,//deepseek-chat
    })
  }else{
    throw new Error(`暂不支持${modelProvider}模型`);
  }
}



