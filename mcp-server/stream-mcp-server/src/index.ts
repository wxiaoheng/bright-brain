import Fastify from 'fastify';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const fastify = Fastify({ logger: true });

fastify.post("/mcp", async (request, reply) => {
  try {
    const globalAccessKey = request.headers['accesskey'];
    const server = new McpServer({
      name: "stream-mcp-server",
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
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(request.raw, reply.raw, request.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    reply.status(500).send({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
      },
      id: null,
    });
  }
});

fastify.get("/mcp", async (request, reply) => {
  console.log("Received GET MCP request");
  reply.code(400).send(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

fastify.delete("/mcp", async (request, reply) => {
  console.log("Received DELETE MCP request");
  reply.code(400).send(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

const PORT = 3030;
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`MCP Server running at ${address}/mcp`);
});