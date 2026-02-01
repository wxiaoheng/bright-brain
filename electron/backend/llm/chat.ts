import { MessagesAnnotation, StateGraph, MemorySaver} from "@langchain/langgraph";
import {SqliteSaver} from '@langchain/langgraph-checkpoint-sqlite';
import { getModel } from "./llm";
import { HumanMessage } from "@langchain/core/messages";
import { getDb } from "../db/db";

class ChatInstance{

    private app:any;

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
            .addNode("agent", callModel) // 添加节点
            .addEdge("__start__", "agent") // 定义开始指向 agent
            .addEdge("agent", "__end__"); // agent 执行完后结束

        this.app = workflow.compile({checkpointer:new SqliteSaver(getDb())});
    };


    // 执行并实现打字机效果
    async streamingChat(question:string, sessionId:string, reply:any) {
        const input = [new HumanMessage(question)];
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
            done: true,
        })
        return answer;
    }
}

export const chat = new ChatInstance();