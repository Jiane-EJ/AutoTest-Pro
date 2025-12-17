'use client'
import { useState, useEffect } from 'react'

import { PlaywrightTestRunner } from '@/components/ui/PlaywrightTestRunner'
import { TestTimeline } from '@/components/ui/TestTimeline'
import { SystemLogs } from '@/components/ui/SystemLogs'
import { ControlPanel } from '@/components/ui/ControlPanel'
import { useWebSocket } from '@/hooks/useWebSocket'
import { TestStatus, TestStep, LogEntry } from '@/types/test'

interface TestCase {
  id: number
  name: string
  description: string
  url: string
  username: string
  password: string
  requirement: string
  steps: number
  lastRun: string
  status: string
}

const DEFAULT_TEST_STATUS: TestStatus = {
  isRunning: false,
  isPaused: false,
  sessionId: null,
  currentStep: 0,
  totalSteps: 12,
  progress: 0,
  elapsedTime: '00:00:00',
  environment: '生产环境 (Production)'
}

const DEFAULT_TEST_CONFIG = {
  url: 'https://wyt-pf-test.fuioupay.com/#',
  username: 'xwytlb001',
  password: '888888',
  requirement: '完整测试小区管理-小区信息管理下的功能'
}

export default function Home() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [testStatus, setTestStatus] = useState<TestStatus>(DEFAULT_TEST_STATUS)
  const [testSteps, setTestSteps] = useState<TestStep[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [testConfig, setTestConfig] = useState(DEFAULT_TEST_CONFIG)
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null)
  const [isLoadingCases, setIsLoadingCases] = useState(true)

  // 使用WebSocket连接实时更新
  const { getConnectionState } = useWebSocket()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 加载测试案例列表
  useEffect(() => {
    if (!isHydrated) return

    const fetchTestCases = async () => {
      try {
        const response = await fetch('/api/test/cases')
        const data = await response.json()
        if (data.success) {
          setTestCases(data.data)
          if (data.data.length > 0) {
            setSelectedCaseId(data.data[0].id)
          }
        }
      } catch (error) {
        console.error('加载测试案例失败:', error)
      } finally {
        setIsLoadingCases(false)
      }
    }

    fetchTestCases()
  }, [isHydrated])

  // 当选中案例变化时，加载对应的步骤和日志
  useEffect(() => {
    if (!isHydrated || !testStatus.sessionId) return

    const fetchSessionData = async () => {
      try {
        // 并行加载步骤和日志
        const [stepsRes, logsRes] = await Promise.all([
          fetch(`/api/test/steps?sessionId=${testStatus.sessionId}`),
          fetch(`/api/test/logs?sessionId=${testStatus.sessionId}`)
        ])

        const stepsData = await stepsRes.json()
        const logsData = await logsRes.json()

        if (stepsData.success) {
          setTestSteps(stepsData.data)
        }
        if (logsData.success) {
          setLogs(logsData.data)
        }
      } catch (error) {
        console.error('加载会话数据失败:', error)
      }
    }

    fetchSessionData()
  }, [isHydrated, testStatus.sessionId])

  useEffect(() => {
    if (!isHydrated) return

    const interval = setInterval(() => {
      const { isConnected, lastMessage } = getConnectionState()
      
      if (lastMessage && lastMessage.type) {
        // 处理WebSocket消息更新
        if (lastMessage.type === 'stepUpdate') {
          setTestSteps(prev => prev.map(step =>
            step.id === lastMessage.stepId ? { ...step, ...lastMessage.stepData } : step
          ))
        } else if (lastMessage.type === 'logUpdate') {
          setLogs(prev => [...prev, lastMessage.logEntry])
        } else if (lastMessage.type === 'statusUpdate') {
          setTestStatus(prev => ({ ...prev, ...lastMessage.statusData }))
        }
      }
    }, 500) // 每500ms检查一次WebSocket消息

    return () => clearInterval(interval)
  }, [isHydrated, getConnectionState])

  const handleSelectCase = (caseId: number) => {
    const selectedCase = testCases.find(c => c.id === caseId)
    if (selectedCase) {
      setSelectedCaseId(caseId)
      setTestConfig({
        url: selectedCase.url,
        username: selectedCase.username,
        password: selectedCase.password,
        requirement: selectedCase.requirement
      })
    }
  }

  const handleStartTest = async () => {
    try {
      setTestStatus(prev => ({ ...prev, isRunning: true, isPaused: false }))
      
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      })
      
      if (response.ok) {
        const data = await response.json()
        setTestStatus(prev => ({ ...prev, sessionId: data.sessionId }))
      }
    } catch (error) {
      console.error('启动测试失败:', error)
    }
  }

  const handlePauseTest = async () => {
    try {
      await fetch('/api/test/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: testStatus.sessionId })
      })
      setTestStatus(prev => ({ ...prev, isPaused: true }))
    } catch (error) {
      console.error('暂停测试失败:', error)
    }
  }

  const handleStopTest = async () => {
    try {
      await fetch('/api/test/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: testStatus.sessionId })
      })
      setTestStatus(prev => ({ ...prev, isRunning: false, isPaused: false }))
    } catch (error) {
      console.error('停止测试失败:', error)
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex flex-col h-screen">
        <header className="flex-none flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#233648] px-6 py-3 bg-white dark:bg-[#111a22]">
          <div className="flex items-center gap-4">
            <div className="size-8 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">smart_toy</span>
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight tracking-tight">UI 自动化平台</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-block size-2 rounded-full bg-green-500"></span>
                <span>系统正常</span>
              </div>
            </div>
          </div>
        </header>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-none flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#233648] px-6 py-3 bg-white dark:bg-[#111a22]">
        <div className="flex items-center gap-4">
          <div className="size-8 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">smart_toy</span>
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight tracking-tight">UI 自动化平台</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-block size-2 rounded-full bg-green-500"></span>
              <span>系统正常</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center gap-2 rounded-lg h-9 px-4 bg-slate-100 dark:bg-[#233648] hover:bg-slate-200 dark:hover:bg-[#2f455a] text-sm font-bold transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>新建测试</span>
          </button>
          <button className="flex items-center justify-center gap-2 rounded-lg h-9 px-4 bg-slate-100 dark:bg-[#233648] hover:bg-slate-200 dark:hover:bg-[#2f455a] text-sm font-bold transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>导出报告</span>
          </button>
        </div>
      </header>

      {/* Main Content - 左中右三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左栏 - 测试案例列表 */}
        <aside className="w-[280px] flex-none flex flex-col border-r border-slate-200 dark:border-[#233648] bg-white dark:bg-[#111a22] overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-[#233648]">
            <h3 className="font-bold text-base mb-1">测试案例</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">共 {testCases.length} 个案例</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {isLoadingCases ? (
              <div className="text-center py-8 text-slate-500">加载中...</div>
            ) : (
              testCases.map(testCase => (
                <div
                  key={testCase.id}
                  onClick={() => handleSelectCase(testCase.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedCaseId === testCase.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-slate-50 dark:bg-[#1a232e] border border-transparent hover:border-slate-200 dark:hover:border-[#2b3d52]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-bold truncate">{testCase.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                      testCase.status === 'running' ? 'bg-primary/20 text-primary' :
                      testCase.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                      'bg-slate-200/20 text-slate-500'
                    }`}>
                      {testCase.status === 'running' ? '运行中' : testCase.status === 'completed' ? '已完成' : '待运行'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{testCase.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{testCase.steps} 步骤</span>
                    <span>{testCase.lastRun}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* 中栏 - 浏览器预览和时间轴 */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0c1219] overflow-hidden">
          {/* Control Panel */}
          <ControlPanel
            testStatus={testStatus}
            testConfig={testConfig}
            setTestConfig={setTestConfig}
            onStartTest={handleStartTest}
            onPauseTest={handlePauseTest}
            onStopTest={handleStopTest}
          />

          {/* Content Area - 浏览器预览 */}
          <div className="flex-1 p-5 pt-4 flex gap-5 overflow-hidden">
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {/* Playwright Preview */}
              <div className="flex-1 flex flex-col bg-white dark:bg-[#1a232e] rounded-xl border border-slate-200 dark:border-[#2b3d52] overflow-hidden shadow-lg">
                <PlaywrightTestRunner 
                  isRunning={testStatus.isRunning}
                  currentStep={testSteps.find(s => s.status === 'running')}
                />
              </div>

              {/* Test Timeline */}
              <div className="h-[200px] flex flex-col bg-white dark:bg-[#1a232e] rounded-xl border border-slate-200 dark:border-[#2b3d52] overflow-hidden shadow-lg">
                <div className="p-3 border-b border-slate-200 dark:border-[#2b3d52] bg-slate-50 dark:bg-[#151d26]">
                  <h3 className="font-bold text-sm">测试步骤时间轴</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                  <TestTimeline 
                    steps={testSteps}
                    currentStep={testStatus.currentStep}
                    isRunning={testStatus.isRunning}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* 右栏 - 系统日志和MCP工具输出 */}
        <aside className="w-[320px] flex-none flex flex-col border-l border-slate-200 dark:border-[#233648] bg-[#111a22] overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b3d52] bg-[#151d26]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-sm">terminal</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">系统日志 / MCP</span>
            </div>
            <div className="flex gap-2">
              <button className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-base">vertical_align_bottom</span>
              </button>
              <button className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-base">filter_list</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <SystemLogs logs={logs} />
          </div>
        </aside>
      </div>
    </div>
  )
}
