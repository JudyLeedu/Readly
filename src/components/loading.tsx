export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-[#4A3B32]/20 rounded-full"></div>
        <div className="absolute inset-0 border-2 border-[#4A3B32] rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-sm text-[#4A3B32] font-medium flex items-center gap-2">
        <span>✨</span> 你的阅读搭子正在努力思考中...
      </p>
    </div>
  )
}
