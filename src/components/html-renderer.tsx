import DOMPurify from "dompurify"
import { useEffect, useRef } from "react"
import type { MessagePayload } from "../types"

interface Props {
  html: string
}

export default function HTMLRenderer({ html }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. 移除大模型可能包裹的 markdown 标签（如 ```html ... ```）
  const cleanMarkdown = html.replace(/^```html\n?/, "").replace(/```$/, "")

  // 2. 使用 DOMPurify 进行安全清洗，放行 Tailwind 类名和 SVG 绘图标签
  const safeHtml = DOMPurify.sanitize(cleanMarkdown, {
    USE_PROFILES: { html: true, svg: true },
    ADD_ATTR: [
      "data-anchor", 
      "target", 
      "class", 
      "stroke-linecap", 
      "stroke-linejoin", 
      "stroke-width", 
      "d", 
      "viewBox", 
      "fill", 
      "stroke", 
      "cx", "cy", "r", "x", "y", "width", "height"
    ]
  })

  // 3. 事件委托：拦截渲染内容中的点击事件，如果点击的是锚点，触发跨端滚动
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 向上寻找是否有 data-anchor 属性的元素
      const anchorBtn = target.closest("[data-anchor]")
      if (anchorBtn) {
        const anchorId = anchorBtn.getAttribute("data-anchor")
        if (anchorId) {
          console.log("[Reader Partner] 点击锚点:", anchorId)
          chrome.runtime.sendMessage({
            action: "SCROLL_TO_ANCHOR",
            data: { anchorId }
          } as MessagePayload)
        }
      }
    }

    container.addEventListener("click", handleClick)
    return () => container.removeEventListener("click", handleClick)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="reader-partner-rendered-content text-sm leading-relaxed space-y-4"
      dangerouslySetInnerHTML={{ __html: safeHtml }} 
    />
  )
}
