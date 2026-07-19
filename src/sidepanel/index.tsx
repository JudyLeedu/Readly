import { useState, useRef, useEffect } from "react"
import { Storage } from "@plasmohq/storage"
import "./style.css"
import type { MessagePayload, ExtractResponse } from "../types"
import type { ArticleResponse } from "../types"
import { streamChat } from "../lib/llm"
import { SYSTEM_PROMPT } from "../lib/prompt"
import HTMLRenderer from "../components/html-renderer"
import Loading from "../components/loading"
// Plasmo 支持这种形式导入 assets 目录下的图片获取 URL
import iconUrl from "url:~assets/icon.png"

export default function SidePanel() {
  const [loading, setLoading] = useState(false)
  const [articleData, setArticleData] = useState<ExtractResponse | null>(null)
  
  // AI 响应流状态
  const [aiResponse, setAiResponse] = useState<string>("")
  const [parsedArticle, setParsedArticle] = useState<ArticleResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  // 记录用户收集的 takeaways
  const [takeaways, setTakeaways] = useState<{
    id: string, 
    text: string, 
    anchorId: string, 
    thought: string,
    isEditing: boolean 
  }[]>([])

  const storage = new Storage()
  const [currentUrl, setCurrentUrl] = useState<string>("")

  // 初始化获取当前网页 URL 和历史缓存
  useEffect(() => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.url && !activeTab.url.startsWith("chrome://")) {
        setCurrentUrl(activeTab.url)
        
        // 尝试从本地存储加载该 URL 的数据
        const cachedData = await storage.get(activeTab.url)
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData)
            if (parsed.articleData) setArticleData(parsed.articleData)
            if (parsed.aiResponse) setAiResponse(parsed.aiResponse)
            if (parsed.parsedArticle) setParsedArticle(parsed.parsedArticle)
            if (parsed.takeaways) setTakeaways(parsed.takeaways)
          } catch (e) {
            console.error("[Reader Partner] 解析缓存失败", e)
          }
        }
      }
    })
  }, [])

  // 每当核心数据变化时，自动持久化到本地存储
  useEffect(() => {
    if (currentUrl && (articleData || aiResponse || takeaways.length > 0)) {
      const dataToSave = {
        articleData,
        aiResponse,
        parsedArticle,
        // 保存 takeaways 时把 isEditing 状态去掉，默认设为 false
        takeaways: takeaways.map(t => ({ ...t, isEditing: false }))
      }
      storage.set(currentUrl, JSON.stringify(dataToSave))
    }
  }, [articleData, aiResponse, parsedArticle, takeaways, currentUrl])

  // 监听来自 Background 转发的 ADD_TAKEAWAY 消息
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === "ADD_TAKEAWAY" && message.data) {
        console.log("[SidePanel] 收到 Takeaway:", message.data)
        
        const newTakeaway = {
          id: Date.now().toString(),
          text: message.data.text,
          anchorId: message.data.anchorId,
          thought: "", 
          isEditing: true // 新增卡片默认进入编辑状态
        }

        setTakeaways(prev => {
          // 避免重复添加完全相同的文本
          if (prev.some(t => t.text === newTakeaway.text)) {
            return prev
          }
          
          const updated = [...prev, newTakeaway]
          
          // 按照 anchorId 中的数字大小进行正序排列
          updated.sort((a, b) => {
            if (!a.anchorId || !b.anchorId) return 0;
            const numA = parseInt(a.anchorId.replace('para-', '')) || 0;
            const numB = parseInt(b.anchorId.replace('para-', '')) || 0;
            return numA - numB;
          });
          
          return updated
        })
        
        // 平滑滚动到新增的卡片位置
        setTimeout(() => {
          const element = document.getElementById(`takeaway-${newTakeaway.id}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [aiResponse, isGenerating])

  const handleStartReading = () => {
    setLoading(true)
    
    const message: MessagePayload = { action: "EXTRACT_CONTENT" }
    
    chrome.runtime.sendMessage(message, async (response: ExtractResponse | null) => {
      setLoading(false)
      if (chrome.runtime.lastError || !response) {
        alert("未能成功提取正文，请确保左侧是一个有效的文章页面。")
        return
      }
      
      setArticleData(response)
      startLLMAnalysis(response)
    })
  }

  const startLLMAnalysis = async (article: ExtractResponse) => {
    setIsGenerating(true)
    setAiResponse("")
    setParsedArticle(null)
    
    try {
      // 确保内容不为空，且对超长内容进行截断（保留约 15000 字符，防止超出普通模型 token 限制）
      const safeContent = article.content ? article.content.substring(0, 15000) : "无正文内容"
      
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `请帮我阅读并总结这篇文章：\n\n标题：${article.title || "无标题"}\n\n正文结构：\n${safeContent}`
        }
      ]

      const stream = streamChat(messages)
      let fullResponse = ""
      for await (const chunk of stream) {
        fullResponse += chunk
        setAiResponse(fullResponse)
      }
      
      // 尝试解析完整的 JSON 响应
      try {
        // 清理可能的 markdown 代码块包裹
        let cleanJsonStr = fullResponse.trim()
        if (cleanJsonStr.startsWith("```json")) {
          cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, "")
          if (cleanJsonStr.endsWith("```")) {
            cleanJsonStr = cleanJsonStr.slice(0, -3).trim()
          }
        } else if (cleanJsonStr.startsWith("```")) {
          cleanJsonStr = cleanJsonStr.replace(/^```\s*/, "")
          if (cleanJsonStr.endsWith("```")) {
            cleanJsonStr = cleanJsonStr.slice(0, -3).trim()
          }
        }
        
        const parsed = JSON.parse(cleanJsonStr) as ArticleResponse
        setParsedArticle(parsed)
      } catch (e) {
        console.error("解析大模型返回的 JSON 失败:", e)
        setAiResponse(prev => prev + `\n\n<div class="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">解析 JSON 失败，请重试。</div>`)
      }
      
    } catch (error: any) {
      console.error(error)
      setAiResponse((prev) => prev + `\n\n<div class="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">出错了: ${error.message}</div>`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="h-screen bg-[#FAFAFA] flex flex-col font-sans text-[#333333] overflow-hidden">
      <header className="px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <img src={iconUrl} alt="Readly Logo" className="w-6 h-6 object-contain rounded-md" />
          <h1 className="text-lg font-semibold text-[#4A3B32]">Readly</h1>
        </div>
        <span className="text-xs text-gray-400">✨ Readly, 你的阅读搭子</span>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {!articleData ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 mb-4 flex items-center justify-center bg-transparent">
              <img src={iconUrl} alt="Readly Logo" className="w-full h-full object-contain" />
            </div>
            <p className="text-sm text-gray-500 max-w-[80%] leading-relaxed mb-8">
              请在左侧网页中打开一篇<span className="text-[#4A3B32] font-semibold">文章</span>，我将为你进行沉浸式翻译与解读。
            </p>
            <button 
              onClick={handleStartReading}
              disabled={loading}
              className="bg-[#4A3B32] text-white px-8 py-3 rounded-lg hover:bg-[#3A2D25] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "正在提取正文..." : "☕️  开启阅读时光"}
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 max-w-2xl mx-auto">
            {/* 文章 Header（不再显示原始未翻译标题），仅在生成完成后或者加载失败时显示提取字数 */}
            {!isGenerating && articleData && !parsedArticle?.error && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  已提取 {articleData.textContent ? articleData.textContent.length : (articleData.length || 0)} 字符
                </div>
              </div>
            )}

            {/* AI 响应渲染区 */}
            {(!aiResponse && isGenerating) ? (
              // 初始的 Loading 动画（点击按钮后，获取正文到开始请求大模型期间）
              // 保持和图2完全一致的样式
              <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 mb-4 relative">
                  <div className="absolute inset-0 border-2 border-[#EAEAEA] rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-[#4A3B32] rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="text-[#8A7363] font-medium text-sm flex items-center gap-1.5">
                  <span className="text-lg">✨</span> 你的阅读搭子正在努力思考中...
                </div>
              </div>
            ) : (
              <div className="mb-8">
                {isGenerating && !parsedArticle ? (
                  // 流式加载中（等待大模型返回完整 JSON 的过程）
                  // 使用完全相同的样式，避免闪烁和位置变化
                  <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 mb-4 relative">
                      <div className="absolute inset-0 border-2 border-[#EAEAEA] rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-[#4A3B32] rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <div className="text-[#8A7363] font-medium text-sm flex items-center gap-1.5">
                      <span className="text-lg">✨</span> 你的阅读搭子正在努力思考中...
                    </div>
                  </div>
                ) : parsedArticle ? (
                  // JSON 渲染模式
                  <div className="animate-in fade-in duration-500">
                    {/* 检查是否是被大模型判决为非文章的错误情况 */}
                    {parsedArticle.error ? (
                      <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center min-h-[60vh]">
                        <div className="text-3xl mb-4">☕️</div>
                        <div className="text-[#8A7363] font-medium text-[15px] text-center leading-relaxed max-w-[85%]">
                          {parsedArticle.error}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 1. 顶部：翻译后的主标题与一句话总结 */}
                        <div className="mb-6 pb-4 border-b border-[#EAEAEA]">
                          <h1 className="text-xl font-bold text-[#4A3B32] mb-4 leading-snug">{parsedArticle.title}</h1>
                          <h2 className="text-sm font-medium text-[#8A7363] tracking-wider uppercase mb-3">OVERVIEW</h2>
                          <div className="text-[14px] text-[#666666] leading-relaxed break-words">{parsedArticle.overview}</div>
                        </div>
                        
                        {/* 2. 主体：分块观点卡片 */}
                        <div className="flex flex-col gap-4">
                          {parsedArticle.highlights?.map((highlight, index) => (
                            <div key={index} className="group bg-white p-5 rounded-xl border border-[#EAEAEA] hover:border-[#8A7363] transition-all duration-300 flex flex-col gap-2">
                              {/* 标题区 */}
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-mono text-[#8A7363]">{(index + 1).toString().padStart(2, '0')}</span>
                                <span className="text-[15px] text-[#333333] font-medium tracking-wide">{highlight.title}</span>
                              </div>
                              
                              {/* 正文区：自适应排版 */}
                              <p className="text-[14px] text-[#666666] leading-relaxed break-words pl-8">{highlight.description}</p>
                              
                              {highlight.bulletPoints && highlight.bulletPoints.length > 0 && (
                                <ul className="list-disc pl-12 mt-1 space-y-1 text-[14px] text-[#666666] marker:text-[#8A7363]">
                                  {highlight.bulletPoints.map((point, i) => (
                                    <li key={i}>{point}</li>
                                  ))}
                                </ul>
                              )}
                              
                              {/* 极简溯源按钮：精准锚定 */}
                              <div className="mt-3 pl-8 flex justify-start">
                                <button 
                                  onClick={() => {
                                    chrome.runtime.sendMessage({ action: "SCROLL_TO_ANCHOR", data: { anchorId: highlight.anchorId } })
                                  }}
                                  className="inline-flex items-center gap-1 text-[13px] text-[#999999] hover:text-[#4A3B32] transition-colors cursor-pointer" 
                                  style={{ width: 'fit-content', flexShrink: 0, background: 'transparent', border: 'none', padding: 0 }}
                                  title="定位到原文"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                  </svg>
                                  <span>定位到原文</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // 解析失败降级
                  <div className="animate-in fade-in duration-500 bg-white p-4 rounded-xl border border-[#EAEAEA] flex flex-col gap-3">
                    <div className="text-[#8A7363] font-medium text-sm">大模型返回了非标准数据：</div>
                    <div className="whitespace-pre-wrap text-[13px] text-[#666666] font-mono overflow-auto max-h-[300px]">
                      {aiResponse}
                    </div>
                    <button 
                      onClick={() => {
                        // 重置状态
                        setAiResponse("")
                        setParsedArticle(null)
                        // 重新发送消息触发提取与生成流程
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                          if (tabs[0]?.id) {
                            setIsGenerating(true)
                            chrome.tabs.sendMessage(tabs[0].id, { action: "EXTRACT_CONTENT" }, (response) => {
                              if (chrome.runtime.lastError) {
                                console.error("Content script 未准备好:", chrome.runtime.lastError)
                                setIsGenerating(false)
                                alert("未能成功提取正文，请确保左侧是一个有效的文章页面。")
                                return
                              }
                              // 如果 Content Script 返回了 null，说明提取失败（可能是飞书文档、视频或动态网页）
                              if (response === null) {
                                setArticleData(null)
                                setAiResponse("")
                                setParsedArticle(null)
                                setIsGenerating(false)
                                alert("未能成功提取正文，请确保左侧是一个有效的文章页面。")
                              } else if (response) {
                                setArticleData(response)
                                startLLMAnalysis(response)
                              }
                            })
                          }
                        })
                      }}
                      className="mt-2 w-full py-2 bg-[#F9F7F5] hover:bg-[#F0EBE6] text-[#4A3B32] text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      重新提炼
                    </button>
                  </div>
                )}
                
                {/* 移除了旧版的 isGenerating && parsedArticle 闪烁圆点 */}
              </div>
            )}

            {/* Judy's Takeaway 收集区 */}
            {takeaways.length > 0 && (
              <div className="mt-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 bg-[#8A7363] rounded-full"></div>
                  <h3 className="text-sm font-bold text-[#4A3B32] tracking-wide">YOUR TAKEAWAY</h3>
                </div>
                
                <div className="flex flex-col gap-4">
                      {takeaways.map((item) => (
                        <div id={`takeaway-${item.id}`} key={item.id} className="bg-white p-4 rounded-xl border border-[#EAEAEA] shadow-sm flex flex-col gap-3">
                          {/* 摘录内容 */}
                      <div className="relative pl-3 border-l-2 border-[#8A7363]/30 text-[13px] text-[#666666] leading-relaxed break-words">
                          "{item.text}"
                        </div>
                        {item.anchorId && (
                        <div className="mt-3 flex justify-start">
                          <button 
                            onClick={() => {
                              chrome.runtime.sendMessage({ action: "SCROLL_TO_ANCHOR", data: { anchorId: item.anchorId } })
                            }}
                            className="inline-flex items-center gap-1 text-[13px] text-[#999999] hover:text-[#4A3B32] transition-colors cursor-pointer" 
                            style={{ width: 'fit-content', flexShrink: 0, background: 'transparent', border: 'none', padding: 0 }}
                            title="定位到原文"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                            <span>定位到原文</span>
                          </button>
                        </div>
                      )}
                      
                      {/* 想法输入框或展示区 */}
                      <div className="mt-1">
                        {item.isEditing ? (
                          <textarea
                            autoFocus
                            placeholder="补充你的洞察或想法（选填），按 Enter 保存，Command/Ctrl + Enter 换行..."
                            value={item.thought}
                            onChange={(e) => {
                              setTakeaways(prev => prev.map(t => t.id === item.id ? { ...t, thought: e.target.value } : t))
                            }}
                            onKeyDown={(e) => {
                              // Command/Ctrl + Enter 换行
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                // 默认行为可能不会插入换行符，所以我们手动插入
                                e.preventDefault()
                                const target = e.target as HTMLTextAreaElement
                                const start = target.selectionStart
                                const end = target.selectionEnd
                                const newValue = item.thought.substring(0, start) + "\n" + item.thought.substring(end)
                                
                                setTakeaways(prev => prev.map(t => t.id === item.id ? { ...t, thought: newValue } : t))
                                
                                // 光标位置延后处理
                                setTimeout(() => {
                                  target.selectionStart = target.selectionEnd = start + 1
                                }, 0)
                                return
                              }
                              
                              // 单独按 Enter 键保存
                              if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                                e.preventDefault() // 阻止默认的换行行为
                                setTakeaways(prev => prev.map(t => t.id === item.id ? { ...t, isEditing: false } : t))
                              }
                            }}
                            onBlur={() => {
                              // 失去焦点时也保存
                              setTakeaways(prev => prev.map(t => t.id === item.id ? { ...t, isEditing: false } : t))
                            }}
                            className="w-full text-[13px] bg-[#FAFAFA] border border-[#8A7363] rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-[#8A7363] transition-all resize-none min-h-[60px] text-[#333333] placeholder:text-[#BBBBBB]"
                          />
                        ) : (
                          <div 
                            onClick={() => {
                              setTakeaways(prev => prev.map(t => t.id === item.id ? { ...t, isEditing: true } : t))
                            }}
                            className="group/thought relative w-full text-[13px] bg-[#FAFAFA] border border-transparent hover:border-[#EAEAEA] rounded-md p-2.5 transition-all cursor-text min-h-[40px] text-[#333333]"
                          >
                            {item.thought ? (
                              <div className="whitespace-pre-wrap">{item.thought}</div>
                            ) : (
                              <div className="text-[#BBBBBB]">点击添加你的想法...</div>
                            )}
                            <div className="absolute right-2 top-2 opacity-0 group-hover/thought:opacity-100 text-[#999999] transition-opacity">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

