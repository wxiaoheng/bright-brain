import { Document } from "@langchain/core/documents";

export class MarkdownHeaderSplitter {
  constructor( private headersLevelToSplitOn: number = 3) {}

  splitText(text: string): Document[] {
    const lines = text.split('\n');
    const chunks: Document[] = [];
    let currentContent: string[] = [];
    let currentHeaders: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      let isHeader = false;

      // Check if line is a header
      const headerRegex = new RegExp(`^(#{1,${this.headersLevelToSplitOn}})\\s+`);
      const match = trimmedLine.match(headerRegex);
      if (match && match[1]) {
        const headerLevel = match[1].length;
        // Save current chunk if it exists
        if (currentContent.length > 0) {
          chunks.push({
            pageContent: currentContent.join('\n').trim(),
            metadata: {
              title: currentHeaders.join('->'),
              contentType: 'markdown'
            }
          });
          currentContent = [];
        }

        // Update headers
        const headerText = trimmedLine.substring(headerLevel + 1).trim();
        
        if (currentHeaders.length>headerLevel-1){
          currentHeaders.splice(headerLevel-1);
        }
        currentHeaders.push(headerText);

        isHeader = true;
        
      }

      if (!isHeader) {
        currentContent.push(line);
      }
    }

    // Add remaining content
    if (currentContent.length > 0) {
      chunks.push({
        pageContent: currentContent.join('\n').trim(),
        metadata: {
          title: currentHeaders.join('->'),
          contentType: 'markdown'
        }
      });
    }

    return chunks.filter(chunk => chunk.pageContent.length > 0);
  }

  private constructSource(currentHeaders: Record<string, string>, headersToSplitOn: Array<[string, string]>){
    
  }
}