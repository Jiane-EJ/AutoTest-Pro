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
/**
 * 系统日志
 * @param message 日志消息
 * @param source 来源标识，格式: 文件名-方法名，例如: "testRunner-executeStep"
 * @param sessionId 会话ID
 */
export const logSystem = (message: string, source?: string, sessionId?: string) => {
  const truncatedMsg = truncateMessage(message)
  const sourceTag = source ? `<${source}> ` : ''
  const logMsg = `[SYSTEM] ${sourceTag}${truncatedMsg}`
  console.log(logMsg)
  logger.info(`${sourceTag}${truncatedMsg}`, { type: 'system', source, sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(`${sourceTag}${truncatedMsg}`, { type: 'system' })
  }
}

/**
 * AI日志
 * @param message 日志消息
 * @param model 模型名称，例如: "qwen-max", "qwen-vl-max"
 * @param sessionId 会话ID
 */
export const logAI = (message: string, model?: string, sessionId?: string) => {
  const truncatedMsg = truncateMessage(message)
  const modelTag = model ? `<${model}> ` : ''
  const logMsg = `[AI] ${modelTag}${truncatedMsg}`
  console.log(logMsg)
  logger.info(`${modelTag}${truncatedMsg}`, { type: 'ai', model, sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(`${modelTag}${truncatedMsg}`, { type: 'ai' })
  }
}

/**
 * MCP工具日志
 * @param message 日志消息
 * @param tool 工具名称，例如: "playwright", "browser-mcp", "context7"
 * @param sessionId 会话ID
 */
export const logMCP = (message: string, tool?: string, sessionId?: string) => {
  const truncatedMsg = truncateMessage(message)
  const toolTag = tool ? `<${tool}> ` : ''
  const logMsg = `[MCP] ${toolTag}${truncatedMsg}`
  console.log(logMsg)
  logger.info(`${toolTag}${truncatedMsg}`, { type: 'mcp', tool, sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(`${toolTag}${truncatedMsg}`, { type: 'mcp' })
  }
}

/**
 * 错误日志
 * @param message 日志消息
 * @param error 错误对象
 * @param source 来源标识，格式: 文件名-方法名，例如: "testRunner-executeStep"
 * @param sessionId 会话ID
 */
export const logError = (message: string, error?: any, source?: string, sessionId?: string) => {
  const truncatedMsg = truncateMessage(message)
  const errorMsg = error instanceof Error ? error.message : String(error)
  const sourceTag = source ? `<${source}> ` : ''
  const logMsg = `[ERROR] ${sourceTag}${truncatedMsg} - ${errorMsg}`
  console.error(logMsg)
  logger.error(`${sourceTag}${truncatedMsg}`, { error, type: 'error', source, sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.error(`${sourceTag}${truncatedMsg}`, { error, type: 'error' })
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
