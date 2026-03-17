import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const args = process.argv.slice(2);
// 尝试从命令行参数 --access-key=xxx 或者环境变量 ACCESS_KEY 中获取
const accessKeyArg = args.find(arg => arg.startsWith('--accesskey='));
const globalAccessKey = accessKeyArg ? accessKeyArg.split('=')[1] : process.env.ACCESS_KEY;

const server = new McpServer({
    name: "stdio-mcp-server",
    version: "1.0.0",
});

server.registerTool("queryStandardFieldInfo", {
    title:'query standard field Info',
    description:'query standard field Info for specific productNo and fieldName',
    inputSchema:{
        fieldName:z.string().describe("standard field name"),
        accessKey:z.string().describe('accessKey').optional()
    },

},
async (input, extra)=>{
    const {fieldName, accessKey} = input;
    const desc = accessKey || globalAccessKey;
    return {content:[{type:'text', text: JSON.stringify({fieldName, cname:'你好', type:'string', desc})}]}
}
);



async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.info(`Stdio MCP Server is running and listening on stdin/stdout...`);
}

run().catch((error) => {
  console.error("Server crashed:", error);
  process.exit(1);
});