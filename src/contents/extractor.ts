import { Readability } from "@mozilla/readability"

export function extractContent() {
  try {
    // 智能寻找主内容区域容器，避免抓到全局的导航栏和页脚
    let articleContainer: Element | null = 
      document.querySelector("#js_content") || 
      document.querySelector("article") || 
      document.querySelector("main") || 
      document.querySelector("[role='main']") ||
      document.body

    // 获取所有包含实质性文本的真实块级元素（无视标签类型，解决 div 模拟 p 的问题）
    const realBlocks: Element[] = []
    const walker = document.createTreeWalker(articleContainer, NodeFilter.SHOW_TEXT, null)
    let textNode;
    while (textNode = walker.nextNode()) {
      const text = textNode.nodeValue?.trim() || ""
      if (text.length > 20) { // 只提取包含有意义长句的元素
        const parent = textNode.parentElement
        if (parent && !realBlocks.includes(parent) && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE' && parent.tagName !== 'NOSCRIPT') {
          realBlocks.push(parent)
        }
      }
    }

    // 1. 在原网页 DOM 注入锚点，用于后续高亮与滚动
    realBlocks.forEach((block, index) => {
      if (!block.hasAttribute("data-anchor")) {
        block.setAttribute("data-anchor", `para-${index}`)
      }
    })

    // 2. 克隆 document 以免破坏原网页 DOM
    const documentClone = document.cloneNode(true) as Document

    // 3. 使用 Readability 提取正文
    const reader = new Readability(documentClone)
    let article = reader.parse()

    // 4. 降级方案：如果 Readability 提取失败，或者提取的内容极短（少于 300 字符）
    if (!article || (article.textContent && article.textContent.trim().length < 300)) {
      console.warn("[Reader Partner] Readability 提取内容过少或失败，触发智能文本块拼接降级方案...")
      
      let fallbackContent = ""
      let fallbackTextContent = ""
      
      realBlocks.forEach(node => {
        const text = node.textContent?.trim() || ""
        if (text.length > 20) {
          const anchorId = node.getAttribute("data-anchor") || ""
          const tagName = node.tagName.toLowerCase()
          fallbackContent += `<${tagName} data-anchor="${anchorId}">${text}</${tagName}>\n`
          fallbackTextContent += text + "\n\n"
        }
      })

      // 如果降级方案抓到了足够的内容
      if (fallbackTextContent.length > 100) {
        if (!article) {
          article = {
            title: document.title,
            content: fallbackContent,
            textContent: fallbackTextContent,
            length: fallbackTextContent.length,
            excerpt: "",
            byline: "",
            dir: "",
            siteName: "",
            lang: "",
            publishedTime: ""
          }
        } else {
          article.content = fallbackContent
          article.textContent = fallbackTextContent
          article.length = fallbackTextContent.length
        }
        console.log("[Reader Partner] 降级方案提取成功，字符数:", article.length)
      } else {
        console.warn("[Reader Partner] 降级方案也未能提取到有效长文")
        if (!article) return null
      }
    }

    if (!article) {
      console.warn("[Reader Partner] 无法提取当前网页正文")
      return null
    }

    // 5. 修复标题：Readability 默认抓取 <title> 标签，容易带有 " | 网站名" 后缀
    // 我们优先信任页面中视觉上最大的标题（通常是第一个 h1）
    const h1Element = document.querySelector("h1")
    if (h1Element && h1Element.textContent) {
      // 替换掉多余的换行符和空格
      const h1Text = h1Element.textContent.replace(/\s+/g, " ").trim()
      if (h1Text.length > 0) {
        article.title = h1Text
      }
    }

    console.log("[Reader Partner] 正文提取成功:", article.title)
    return article
  } catch (error) {
    console.error("[Reader Partner] 正文提取失败:", error)
    return null
  }
}


