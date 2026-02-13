import { ChatZhipuAI } from "@langchain/community/chat_models/zhipuai";
import {ChatAlibabaTongyi} from "@langchain/community/chat_models/alibaba_tongyi"
import {ChatDeepSeek} from "@langchain/deepseek"
import { ds, qw, zp } from "../../util/const";
import { getModelSettings } from "../../service/settingService";
import { MessagesAnnotation, StateGraph} from "@langchain/langgraph";
import {SqliteSaver} from '@langchain/langgraph-checkpoint-sqlite';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getDb } from "../../service/dbService";
import * as fs from 'fs';
import { fileToBase64 } from "../../util/util";
import { searchSimilarKnowledge } from "../../service/knowledgeService";


const getModel = ()=>{
  
  const {modelProvider, model, apiKey} = getModelSettings();
  
  if (modelProvider == zp){
    return new ChatZhipuAI({
      model: model,//"glm-4.7-flashx", // Available models:
      zhipuAIApiKey: apiKey, 
    });
  }else if (modelProvider == qw){
    return new ChatAlibabaTongyi({
      model:model,
      alibabaApiKey:apiKey,
    })
  }else if (modelProvider == ds){
    return new ChatDeepSeek({
      apiKey:apiKey,
      model:model,//deepseek-chat
    })
  }else{
    throw new Error(`暂不支持${modelProvider}模型`);
  }
}

class ChatInstance{

    private app: any;

    newChatClient(){
        // 定义图节点 (Node)
        // 这个函数接收当前状态，调用模型，并返回新的消息
        const model = getModel();
        async function callModel(state:any) {
            const messages = state.messages;
            const response = await model.invoke(messages);
            
            // LangGraph 会自动将返回的消息追加到历史记录中
            return { messages: [response] };
        }

        // 构建图 (Graph)
        // MessagesAnnotation 是 LangGraph 预设的状态定义，专门用于存储消息列表
        const workflow = new StateGraph(MessagesAnnotation)
            .addNode("chat", callModel) // 添加节点
            .addEdge("__start__", "chat") // 定义开始指向 agent
            .addEdge("chat", "__end__"); // agent 执行完后结束

        this.app = workflow.compile({checkpointer:new SqliteSaver(getDb())});
    };

    // 执行并实现打字机效果
    async streamingChat(question:string, imagePaths:string[], sessionId:string, reply:any) {
        // 构建消息内容
        const content: any[] = [];
        // 添加文本内容
        content.push({
            type: "text",
            text: question
        });
        // 添加图片内容
        if (imagePaths?.length) {
            for (const imagePath of imagePaths) {
                try {
                    // 检查文件是否存在
                    if (fs.existsSync(imagePath)) {
                        const base64DataUrl = fileToBase64(imagePath);
                        content.push({
                            type: "image_url",
                            image_url: {
                                url: base64DataUrl
                            }
                        });
                    } else {
                        console.warn(`File not found: ${imagePath}`);
                    }
                } catch (error) {
                    console.error(`Error processing image ${imagePath}:`, error);
                }
            }
        }
        let input = [];
        let references:any[] = [];
        // 从本地向量库中获取关联文档
        const docs = await searchSimilarKnowledge(question, true);
        if (docs.length>0){
            const refContent = docs.map((doc:any)=>{
                const text = doc.text
                references.push({source:doc.source, text, name:doc.name});
                return text;
            }).join('\n\n');
            const systemContent = `可参考内容有：${refContent}`;
            input.push(new SystemMessage(systemContent))
        }
        
        input.push(new HumanMessage(content))
        const config = { configurable: { thread_id: sessionId } };
        if (!this.app){
            this.newChatClient();
        }    
        const eventStream = this.app.streamEvents(
            { messages: input }, 
            { ...config, version: "v2" } 
        );

        let answer = '';
        // 遍历事件流
        for await (const event of eventStream) {
            const eventType = event.event;

            // 我们只关心 chat_model (聊天模型) 正在 stream (流式输出) 的事件
            if (eventType === "on_chat_model_stream") {
                // 获取当前这一个微小的片段 (chunk)
                const chunk = event.data.chunk;
                
                if (chunk.content) {
                    reply.send('chat:stream', {
                        chunk:chunk.content,
                        sessionId,
                        done: false,
                    })
                    answer += chunk.content;
                }
            }
        }
        console.log("\n\n[回答结束]");
        reply.send('chat:stream', {
            sessionId,
            references,
            done: true,
        })
        return {references, answer};
    }
}

export const chat = new ChatInstance();


