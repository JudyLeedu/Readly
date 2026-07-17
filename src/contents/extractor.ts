import { Readability } from "@mozilla/readability"

export function extractContent() {
  try {
    // 关键修复：我们需要在原文档（真实DOM）中注入 anchor，而不是仅仅在克隆的 DOM 中注入
    // 这样当 SidePanel 传回 anchorId 时，我们才能在真实页面中找到该元素并滚动
    
    // 选取原网页中常见的块级元素（限制在主内容区域，避免污染全局）
    const articleContainer = document.querySelector("#js_content") || document.querySelector("article") || document.body
    
    // 确保找到了有效的容器再进行选择
    if (articleContainer) {
      const realBlocks = articleContainer.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li")
      
      // 1. 在原网页 DOM 注入锚点，用于后续高亮与滚动
      realBlocks.forEach((block, index) => {
        // 避免重复注入
        if (!block.hasAttribute("data-anchor")) {
          block.setAttribute("data-anchor", `para-${index}`)
        }
      })
    }

    // 2. 克隆 document 以免破坏原网页 DOM
    // 警告：Readability 在处理某些特定结构的克隆节点时会抛出 tagName of null 的错误。
    // 官方建议：不要只 clone 某个容器，而是 clone 整个 document，或者把 body 的 innerHTML 重新 parse。
    const documentClone = document.cloneNode(true) as Document

    // 3. 使用 Readability 提取正文
    const reader = new Readability(documentClone)
    const article = reader.parse()

    if (!article) {
      console.warn("[Reader Partner] 无法提取当前网页正文")
      return null
    }

    // 4. 修复标题：Readability 默认抓取 <title> 标签，容易带有 " | 网站名" 后缀
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


