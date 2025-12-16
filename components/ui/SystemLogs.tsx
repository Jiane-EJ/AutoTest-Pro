import { LogEntry } from '@/types/test'
interface SystemLogsProps {
  logs: LogEntry[]
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ logs }) => {
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'system':
        return 'text-primary'
      case 'ai':
        return 'text-purple-400'
      case 'mcp':
        return 'text-orange-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  const getLogLabel = (type: LogEntry['type']) => {
    switch (type) {
      case 'system':
        return '[系统]'
      case 'ai':
        return '[AI 智能体]'
      case 'mcp':
        return '[MCP]'
      case 'error':
        return '[AI 异常处理]'
      default:
        return '[未知]'
    }
  }

  const isMcpCall = (message: string) => {
    return message.includes('工具调用:')
  }

  const renderMessage = (log: LogEntry) => {
    if (log.isWaiting) {
      return (
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary animate-pulse"></span>
          <span className="text-slate-500 italic">等待 MCP 工具响应...</span>
        </div>
      )
    }

    if (isMcpCall(log.message)) {
      const parts = log.message.split('工具调用:')
      return (
        <>
          <span className="text-orange-200/80">工具调用: </span>
          <span className="text-slate-300 break-all">{parts[1]?.trim()}</span>
        </>
      )
    }

    return <span className="text-slate-300">{log.message}</span>
  }

  return (
    <div className="p-4 font-mono text-sm leading-relaxed space-y-2">
      {logs.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">暂无日志</div>
      ) : (
        logs.map((log, index) => (
          <div 
            key={index} 
            className={`flex gap-3 text-slate-500 ${
              isMcpCall(log.message) ? 'bg-[#1a232e] -mx-2 px-2 py-1 rounded' : ''
            }`}
          >
            <span className="shrink-0 text-[10px] pt-1">{log.timestamp}</span>
            <div>
              <span className={`${getLogColor(log.type)} font-bold`}>
                {getLogLabel(log.type)}
              </span>
              {renderMessage(log)}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
