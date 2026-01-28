import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 配置 marked 选项
marked.setOptions({
  breaks: true,
  gfm: true,
})

// 渲染 Markdown 为 HTML
export const renderMarkdown = (markdown: string): string => {
  try {
    const html = marked.parse(markdown) as string
    // 使用 DOMPurify 清理 HTML，防止 XSS 攻击
    return DOMPurify.sanitize(html)
  } catch (error) {
    console.error('Markdown render error:', error)
    return markdown
  }
}

// 渲染内联 Markdown（用于单行文本）
export const renderInlineMarkdown = (markdown: string): string => {
  try {
    const html = marked.parseInline(markdown) as string
    return DOMPurify.sanitize(html)
  } catch (error) {
    console.error('Inline markdown render error:', error)
    return markdown
  }
}
