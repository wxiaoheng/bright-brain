import { FastifyReply, FastifyRequest } from "fastify";
import { chat } from "../chat/chatService";
import { getTools } from "../agent/mcpService";
import { serverName } from "../agent/serverName";
import { CompiledStateGraph } from "@langchain/langgraph";

const systemPrompt = `你的任务是帮助用户,根据Git diff及用户的任务信息生成git提交说明。
## 指南
- 先调用工具查看当前目录下的git diff信息
- 再调用工具根据任务id查看任务详情
- 结合git diff信息和任务详情生成git提交信息
- 不要添加任何广告，如“由OpenAI/BrightBrain生成”
- 仅针对更改diff生成消息
- 请严格遵循以下关于提交信息的规则。
## 输出格式（标准markdown格式）
\`\`\`
<消息标题>
<总结更新内容的要点>
\`\`\`
## 示例标题
\`\`\`
添加JWT登录流程
\`\`\`
## 带有标题和正文的示例
\`\`\`
添加JWT登录流程
- 实现了JWT令牌验证逻辑
- 为验证组件添加了文档
\`\`\`
## 规则
* 说明信息尽量使用中文
* 标题结尾处不要加句号。
* 标题应简洁明了，最多50个字符。
* 用正文来解释*为什么*，而不仅仅是*做了什么*。
* 正文的要点应简洁且概括。
避免
* 标题过长或主题不清晰
* 列举的要点过于详细
`

export async function getCommitSummary(request:FastifyRequest, reply:FastifyReply){
    const { pwd, taskId, sessionId, question } = request.body as {taskId: string, pwd:string, sessionId:string, question?:string};
    try{
        let finalQuestion = '';
        if (question){
            finalQuestion = question;
        }else{
            finalQuestion = `## 当前目录 \n ${pwd} \n ## 任务ID\n ${taskId}`;
        }
        const tools = await getTools([serverName.GIT_SERVER, serverName.DEVOPS_SERVER]);
        const response = await chat.simpleChat(finalQuestion, systemPrompt, sessionId, tools);
        let summary = response;
        // 正则表达式匹配三个反引号包裹的代码块
        const regex = /```[\s\S]*?\n([\s\S]*?)```/;
        const match = response.match(regex);

        if (match && match[1]) {
            summary =  match[1].trim();
        }
        return {status: 'ok', summary}
    }catch(error:any){
        return reply.code(500).send({ error: 'Summary failed', details: error.message });
    }
}