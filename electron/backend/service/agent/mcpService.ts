import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadMcpTools } from "@langchain/mcp-adapters";
import { tool } from "langchain"
import * as z from "zod";
// import { all, findSkill, getSkillsInfo, initSkill } from "./skillService";
import { pathToFileURL } from "url"
import path from "path";
import { getFilesRecursive } from "../../util/fileutil";
import { searchSimilarKnowledge } from "../knowledgeService";
import { serverName } from "./serverName";

let clients: Map<string, Client> = new Map();
let toolMap: Map<string, any[]> = new Map();



export async function initMcpServer() {
  
  clients.set(serverName.GIT_SERVER,  await connectGitClient());
  clients.set(serverName.DEVOPS_SERVER, await connectDevopsClient());
  clients.set(serverName.AMAP_SERVER, await createAMapClient());
  clients.set(serverName.CMD_SERVER, await connectCmdClient());

  for (const entry of clients){
    const key = entry[0];
    const client = entry[1];
    const tools = [];
    const mcpTools = await loadMcpTools(client.getServerVersion().name, client,{
      throwOnLoadError: true,
      prefixToolNameWithServerName: false,
      additionalToolNamePrefix: "",
      useStandardContentBlocks: false,
    });
    mcpTools.forEach(tool=>{
      tool.schema = cleanMcpSchema(tool.schema);
      tools.push(tool)
    });
    toolMap.set(key, tools);
  }
  const knowledgeTool = await initLocalKnowledgeTool();
  toolMap.set(serverName.LOCAL_KNOWLEDGE_SERVER, [knowledgeTool])
}

export async function getTools(clientNames:string[]){
  let all = [];
  for (const name of clientNames){
    const tools = toolMap.get(name);
    if (tools){
      all = [...all, ...tools];
    }
  }
  return all;
}

export function allTools() {
    return Array.from(toolMap.values()).flat();
}

async function initLocalKnowledgeTool() {
  return tool(async (input) => {
    const question = input.question;
    const docs = await searchSimilarKnowledge(question as string, true);
    const references = [];
    if (docs.length>0){
        docs.forEach(doc=>{
              references.push(doc.text);
        });
    }
    const output = references.length==0 ? `` : `可参考内容有：\n${references.join('\n')}`
     return {
        title: `local knowledge base tool`,
        output,
        metadata: {},
      }
  }, {
    name: "search_local_knowledge",
    description: "The local knowledge search tool is required when a user asks questions about their personal life records, diaries, work plans, private documents, or other non-public common knowledge. Do not use this tool for general knowledge (such as history, coding, or translation).",
    schema: z.object({ question: z.string().describe(`The user question`) }),
  });
}

async function connectCmdClient() {
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@simonb97/server-win-cli"],
    });

    const client = new Client({ name: serverName.CMD_SERVER, version: "1.0" }, { capabilities: {} });
    await client.connect(transport);
    return client;
}


async function connectGitClient() {
    const transport = new StdioClientTransport({
        command: "uvx",
        args: ["mcp-server-git"],
    });

    const dbClient = new Client({ name: serverName.GIT_SERVER, version: "1.0" }, { capabilities: {} });
    await dbClient.connect(transport);
    return dbClient;
}

async function createAMapClient(){
  // https://mcp.amap.com/sse
   const transport = new StreamableHTTPClientTransport(
        new URL('https://mcp.amap.com/mcp?key=xxxxx')
    )

    const client = new Client({ name: serverName.AMAP_SERVER, version: "1.0" }, { capabilities: {} });
    await client.connect(transport);
    return client;
}


async function connectDevopsClient() {
    const transport = new StreamableHTTPClientTransport(
        new URL('https://dev.xxx.com/openapi/apis/v1/mcp'), 
        {
          requestInit:{
            headers:{
              devops_access_key:'xxxx'
            }
          }
        }
    )

    const client = new Client({ name: serverName.DEVOPS_SERVER, version: "1.0" }, { capabilities: {} });
    await client.connect(transport);
    return client;
}


// 递归清理带有问题的 enum 属性
const cleanMcpSchema = (schema: any): any => {
  // 基本数据类型直接返回
  if (!schema || typeof schema !== 'object') return schema;
  
  // 处理数组
  if (Array.isArray(schema)) {
    return schema.map(cleanMcpSchema);
  }
  
  const cleaned = { ...schema };

  // 核心逻辑：拦截并清理当前层级的 enum
  if (Array.isArray(cleaned.enum)) {
    const isEnumEmpty = cleaned.enum.length === 0;
    const isEnumOnlyEmptyString = cleaned.enum.length === 1 && (cleaned.enum[0] === "" || cleaned.enum[0] === null);
    
    if (isEnumEmpty || isEnumOnlyEmptyString) {
      delete cleaned.enum; // 🔪 删掉有毛病的枚举限制
    }
  }

  // 递归处理所有的嵌套属性 (如 properties 里面的对象)
  for (const key of Object.keys(cleaned)) {
    if (typeof cleaned[key] === 'object') {
      cleaned[key] = cleanMcpSchema(cleaned[key]);
    }
  }
  
  return cleaned;
};
