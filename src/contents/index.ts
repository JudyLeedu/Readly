import type { PlasmoCSConfig } from "plasmo"
import { extractContent } from "./extractor"
import { setupSelectionPopover } from "./selection"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

// 初始化划词功能
setupSelectionPopover()

function scrollToAnchor(anchorId: string) {
  try {
    const element = document.querySelector(`[data-anchor="${anchorId}"]`) as HTMLElement
    if (!element) {
      console.warn(`[Reader Partner] 未找到对应锚点: ${anchorId}`)
      return false
    }

    console.log(`[Reader Partner] 成功找到锚点 ${anchorId}，准备滚动...`)

    // 1. 平滑滚动到该元素
    element.scrollIntoView({ behavior: "smooth", block: "center" })

    // 2. 移除之前的高亮
    document.querySelectorAll(".rp-highlight").forEach((el) => {
      el.classList.remove("rp-highlight")
      ;(el as HTMLElement).style.backgroundColor = ""
      ;(el as HTMLElement).style.outline = ""
      ;(el as HTMLElement).style.transition = ""
    })

    // 3. 为当前元素添加高亮（增强视觉效果，防止被微信行内样式覆盖）
    element.classList.add("rp-highlight")
    element.style.transition = "all 0.5s ease"
    element.style.outline = "3px solid #4A3B32"
    element.style.outlineOffset = "4px"
    element.style.backgroundColor = "rgba(74, 59, 50, 0.1)"

    return true
  } catch (error) {
    console.error("[Reader Partner] 滚动高亮失败:", error)
    return false
  }
}

// 监听来自 Background 转发的消息
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  if (message.action === "EXTRACT_CONTENT") {
    console.log("[Reader Partner] 收到提取指令")
    try {
      const article = extractContent()
      sendResponse(article)
    } catch (e) {
      console.error("[Reader Partner] 提取异常", e)
      sendResponse(null)
    }
    return true
  }

  if (message.action === "SCROLL_TO_ANCHOR") {
    console.log("[Reader Partner] 收到滚动指令:", message.data?.anchorId)
    try {
      const success = scrollToAnchor(message.data?.anchorId)
      sendResponse({ success })
    } catch (e) {
      console.error("[Reader Partner] 滚动异常", e)
      sendResponse({ success: false })
    }
    return true
  }
})

console.log("[Reader Partner] Content Script 顶层作用域已执行")


