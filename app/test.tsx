'use client'
import { useState } from 'react'

// 简化的测试组件，用于验证主线流程
export default function TestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [testConfig] = useState({
    url: 'https://wyt-pf-test.fuioupay.com/#',
    username: 'xwytlb001',
    password: '888888',
    requirement: '完整测试/community/list下的功能'
  })

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN')
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const runTest = async () => {
    if (isRunning) return
    
    setIsRunning(true)
    addLog('开始AI自动化测试流程...')
    
    try {
      // 1. 启动测试会话
      addLog('正在启动测试会话...')
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      })
      
      if (response.ok) {
        const data = await response.json()
        addLog(`测试会话已创建: ${data.sessionId}`)
        
        // 2. 等待测试完成
        addLog('等待测试执行完成...')
        
        // 3. 模拟监控测试进度
        const checkInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/test/status?sessionId=${data.sessionId}`)
            if (statusResponse.ok) {
              const status = await statusResponse.json()
              addLog(`测试状态: ${status.status}`)
              
              if (status.status === 'completed' || status.status === 'error') {
                clearInterval(checkInterval)
                setIsRunning(false)
                addLog(`测试完成，状态: ${status.status}`)
              }
            }
          } catch (error) {
            console.error('检查测试状态失败:', error)
          }
        }, 2000)
        
        // 5秒后停止检查
        setTimeout(() => {
          clearInterval(checkInterval)
          setIsRunning(false)
          addLog('测试监控超时结束')
        }, 30000)
        
      } else {
        throw new Error(`API调用失败: ${response.status}`)
      }
      
    } catch (error) {
      setIsRunning(false)
      addLog(`测试失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI自动化测试 - 功能验证</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2">测试配置</h2>
        <p>URL: {testConfig.url}</p>
        <p>账号: {testConfig.username}</p>
        <p>需求: {testConfig.requirement}</p>
      </div>
      
      <button 
        onClick={runTest}
        disabled={isRunning}
        className={`px-4 py-2 rounded text-white ${isRunning ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
      >
        {isRunning ? '测试运行中...' : '开始AI测试'}
      </button>
      
      <div className="mt-6">
        <h2 className="font-bold mb-2">测试日志</h2>
        <div className="bg-black text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}