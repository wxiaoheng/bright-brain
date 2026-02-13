import { 
  pipeline, 
  env, 
  AutoTokenizer, 
  AutoModelForSequenceClassification 
} from '@xenova/transformers';
import path from 'path';
import { getAppPath } from '../../util/util';

const modelBasePath = path.join(getAppPath(), 'models');

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = modelBasePath;

class embeddingService {
  static embedding: any = null;
  static reranker: { tokenizer: any; model: any } | null = null;

  /**
   * 向量模型
   * @returns 
   */
  static async getEmbedding() {
    if (!this.embedding) {
      this.embedding = await pipeline('feature-extraction', 'bge-m3', {
        quantized: true,
      });
    }
    return this.embedding;
  }

  /**
   * rerank模型
   * @returns 
   */
  static async getReranker() {
    if (!this.reranker) {
      const modelId = 'bge-reranker-large';

      console.log('[Rerank] 正在加载 Tokenizer...');
      const tokenizer = await AutoTokenizer.from_pretrained(modelId);
      
      console.log('[Rerank] 正在加载 Model (这可能需要几秒钟)...');
      
      const model = await AutoModelForSequenceClassification.from_pretrained(modelId, {
        quantized: true, 
      });

      console.log('✅ Reranker 模型加载成功！');
      this.reranker = { tokenizer, model };
    }
    return this.reranker;
  }
}

/**
 * 将指定字符串向量化
 * @param text 
 * @returns 
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await embeddingService.getEmbedding();
  const safeText = text ? String(text).replace(/\n/g, ' ') : '';
  const output = await extractor(safeText, { pooling: 'cls', normalize: true });
  return Array.from(output.data);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export async function rerank(query: string, documents: any[], topK: number = 3, threshold: number = 0.1) {
  if (!documents || documents.length === 0) return [];

  // 这里会触发加载
  const { tokenizer, model } = await embeddingService.getReranker();

  const scorePromises = documents.map(async (doc, index) => {
    try {
      const docText = doc.text ? String(doc.text) : '';
      let normalizedScore:number = -1;
      // 分词
      const inputs = await tokenizer(query, {
        text_pair: docText,
        padding: true,
        truncation: true,
        maxLength: 512,
      });

      // 推理
      const output = await model(inputs);
      // 获取 Logits
      const rawScore = output.logits.data[0];
      normalizedScore = sigmoid(rawScore);
      return { index, score: normalizedScore};
    } catch (err) {
      console.error(`Rerank error at doc ${index}:`, err);
      return { index, score: -1};
    }
  });

  const scores = await Promise.all(scorePromises);

  const results = scores.filter(item=>{
    return item.score >= threshold;
  }).map(item => {
    const doc = documents[item.index];
    doc.score = item.score;
    return doc; 
  });
  return filterResult(results, topK);
}

/**
 * 父子文档处理，根据子文档来获取匹配到的topK父文档
 * 同一个父文档，用分数最高的那个子文档作为它的分数，其他都去掉，然后再取topK
 * @param results 
 * @param topK 
 * @returns 
 */
export function filterResult(results:any[],  topK: number = 3){
  const map = new Map<string, any>();

  for (const item of results) {
    const existing = map.get(item.parentId);

    if (!existing || item.score > existing.score) {
      map.set(item.parentId, item);
    }
  }

  const result = Array.from(map.values()).sort((a, b) => {
    return b.score - a.score; // 降序排列
  });

  return result.slice(0, topK);;
}
