import path from 'path'
import fs from 'fs'

import winston from 'winston'
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

// 创建专用的测试日志记录器
export const createTestLogger = (sessionId: string) => {
  const testLogFile = path.join(logDir, `test_${sessionId}.log`)
  
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
  const logMsg = `[SYSTEM] ${message}`
  console.log(logMsg)
  logger.info(message, { type: 'system', sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(message, { type: 'system' })
  }
}

export const logAI = (message: string, sessionId?: string) => {
  const logMsg = `[AI] ${message}`
  console.log(logMsg)
  logger.info(message, { type: 'ai', sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(message, { type: 'ai' })
  }
}

export const logMCP = (message: string, sessionId?: string) => {
  const logMsg = `[MCP] ${message}`
  console.log(logMsg)
  logger.info(message, { type: 'mcp', sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.info(message, { type: 'mcp' })
  }
}

export const logError = (message: string, error?: any, sessionId?: string) => {
  const errorMsg = error instanceof Error ? error.message : String(error)
  const logMsg = `[ERROR] ${message} - ${errorMsg}`
  console.error(logMsg)
  logger.error(message, { error, type: 'error', sessionId })
  if (sessionId) {
    const testLogger = createTestLogger(sessionId)
    testLogger.error(message, { error, type: 'error' })
  }
}

export default logger
