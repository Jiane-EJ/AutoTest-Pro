import path from 'path'
import fs from 'fs'

import winston from 'winston'

// 日志配置
const LOG_CONFIG = {
  // 日志消息最大长度，超过此长度会被截取
  maxMessageLength: 2000,
  // 是否启用截取
  enableTruncate: true
}

// 截取日志消息
const truncateMessage = (message: string): string => {
  if (!LOG_CONFIG.enableTruncate) return message
  if (message.length <= LOG_CONFIG.maxMessageLength) return message
  return message.substring(0, LOG_CONFIG.maxMessageLength) + `... [截取，原长度: ${message.length}]`
}

// 确保日志目录存在
const logDir = process.env.LOG_DIR || './logs'
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-test-platform' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

// 获取当前日期字符串 (YYYYMMDD)
const getDateString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// 已初始化的 session 记录，避免重复写入分隔符
const initializedSessions = new Set<string>()

// 写入新会话分隔符
const writeSessionSeparator = (logFile: string, sessionId: string): void => {
  const sessionKey = `${logFile}_${sessionId}`
  if (initializedSessions.has(sessionKey)) {
    return
  }
  
  const separator = `
==============================================
new-session = ${sessionId}
==============================================
`
  
  // 如果文件存在，追加分隔符
  if (fs.existsSync(logFile)) {
    fs.appendFileSync(logFile, separator)
  }
  
  initializedSessions.add(sessionKey)
}

// 创建专用的测试日志记录器
export const createTestLogger = (sessionId: string) => {
  const dateStr = getDateString()
  const testLogFile = path.join(logDir, `test_${dateStr}.log`)
  
  // 写入新会话分隔符
  writeSessionSeparator(testLogFile, sessionId)
  
  const testLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, type }) => {
        return `[${timestamp}] ${level.toUpperCase()} ${type ? `[${type}]` : ''}: ${message}`
      })
    ),
    transports: [
      new winston.transports.File({
        filename: testLogFile,
        maxsize: 10485760, // 10MB
        maxFiles: 3,
        options: { flags: 'a' } // 追加模式
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  })
  
  return testLogger
}

// 日志记录函数
export const logSystem = (message: string, sessionId?: string) => {
  const truncatedMsg = truncateMessage(message)
  const logMsg = `[SYSTEM] ${truncatedMsg}`
  console.log(logMsg)
  logger.info(truncatedMsg, { type: 'system', sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(truncatedMsg, { type: 'system' })
  }
}

export const logAI = (message: string, sessionId?: string) => {
  const truncatedMsg = truncateMessage(message)
  const logMsg = `[AI] ${truncatedMsg}`
  console.log(logMsg)
  logger.info(truncatedMsg, { type: 'ai', sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(truncatedMsg, { type: 'ai' })
  }
}

export const logMCP = (message: string, sessionId?: string) => {
  const truncatedMsg = truncateMessage(message)
  const logMsg = `[MCP] ${truncatedMsg}`
  console.log(logMsg)
  logger.info(truncatedMsg, { type: 'mcp', sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(truncatedMsg, { type: 'mcp' })
  }
}

export const logError = (message: string, error?: any, sessionId?: string) => {
  const truncatedMsg = truncateMessage(message)
  const errorMsg = error instanceof Error ? error.message : String(error)
  const logMsg = `[ERROR] ${truncatedMsg} - ${errorMsg}`
  console.error(logMsg)
  logger.error(truncatedMsg, { error, type: 'error', sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.error(truncatedMsg, { error, type: 'error' })
  }
}

// 导出配置，方便外部调整
export const setLogMaxLength = (length: number) => {
  LOG_CONFIG.maxMessageLength = length
}

export const setLogTruncateEnabled = (enabled: boolean) => {
  LOG_CONFIG.enableTruncate = enabled
}

export default logger
