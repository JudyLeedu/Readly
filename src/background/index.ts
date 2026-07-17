export {}
import "./messages"

// 监听插件安装或更新，初始化配置
chrome.runtime.onInstalled.addListener(() => {
  console.log("[Reader Partner] 插件已安装/更新")
})

// 允许通过点击插件图标打开侧边栏
if (chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("[Reader Partner] 无法设置 sidePanel 行为:", error))
}
