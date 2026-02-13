// src/main/server.ts
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { deleteKnowledge, getKnowledges, getKnowledgeWithSource, saveKnowledge } from '../service/knowledgeService';
import {v4 as uuid} from 'uuid';

const fastify = Fastify({ logger: true });

export function initServer() {
  // 添加知识
  fastify.post('/api/knowledge/add', knowledgeAdd);

  // 启动监听
  fastify.listen({ port: 3690, host: '127.0.0.1' }, (err, address) => {
    if (err) {
      fastify.log.error(err);
    }
    console.log(`Bright-Brain Internal Server running at ${address}`);
  });
}


export async function knowledgeAdd(request:FastifyRequest, reply:FastifyReply){
    // const { url, content } = request.body as { url: string, content: string };
    let {url, title, content} = request.body as {url:string, title:string, content:string}
    const kn = getKnowledgeWithSource(url);
    if (kn){
      deleteKnowledge(kn.id);
    }
    const id = uuid();
    saveKnowledge(id, 'url', url, title, content);
    return { status: 'ok', message: 'Task received, processing in background' };
}