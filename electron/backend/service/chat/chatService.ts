import {ChatAlibabaTongyi} from "@langchain/community/chat_models/alibaba_tongyi"
import {ChatDeepSeek} from "@langchain/deepseek"
import {ds, qw, zp } from "../../util/const";
import { getModelSettings } from "../../service/settingService";
import { Annotation, CompiledStateGraph, MessagesAnnotation, MessagesValue, StateGraph, StateSchema} from "@langchain/langgraph";
import {SqliteSaver} from '@langchain/langgraph-checkpoint-sqlite';
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getDb } from "../../service/dbService";
import * as fs from 'fs';
import { fileToBase64, getAppPath } from "../../util/util";
import { searchSimilarKnowledge } from "../../service/knowledgeService";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt"; 
import { ChatOpenAI } from "@langchain/openai";
import path from "path";
import { allTools } from "../agent/mcpService";
import { sessionExists } from "../messageService";
import { threadId } from "worker_threads";


export const getModel = ()=>{
  
  const {modelProvider, model, apiKey} = getModelSettings();
  
  if (modelProvider == zp){
    // ChatZhipuAI调用tool时有兼容问题，改成使用ChatOpenAI
    // return new ChatZhipuAI({
    //   model: model,//"glm-4.7-flashx", // Available models:
    //   zhipuAIApiKey: apiKey, 
    // });
    return new ChatOpenAI({
      modelName: model, 
      apiKey: apiKey, 
      configuration: {
        baseURL: "https://open.bigmodel.cn/api/paas/v4/", // 智谱的 OpenAI 兼容地址
      }
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

const ChatAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,
    // sessionid
    sessionId:Annotation<string>,
    // 原始问题
    question:Annotation<string>,
    // 图片等信息
    attachMents:Annotation<string[]>,
  });


class ChatInstance{

    private app: any;
    

    async newChatClient(){
        // 定义图节点 (Node)
        // 这个函数接收当前状态，调用模型，并返回新的消息
        const tools = allTools();
        const model = getModel().bindTools(tools);
        async function generate(state:any) {
            const messages:BaseMessage[] = state.messages;
            console.log("Sending messages to model:", messages);
            
            const response = await model.invoke(messages);
            // LangGraph 会自动将返回的消息追加到历史记录中
            return { messages: [response] };
        }


        // 2. 拼装prompt
        async function augmented(state: typeof ChatAnnotation.State) {
            const { question, attachMents, sessionId } = state;
            const content: any[] = [];
            // 添加文本内容
            content.push({
                type: "text",
                text: question
            });

            // 添加图片内容
            if (attachMents?.length) {
                for (const imagePath of attachMents) {
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

            const messages:BaseMessage[] = [];

            if (!sessionExists(sessionId)){
                const systemContent = `你是一个专属个人助理，你已连接到用户的个人知识库。
【严格指令】：
1. 遇到与用户个人相关或现实中你暂不了解的问题（如“我的工作”、“我的计划”、“昨天世界杯冠军”等），**绝对不允许**回答“我无法查询”、“我没有你的个人数据”、“我作为一个AI不知道”。
2. 遇到上述情况，你**必须且只能**调用 \`search_local_knowledge\` 工具去获取信息。
3. 你了解的问题则**无需**调用该工具
4. 只有当工具返回“找不到信息”时，你才可以告诉用户无法回答该问题。` ;
                messages.push(new SystemMessage(systemContent))
            }

            messages.push(new HumanMessage(content))

            return { messages};
        }

        // 构建图 (Graph)
        const workflow = new StateGraph(ChatAnnotation)
            .addNode('augmented', augmented)
            .addNode('generate', generate) // 添加节点
            .addNode('tools', new ToolNode(allTools())) 
            .addEdge('__start__', 'augmented') // 定义开始指向
            .addEdge('augmented', 'generate')
            .addConditionalEdges('generate', toolsCondition)
            .addEdge('tools', 'generate');

        this.app = workflow.compile({checkpointer:new SqliteSaver(getDb())});
    };

    // 执行并实现打字机效果
    async streamingChat(question:string, imagePaths:string[], sessionId:string, reply:any) {
        
        const config = { configurable: { thread_id: sessionId } };
        if (!this.app){
            await this.newChatClient();
        }    
        const eventStream = this.app.streamEvents(
            { question, attachMents:imagePaths, sessionId}, 
            { ...config, version: "v2" } 
        );

        let answer = '';
        let references = [];
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
            }else if (event.event === "on_chain_end" && event.name === "LangGraph") {
                const state = event.data.output;
                references = state.refContents;
            }else if (eventType === 'on_tool_start' || eventType === 'on_tool_end'){
                console.log('工具', event);
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

    // 一般简单对话
    async newSimpleClient(tools){
        // 定义图节点 (Node)
        // 这个函数接收当前状态，调用模型，并返回新的消息
        const model = getModel().bindTools(tools);
        async function generate(state:any) {
            const messages:BaseMessage[] = state.messages;
            const response = await model.invoke(messages);
            // LangGraph 会自动将返回的消息追加到历史记录中
            return { messages: [response] };
        }

        // 构建图 (Graph)
        const workflow = new StateGraph(MessagesAnnotation)
            .addNode('generate', generate) // 添加节点
            .addNode('tools', new ToolNode(tools)) 
            .addEdge('__start__', 'generate') // 定义开始指向
            .addConditionalEdges('generate', toolsCondition)
            .addEdge('tools', 'generate');

        return workflow.compile({checkpointer:new SqliteSaver(getDb())});
    };

    // 执行对话
    async simpleChat(question:string, systemPrompt:string, sessionId:string, tools:any[]) {
        const app = await this.newSimpleClient(tools);
        if (!app){
            throw new Error(`agent初始化失败,app不能为空`);
        }
        const config = { configurable: { thread_id: sessionId } };
        const messages = [];
        if (!sessionExists(sessionId) && systemPrompt?.length){
            messages.push(new SystemMessage(systemPrompt));
        }
        messages.push(new HumanMessage(question));
        const final = await app.invoke({messages}, config);
        const finalMessages = final.messages;
        return finalMessages[finalMessages.length-1].content as string;
    }
}

export const chat = new ChatInstance();


