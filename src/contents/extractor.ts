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
    let article = reader.parse()

    // 4. 降级方案：如果 Readability 提取失败，或者提取的内容极短（少于 300 字符，可能只是抓到了副标题），
    // 我们尝试手动拼接页面中所有带有锚点的段落（p, li 等）作为正文内容。
    if (!article || (article.textContent && article.textContent.trim().length < 300)) {
      console.warn("[Reader Partner] Readability 提取内容过少或失败，触发降级方案拼接文本...")
      
      let fallbackContent = ""
      let fallbackTextContent = ""
      
      // 使用之前注入了锚点的真实节点对应的选择器
      const fallbackNodes = articleContainer ? articleContainer.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li") : document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li")
      
      fallbackNodes.forEach(node => {
        const text = node.textContent?.trim() || ""
        // 过滤掉极短的无意义文本，比如单独的数字、标点
        if (text.length > 5) {
          const anchorId = node.getAttribute("data-anchor") || ""
          // 构建带有 data-anchor 的基础 HTML 结构，保证溯源功能正常
          const tagName = node.tagName.toLowerCase()
          fallbackContent += `<${tagName} data-anchor="${anchorId}">${text}</${tagName}>\n`
          fallbackTextContent += text + "\n\n"
        }
      })

      // 如果降级方案抓到了足够的内容，则伪造一个 article 对象
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
          // 如果原本有 article 但字数太少，直接覆盖其内容
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


