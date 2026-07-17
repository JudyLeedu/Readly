export function scrollToAnchor(anchorId: string) {
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
    // 使用 border/outline 更醒目，因为微信内联样式可能会覆盖 background-color
    element.style.outline = "3px solid #4A3B32"
    element.style.outlineOffset = "4px"
    element.style.backgroundColor = "rgba(74, 59, 50, 0.1)"

    return true
  } catch (error) {
    console.error("[Reader Partner] 滚动高亮失败:", error)
    return false
  }
}
