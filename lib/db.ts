import { logSystem, logError } from '@/lib/logger'

// 内存数据库结构
interface TestSession {
  session_id: string
  url: string
  username: string
  requirement: string
  status: string
  created_at: string
  updated_at: string
  completed_at?: string
}

interface TestStep {
  id: number
  session_id: string
  step_id: number
  title: string
  status: string
  duration?: string
  log?: string
  created_at: string
  completed_at?: string
}

interface TestLog {
  id: number
  session_id: string
  timestamp: string
  type: string
  message: string
  created_at: string
}

// 内存存储
const sessions: Map<string, TestSession> = new Map()
const steps: Map<string, TestStep[]> = new Map()
const logs: Map<string, TestLog[]> = new Map()

export const initDatabase = (sessionId?: string) => {
  try {
    logSystem('内存数据库初始化成功', 'db-initDatabase', sessionId)
    return true
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logError(`数据库初始化失败: ${errorMsg}`, error, 'db-initDatabase', sessionId)
    throw error
  }
}

export const getDatabase = () => {
  if (sessions.size === 0) {
    initDatabase()
  }
  return {
    // 模拟数据库操作方法
    prepare: (query: string) => ({
      run: (params: any) => ({ changes: 1, lastInsertRowid: 1 }),
      get: (params: any) => null,
      all: (params: any) => []
    })
  }
}

export const createSession = (sessionData: TestSession) => {
  sessions.set(sessionData.session_id, sessionData)
  steps.set(sessionData.session_id, [])
  logs.set(sessionData.session_id, [])
  logSystem(`创建测试会话: ${sessionData.session_id}`, 'db-createSession', sessionData.session_id)
}

export const updateSessionStatus = (sessionId: string, status: string) => {
  const session = sessions.get(sessionId)
  if (session) {
    session.status = status
    session.updated_at = new Date().toISOString()
    if (status === 'completed') {
      session.completed_at = new Date().toISOString()
    }
    sessions.set(sessionId, session)
    logSystem(`更新会话状态: ${sessionId} -> ${status}`, 'db-updateSessionStatus', sessionId)
  }
}

export const getSession = (sessionId: string) => {
  return sessions.get(sessionId) || null
}

export const createStep = (stepData: TestStep) => {
  const sessionSteps = steps.get(stepData.session_id) || []
  sessionSteps.push(stepData)
  steps.set(stepData.session_id, sessionSteps)
  logSystem(`创建测试步骤: ${stepData.session_id} - ${stepData.step_id}`, 'db-createStep', stepData.session_id)
}

export const updateStep = (sessionId: string, stepId: number, stepData: Partial<TestStep>) => {
  const sessionSteps = steps.get(sessionId) || []
  const stepIndex = sessionSteps.findIndex(s => s.step_id === stepId)
  
  if (stepIndex !== -1) {
    sessionSteps[stepIndex] = { ...sessionSteps[stepIndex], ...stepData }
    steps.set(sessionId, sessionSteps)
    logSystem(`更新测试步骤: ${sessionId} - ${stepId}`, 'db-updateStep', sessionId)
  }
}

export const getSteps = (sessionId: string) => {
  return steps.get(sessionId) || []
}

export const createLog = (logData: TestLog) => {
  const sessionLogs = logs.get(logData.session_id) || []
  sessionLogs.push(logData)
  logs.set(logData.session_id, sessionLogs)
}

export const getLogs = (sessionId: string) => {
  return logs.get(sessionId) || []
}

export const closeDatabase = (sessionId?: string) => {
  sessions.clear()
  steps.clear()
  logs.clear()
  logSystem('内存数据库已清理', 'db-closeDatabase', sessionId)
}

// 初始化数据库
if (typeof window === 'undefined') {
  try {
    initDatabase()
  } catch (error) {
    console.error('数据库初始化失败:', error)
  }
}
