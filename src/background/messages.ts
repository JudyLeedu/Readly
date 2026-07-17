import type { MessagePayload } from "../types"

// 监听来自 SidePanel 或 Content Script 的消息
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  // 1. 如果是来自 Content Script 的新增 Takeaway 消息，我们只需要将其广播给其他部分（比如 SidePanel）
  if (message.action === "ADD_TAKEAWAY") {
    console.log("[Background] 收到新增 Takeaway 请求:", message.data)
    // 广播消息，SidePanel 会监听到这个消息
    chrome.runtime.sendMessage(message)
    return false // 同步处理即可
  }

  // 2. 原有的逻辑：SidePanel 发送给 Content Script 的消息
  if (message.action === "EXTRACT_CONTENT" || message.action === "SCROLL_TO_ANCHOR") {
    // 使用 lastFocusedWindow 而不是 currentWindow，避免由于焦点在 SidePanel 导致查询不到准确的 Tab
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.id) {
        // 检查 tab 的 URL，防止在不支持的页面（如 chrome://）上发送消息
        if (activeTab.url && activeTab.url.startsWith("chrome://")) {
          sendResponse({ error: "Cannot extract content from chrome:// URLs" })
          return
        }

        // 转发消息给 Content Script
        chrome.tabs.sendMessage(activeTab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error("[Reader Partner] 转发消息失败:", chrome.runtime.lastError.message)
            sendResponse({ error: chrome.runtime.lastError.message })
          } else {
            sendResponse(response)
          }
        })
      } else {
        sendResponse({ error: "No active tab found" })
      }
    })
    // 返回 true 表示异步发送响应
    return true
  }
})

