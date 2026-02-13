/**
 * 参考自https://github.com/helloworld-Co/html2md
 */
import TurndownService from 'turndown'
import {gfm} from 'turndown-plugin-gfm'
import jsdom from 'jsdom';

const { JSDOM } = jsdom

class url2md {
  private dom:any = null;
  private qUrl:string = '';
  private lazyAttrs:string[] = ['data-src', 'data-original-src', 'data-original', 'src'];

  constructor(qurl:string){
    this.qUrl = qurl;
  }

  private dealLazyImg (img) {
    /**
     * 处理懒加载路径
     * 简书：data-original-src
     * 掘金：data-src
     * segmentfault：data-src
     * 知乎专栏：data-original
     **/
    for (let i = 0, len = this.lazyAttrs.length; i < len; i++) {
      const src = img.getAttribute(this.lazyAttrs[i])
      if (src) { return src }
    }
    return ''
  }

  private getAbsoluteUrl (p) {
    // 获取图片、链接的绝对路径
    const qOrigin = new URL(this.qUrl).origin || ''
    return new URL(p, qOrigin).href
  }

  private changeRelativeUrl () {
    // 转换图片、链接的相对路径
    if (!this.dom) { 
        throw new Error('<div>内容出错~</div>');
    }
    const copyDom = this.dom
    const imgs = copyDom.querySelectorAll('img')
    const links = copyDom.querySelectorAll('a')
    imgs.length > 0 && imgs.forEach((v) => {
      const src = this.dealLazyImg(v)
      v.src = this.getAbsoluteUrl(src)
    })
    links.length > 0 && links.forEach((v) => {
      const href = v.href || this.qUrl
      v.href = this.getAbsoluteUrl(href)
    })

    this.dom = copyDom
  }

  private addOriginText () {
    // 底部添加转载来源声明
    const originDom = new JSDOM('').window.document.createElement('div')
    originDom.innerHTML = `<br/><div>本文转自 <a href="${this.qUrl}" target="_blank">${this.qUrl}</a>，如有侵权，请联系删除。</div>`
    this.dom.appendChild(originDom)
  }

  private getInnerHtml () {

    // ============================
    //  DOM 清洗阶段
    // ============================

    // A. 去除代码块行号和复制按钮
    // 使用 querySelectorAll 获取 NodeList，然后遍历删除
    const garbageSelectors = [
        '.pre-numbering',   // 左侧行号
        '.opt-box',         // 你的HTML里的那个“AI写代码”按钮容器
        '.hljs-button',     // 旧版复制按钮
        '.login-mark',      // 登录遮罩
        '.hide-article-box' // 阅读更多按钮
    ];
    
    garbageSelectors.forEach(selector => {
        this.dom.querySelectorAll(selector).forEach(el => el.remove());
    });

    // B. 去除指定的“空”锚点
    // 逻辑：有 name 或 id + 内容为空 + href 指向当前页面
    this.dom.querySelectorAll('a').forEach(a => {
        const text = a.textContent.trim();
        const href = a.href; // JSDOM 会自动补全为绝对路径(如果构造时传入了url)
        const rawHref = a.getAttribute('href') || ''; // 获取原始属性值

        // 判断是否为需要删除的锚点
        // 1. 必须是空标签（无可见文字）
        // 2. 链接必须是空的，或者是当前页面的 URL
        if (text === '') {
            // 检查 href 是否匹配当前 URL (包含关系，处理 #锚点后缀情况)
            if (rawHref === '' || href.includes(this.qUrl)) {
                a.remove();
            }
        }
    });

    // C. 代码块结构标准化
    // 确保 <pre> 里面包裹了 <code>，有些旧 HTML 只有 <pre>
    this.dom.querySelectorAll('pre code').forEach(codeEl => {
        // A. 提取纯文本，去除所有 span 标签
        // 这一步至关重要！你的源码里全是 span，这会让 Turndown 困惑
        // 直接取 textContent 会自动忽略所有 HTML 标签，只保留代码文字和换行
        const rawCode = codeEl.textContent;
        
        // B. 重置 code 内容为纯文本
        codeEl.textContent = rawCode;

        // C. 确保语言类型正确
        // 你的源码里 code 已经有 class="prism language-bash has-numbering"
        // turndown-plugin-gfm 能够自动识别其中的 "language-bash"
        // 所以这里通常不需要额外操作，但为了保险，可以清理一下 class
        // (可选) 只保留 language-xxx
        const classes = codeEl.className.split(' ');
        const langClass = classes.find(c => c.startsWith('language-'));
        if (langClass) {
            codeEl.className = langClass; // 变成只剩 class="language-bash"
        }
    });
    return this.dom.innerHTML
  }

  private returnFinalHtml () {
    this.changeRelativeUrl();
    this.addOriginText();
    return this.getInnerHtml()
  }

  private getDom (html, selector) {
    // 获取准确的文章内容
    const dom = new JSDOM(html)
    const htmlContent = dom.window.document.querySelector(selector)
    return htmlContent
  }

  getTitle (content) {
    // 获取文章的 title
    const title = this.getDom(content, 'title')
    if (title) { 
      return title.textContent || title.innerText || "";
    }
    return '获取标题失败~'
  }

  getHtmlBody (content) {
    // 获取不同平台的文章内容
    const getBySelector = selector => this.getDom(content, selector)

    // 掘金
    if (this.qUrl.includes('juejin.cn')) {
      const htmlContent = getBySelector('.markdown-body')
      const extraDom = htmlContent.querySelector('style')
      const extraDomArr = htmlContent.querySelectorAll('.copy-code-btn')
      extraDom && extraDom.remove()
      extraDomArr.length > 0 && extraDomArr.forEach((v) => { v.remove() })
      this.dom = htmlContent
      return this.returnFinalHtml()
    }
    // oschina
    if (this.qUrl.includes('oschina.net')) {
      const htmlContent = getBySelector('.article-detail')
      const extraDom = htmlContent.querySelector('.ad-wrap')
      extraDom && extraDom.remove()
      this.dom = htmlContent
      return this.returnFinalHtml()
    }
    // cnblogs
    if (this.qUrl.includes('cnblogs.com')) {
      this.dom = getBySelector('#cnblogs_post_body')
      return this.returnFinalHtml()
    }
    // weixin
    if (this.qUrl.includes('weixin.qq.com')) {
      this.dom = getBySelector('#js_content')
      return this.returnFinalHtml()
    }
    // 知乎专栏
    if (this.qUrl.includes('zhuanlan.zhihu.com')) {
      const htmlContent = getBySelector('.RichText')
      const extraScript = htmlContent.querySelectorAll('noscript')
      extraScript.length > 0 && extraScript.forEach((v) => { v.remove() })
      this.dom = htmlContent
      return this.returnFinalHtml()
    }
    // 慕课专栏
    if (this.qUrl.includes('www.imooc.com')) {
      const htmlContent = getBySelector('.article-con')
      this.dom = htmlContent
      return this.returnFinalHtml()
    }
    // learnku
    if (this.qUrl.includes('learnku.com')) {
      const htmlContent = getBySelector('.markdown-body')
      const extraScript = htmlContent.querySelectorAll('.toc-wraper')
      extraScript.length > 0 && extraScript.forEach((v) => { v.remove() })
      const extraToc = htmlContent.querySelectorAll('.markdown-toc')
      extraToc.length > 0 && extraToc.forEach((v) => { v.remove() })
      const extraLink = htmlContent.querySelectorAll('.reference-link')
      extraLink.length > 0 && extraLink.forEach((v) => { v.remove() })
      this.dom = htmlContent
      return this.returnFinalHtml()
    }

    // 优先适配 article 标签，没有再用 body 标签
    const htmlArticle = getBySelector('article')
    if (htmlArticle) {
      this.dom = htmlArticle
      return this.returnFinalHtml()
    }

    const htmlBody = getBySelector('body')
    if (htmlBody) {
      this.dom = htmlBody
      return this.returnFinalHtml()
    }

    return content
  }

  html2md (str) {
      const turndownService = new TurndownService({
        headingStyle: 'atx',      // 使用 # ## ### 而不是 === ---
        codeBlockStyle: 'fenced', // 使用 ``` 而不是缩进
        bulletListMarker: '-',    // 列表使用 -
        emDelimiter: '*',         // 斜体使用 *
      });
      // Use the gfm plugin
      turndownService.use(gfm)

      // Use the table and strikethrough plugins only
      // turndownService.use([tables, strikethrough])

      // --- 【关键规则 1】: 强制处理代码块 (PRE) ---
      // 覆盖默认规则，防止在 li 中被转义
      turndownService.addRule('force-code-block', {
          filter: function (node) {
              return node.nodeName === 'PRE';
          },
          replacement: function (content, node) {
              // 1. 获取内部的 code 标签
              const codeNode = node.querySelector('code');
              
              // 2. 获取语言 (解析 class="language-bash" 或 data-language="bash")
              // CSDN 的结构通常在 code 上有 class="prism language-bash ..."
              let language = '';
              if (codeNode) {
                  const classAttr = codeNode.getAttribute('class') || '';
                  // 尝试匹配 language-xxx
                  const match = classAttr.match(/language-([a-z0-9+-]+)/i);
                  if (match) {
                      language = match[1];
                  } else {
                      // 备选：有时候语言在 data-language 属性里
                      language = codeNode.getAttribute('data-language') || '';
                  }
              }

              // 3. 获取纯净代码内容
              // 使用 textContent 忽略掉内部所有的 span 标签 (export, variable 等)
              // 这里的 trim() 视情况而定，一般去掉头尾空行比较好看
              let codeText = (codeNode || node).textContent.trim();
              // 将 \` 替换回 `，将 \$ 替换回 $
              codeText = codeText
                .replace(/\\`/g, '`')   // 修复模板字符串 \` -> `
                .replace(/\\\$/g, '$'); // 修复变量 \${name} -> ${name}

              // 4. 返回标准的 Markdown 代码块
              // \n\n 确保与上下文有间距，避免格式粘连
              return '\n\n```' + language + '\n' + codeText + '\n```\n\n';
          }
      });

      // --- 【关键规则 2】: 强制处理行内代码 (CODE) ---
      // 解决 `hf-mirror.com` 被转义为 \`hf-mirror.com\` 的问题
      turndownService.addRule('force-inline-code', {
          filter: function (node) {
              // 只有当 code 不在 pre 里面时，才算行内代码
              return node.nodeName === 'CODE' && node.parentNode.nodeName !== 'PRE';
          },
          replacement: function (content, node) {
              // 强制返回反引号包裹的内容，content 可能会包含转义字符，
              // 最好直接取 node.textContent 以确保纯净
              return '`' + node.textContent + '`';
          }
      });
      const markdown = turndownService.turndown(str)
      return markdown
    }

}

export async function getMdContent(url: string, body?:string) {
    try {
        const instance = new url2md(url);
        if (!body){
          // 使用 Fetch API 发起请求并等待其完成
          const response = await fetch(url, { 
             headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
             }
          });
          
          // 检查请求是否成功
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          body = await response.text(); // 获取响应文本
        }
        
        const title = instance.getTitle(body);
        const html = instance.getHtmlBody(body);
        const content = instance.html2md(html);
        return {title, content};
    } catch (error) {
        console.error('Failed to get markdown content:', error);
        throw error; 
    }
}
