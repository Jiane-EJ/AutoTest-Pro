export interface TestStatus {
  isRunning: boolean
  isPaused: boolean
  sessionId: string | null
  currentStep: number
  totalSteps: number
  progress: number
  elapsedTime: string
  environment: string
}
export interface TestStep {
  id: number
  title: string
  status: 'pending' | 'running' | 'completed' | 'error'
  duration: string | null
  log: string | null
}

export interface LogEntry {
  timestamp: string
  type: 'system' | 'ai' | 'mcp' | 'error'
  message: string
  isWaiting?: boolean
}

export interface TestConfig {
  url: string
  username: string
  password: string
  requirement: string
}

export interface WebSocketMessage {
  type: 'stepUpdate' | 'logUpdate' | 'statusUpdate'
  data: any
}
