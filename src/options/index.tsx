import { useEffect, useState } from "react"
import { getStorage, setStorage, StorageKeys } from "../lib/storage"
import "./style.css"

export default function Options() {
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("deepseek-chat")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getStorage(StorageKeys.API_KEY).then(setApiKey)
    getStorage(StorageKeys.MODEL).then((m) => setModel(m || "deepseek-chat"))
  }, [])

  const handleSave = async () => {
    await setStorage(StorageKeys.API_KEY, apiKey)
    await setStorage(StorageKeys.MODEL, model)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#333333] p-10 font-sans flex justify-center">
      <div className="w-full max-w-2xl bg-white p-10 rounded-2xl shadow-sm border border-[#EAEAEA]">
        <h1 className="text-2xl font-semibold mb-2 text-[#4A3B32]">Reader Partner 设置</h1>
        <p className="text-sm text-gray-500 mb-8">配置你的大模型 API 密钥以启用沉浸式阅读伴侣。</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">模型选择 (支持火山引擎及官方接口)</label>
            <p className="text-xs text-gray-500 mb-3">
              - 官方 DeepSeek V3 请填: <strong>deepseek-chat</strong><br/>
              - 官方 DeepSeek R1 请填: <strong>deepseek-reasoner</strong><br/>
              - 火山引擎请填接入点 (如: ep-xxx)
            </p>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="例如: deepseek-chat"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A3B32] transition-all bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A3B32] transition-all"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-[#4A3B32] text-white py-3 rounded-lg hover:bg-[#3A2D25] transition-colors font-medium mt-4"
          >
            {saved ? "已保存 ✨" : "保存配置"}
          </button>
        </div>
      </div>
    </div>
  )
}
