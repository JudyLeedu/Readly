import { getStorage, StorageKeys } from "./storage"

export async function* streamChat(messages: {role: string, content: string}[]) {
  const apiKey = await getStorage(StorageKeys.API_KEY)
  const model = await getStorage(StorageKeys.MODEL) || "deepseek-chat"
  
  if (!apiKey) {
    throw new Error("API Key 未配置，请右键扩展图标进入“选项”页面进行配置。")
  }

  // 火山引擎的推理接入点都是以 ep- 开头的（不论底层是豆包还是 DeepSeek）
  const isVolcengine = model.startsWith("ep-")
  const isDeepSeekOfficial = model.includes("deepseek") && !isVolcengine
  
  let endpoint = "https://api.openai.com/v1/chat/completions"
  if (isVolcengine) {
    endpoint = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
  } else if (isDeepSeekOfficial) {
    endpoint = "https://api.deepseek.com/chat/completions"
  }

  // 过滤掉可能存在的 content 为空的消息，避免触发 API 严格校验错误
  // 并且强制转换为字符串，防止某些特殊情况下传递了 undefined/null 但没被过滤掉
  const validMessages = messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => ({
      role: m.role,
      content: m.content
    }))

  console.log("[Reader Partner] 发送给 API 的消息:", JSON.stringify(validMessages).substring(0, 200) + "...")

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: validMessages,
      stream: true,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 请求失败 (${response.status})`)
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder("utf-8")
  if (!reader) return

  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
        try {
          const data = JSON.parse(trimmed.slice(6))
          const content = data.choices[0]?.delta?.content || ""
          if (content) yield content
        } catch (e) {
          // 忽略不完整的 JSON 解析错误
        }
      }
    }
  }
}
