import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadMcpTools } from "@langchain/mcp-adapters";
import { tool } from "langchain"
import * as z from "zod";
// import { all, findSkill, getSkillsInfo, initSkill } from "./skillService";
import { pathToFileURL } from "url"
import path from "path";
import { getFilesRecursive, readText } from "../../util/fileutil";
import { searchSimilarKnowledge } from "../knowledgeService";
import { serverName } from "./serverName";
import { all, findSkill, getSkillsInfo, initSkill } from "./skillService";
import { getAppPath } from "../../util/util";
import { DATA_FOLDER, MCP_CONFIG_NAME } from "../../util/const";
import * as fs from "fs";

let clients: Map<string, Client> = new Map();
let toolMap: Map<string, any[]> = new Map();



export async function initMcpServer() {
  
  const file = path.join(getAppPath(), DATA_FOLDER, MCP_CONFIG_NAME);
  try{
    if (fs.promises.access(file)){
      await loadMcpConfigs(file);
    }
  }catch(err){
    console.log(`mcp server配置文件不存在`);
  }

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
  // 本地知识库工具
  const knowledgeTool = await initLocalKnowledgeTool();
  toolMap.set(serverName.LOCAL_KNOWLEDGE_SERVER, [knowledgeTool])

  // skill工具
  initSkill().then(()=>{
    toolMap.set(serverName.SKILL_SERVER, [initSkillTool()]);
  })
}

/**
 * 加载标准的claude的mcp json文件，
 {
  "mcpServers": {
    "git-server": {
      "command": "uvx",
      "args": ["mcp-server-git"]
    }
  }
 **/
async function loadMcpConfigs(file:string){
  const content = await readText(file);
  const config = JSON.parse(content);
  const servers = config.mcpServers;
  const serverNames = Object.keys(servers);
  for (const serverName of serverNames){
    const serverConfig = servers[serverName];
    if (!serverConfig) {
        console.error(`错误: 在配置中找不到服务器 "${serverName}"`);
        return;
    }
    const url = serverConfig.url;
    try{
      if (url){
        await loadHttpMcpServer(serverName, serverConfig);
      }else{
        const command = serverConfig.command;
        if (command){
          await loadStdioMcpServer(serverName, serverConfig);
        }
      }
    }catch(err){
      console.error(`错误：加载服务器${serverName}失败`, err);
    }
    
  }
}

async function loadStdioMcpServer(name:string, serverConfig:any){
  const command = serverConfig.command;
  const transport = new StdioClientTransport({
        command,
        args: serverConfig.args,
    });

    const client = new Client({ name, version: "1.0" }, { capabilities: {} });
    await client.connect(transport);
    clients.set(name,  client);
}

async function loadHttpMcpServer(name:string, serverConfig:any){
  const url = serverConfig.url;
  let headers = serverConfig.headers;
  if (!headers){
    headers = {};
  }
  const transport = new StreamableHTTPClientTransport(
        new URL(url), 
        {
          requestInit:{headers}
        }
    )
    const client = new Client({ name, version: "1.0" }, { capabilities: {} });
    await client.connect(transport);
    clients.set(name,  client);
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

function initSkillTool() {
  const allSkills = all();
  const info = getSkillsInfo(allSkills);
  return tool((input) => {
      const skill = findSkill(input.skillName);
      if (!skill) {
        const available = allSkills.map(s=>s.name).join(', ');
        throw new Error(`Skill "${input.skillName}" not found. Available skills: ${available || "none"}`)
      }
      const dir = path.dirname(skill.location)
      const base = pathToFileURL(dir).href
      const files = getFilesRecursive(dir, [], ['SKILL.md'], 10)
     return {
        title: `Loaded skill: ${skill.name}`,
        output: [
          `<skill_content name="${skill.name}">`,
          `# Skill: ${skill.name}`,
          "",
          skill.content.trim(),
          "",
          `Base directory for this skill: ${base}`,
          "Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.",
          "Note: file list is sampled.",
          "",
          "<skill_files>",
          files,
          "</skill_files>",
          "</skill_content>",
        ].join("\n"),
        metadata: {
          name: skill.name,
          dir,
        },
      }
  }, {
    name: "skill",
    description: info.description,
    schema: z.object({ skillName: z.string().describe(`The name of the skill from available_skills${info.hint}`) }),
  });
  
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
