let popoverElement: HTMLDivElement | null = null
let selectionTimeout: NodeJS.Timeout | null = null

export function setupSelectionPopover() {
  if (typeof document === "undefined") return

  // 创建或获取 Popover 元素
  const createPopover = () => {
    if (popoverElement) return popoverElement

    popoverElement = document.createElement("div")
    // 使用极简的咖啡色调样式
    popoverElement.style.position = "absolute"
    popoverElement.style.display = "none"
    popoverElement.style.zIndex = "2147483647" // 保证在最上层
    popoverElement.style.backgroundColor = "#4A3B32"
    popoverElement.style.color = "#FAFAFA"
    popoverElement.style.padding = "6px 10px"
    popoverElement.style.borderRadius = "6px"
    popoverElement.style.fontSize = "13px"
    popoverElement.style.fontWeight = "500"
    popoverElement.style.cursor = "pointer"
    popoverElement.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
    popoverElement.style.transition = "opacity 0.2s ease, transform 0.2s ease"
    popoverElement.style.transform = "translateY(5px)"
    popoverElement.style.opacity = "0"
    popoverElement.style.fontFamily = "system-ui, -apple-system, sans-serif"
    
    // 内容
    popoverElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 4px;">
        <svg style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        <span>提取</span>
      </div>
    `

    document.body.appendChild(popoverElement)

    // 点击事件：提取文本并发送给 SidePanel
    popoverElement.addEventListener("mousedown", (e) => {
      e.preventDefault() // 防止点击时丢失选区
      e.stopPropagation()
      
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      const text = selection.toString().trim()
      if (!text) return

      // 寻找最近的带有 data-anchor 的祖先元素
      let anchorId = ""
      let node = selection.anchorNode
      while (node && node !== document.body) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement
          if (element.hasAttribute("data-anchor")) {
            anchorId = element.getAttribute("data-anchor") || ""
            break
          }
        }
        node = node.parentNode
      }

      // 发送消息到 Background，由 Background 转发给 SidePanel
      const message = {
        action: "ADD_TAKEAWAY",
        data: {
          text,
          anchorId
        }
      }
      chrome.runtime.sendMessage(message)

      // 隐藏 Popover
      hidePopover()
      selection.removeAllRanges() // 清除选区，给用户反馈
    })

    return popoverElement
  }

  const hidePopover = () => {
    if (popoverElement) {
      popoverElement.style.opacity = "0"
      popoverElement.style.transform = "translateY(5px)"
      setTimeout(() => {
        if (popoverElement) popoverElement.style.display = "none"
      }, 200)
    }
  }

  // 监听鼠标抬起事件
  document.addEventListener("mouseup", (e) => {
    // 如果点击的是 popover 本身，不处理（由 mousedown 处理了）
    if (popoverElement && popoverElement.contains(e.target as Node)) {
      return
    }

    // 防抖处理：用户停止选词 300ms 后再触发逻辑
    if (selectionTimeout) clearTimeout(selectionTimeout)

    selectionTimeout = setTimeout(() => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (!selection || !text || text.length < 2) {
        hidePopover()
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      const popover = createPopover()
      
      // 计算位置：选区上方居中
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      // 预估 popover 宽度（约 60px）
      const popoverWidth = 60
      
      const top = rect.top + scrollTop - 40 // 选区上方 40px
      const left = rect.left + scrollLeft + (rect.width / 2) - (popoverWidth / 2)

      popover.style.display = "block"
      // 强制回流以应用动画
      popover.offsetHeight
      
      popover.style.top = `${top}px`
      popover.style.left = `${left}px`
      popover.style.opacity = "1"
      popover.style.transform = "translateY(0)"
    }, 300)
  })

  // 滚动或调整窗口大小时隐藏
  window.addEventListener("scroll", hidePopover)
  window.addEventListener("resize", hidePopover)
}
