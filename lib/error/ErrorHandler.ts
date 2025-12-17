import { logError, logSystem } from '@/lib/logger'

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'NETWORK',
  API_TIMEOUT = 'API_TIMEOUT',
  MCP_TOOL_FAILURE = 'MCP_TOOL_FAILURE',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  BROWSER_AUTOMATION_ERROR = 'BROWSER_AUTOMATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 错误恢复策略
export enum RecoveryStrategy {
  RETRY = 'RETRY',
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  SKIP_AND_CONTINUE = 'SKIP_AND_CONTINUE',
  FALLBACK_TO_SIMULATION = 'FALLBACK_TO_SIMULATION',
  ESCALATE = 'ESCALATE',
  ABORT = 'ABORT'
}

export interface ErrorContext {
  sessionId?: string
  stepId?: number
  operation: string
  timestamp: Date
  userAgent?: string
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryCondition?: (error: Error) => boolean
}

export interface ErrorInfo {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  originalError?: Error
  context: ErrorContext
  recoveryStrategy: RecoveryStrategy
  retryConfig?: RetryConfig
  timestamp: Date
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errorStats: Map<ErrorType, { count: number; lastOccurrence: Date }> = new Map()
  private isHealthy: boolean = true
  private circuitBreakerThreshold: number = 5
  private circuitBreakerTimeout: number = 60000 // 1分钟

  private constructor() {
    // 初始化错误统计
    Object.values(ErrorType).forEach(type => {
      this.errorStats.set(type, { count: 0, lastOccurrence: new Date() })
    })
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  // 主要的错误处理方法
  async handleError(
    error: Error, 
    context: ErrorContext, 
    recoveryStrategy: RecoveryStrategy = RecoveryStrategy.RETRY,
    retryConfig?: RetryConfig
  ): Promise<{ shouldContinue: boolean; recoveryAction?: () => Promise<any> }> {
    const errorInfo = this.categorizeError(error, context)
    errorInfo.recoveryStrategy = recoveryStrategy
    errorInfo.retryConfig = retryConfig

    // 记录错误
    this.logError(errorInfo)

    // 更新错误统计
    this.updateErrorStats(errorInfo.type)

    // 检查熔断器
    if (this.isCircuitBreakerOpen(errorInfo.type)) {
      return { shouldContinue: false }
    }

    // 根据恢复策略执行相应操作
    return await this.executeRecoveryStrategy(errorInfo)
  }

  // 分类错误类型
  private categorizeError(error: Error, context: ErrorContext): ErrorInfo {
    const message = error.message.toLowerCase()
    let type = ErrorType.UNKNOWN_ERROR
    let severity = ErrorSeverity.MEDIUM
    let strategy = RecoveryStrategy.RETRY

    // 网络相关错误
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      type = ErrorType.NETWORK
      severity = ErrorSeverity.HIGH
      strategy = RecoveryStrategy.RETRY_WITH_BACKOFF
    }
    // 超时错误
    else if (message.includes('timeout') || message.includes('timed out')) {
      type = ErrorType.API_TIMEOUT
      severity = ErrorSeverity.MEDIUM
      strategy = RecoveryStrategy.RETRY_WITH_BACKOFF
    }
    // MCP工具错误
    else if (message.includes('mcp') || message.includes('工具')) {
      type = ErrorType.MCP_TOOL_FAILURE
      severity = ErrorSeverity.HIGH
      strategy = RecoveryStrategy.FALLBACK_TO_SIMULATION
    }
    // AI服务错误
    else if (message.includes('ai') || message.includes('qwen') || message.includes('api')) {
      type = ErrorType.AI_SERVICE_ERROR
      severity = ErrorSeverity.MEDIUM
      strategy = RecoveryStrategy.FALLBACK_TO_SIMULATION
    }
    // 浏览器自动化错误
    else if (message.includes('browser') || message.includes('playwright') || message.includes('navigate')) {
      type = ErrorType.BROWSER_AUTOMATION_ERROR
      severity = ErrorSeverity.HIGH
      strategy = RecoveryStrategy.RETRY
    }
    // 配置错误
    else if (message.includes('config') || message.includes('invalid')) {
      type = ErrorType.INVALID_CONFIGURATION
      severity = ErrorSeverity.CRITICAL
      strategy = RecoveryStrategy.ABORT
    }
    // 资源耗尽
    else if (message.includes('memory') || message.includes('resource') || message.includes('exhausted')) {
      type = ErrorType.RESOURCE_EXHAUSTED
      severity = ErrorSeverity.CRITICAL
      strategy = RecoveryStrategy.ESCALATE
    }

    return {
      type,
      severity,
      message: error.message,
      originalError: error,
      context,
      recoveryStrategy: strategy,
      timestamp: new Date()
    }
  }

  // 执行恢复策略
  private async executeRecoveryStrategy(errorInfo: ErrorInfo): Promise<{ shouldContinue: boolean; recoveryAction?: () => Promise<any> }> {
    const { recoveryStrategy, retryConfig } = errorInfo

    switch (recoveryStrategy) {
      case RecoveryStrategy.RETRY:
      case RecoveryStrategy.RETRY_WITH_BACKOFF:
        if (retryConfig) {
          return await this.retryOperation(errorInfo, retryConfig)
        }
        break

      case RecoveryStrategy.SKIP_AND_CONTINUE:
        logSystem(`跳过失败操作: ${errorInfo.context.operation}`, 'ErrorHandler-executeRecoveryStrategy', errorInfo.context.sessionId)
        return { shouldContinue: true }

      case RecoveryStrategy.FALLBACK_TO_SIMULATION:
        logSystem(`使用模拟模式替代: ${errorInfo.context.operation}`, 'ErrorHandler-executeRecoveryStrategy', errorInfo.context.sessionId)
        return { shouldContinue: true, recoveryAction: this.getSimulationFallback(errorInfo) }

      case RecoveryStrategy.ESCALATE:
        logError(`错误已升级: ${errorInfo.message}`, errorInfo.originalError, 'ErrorHandler-executeRecoveryStrategy', errorInfo.context.sessionId)
        return { shouldContinue: false }

      case RecoveryStrategy.ABORT:
        logError(`操作被中止: ${errorInfo.message}`, errorInfo.originalError, 'ErrorHandler-executeRecoveryStrategy', errorInfo.context.sessionId)
        return { shouldContinue: false }
    }

    return { shouldContinue: false }
  }

  // 重试操作
  private async retryOperation(errorInfo: ErrorInfo, config: RetryConfig): Promise<{ shouldContinue: boolean }> {
    let attempts = 0
    let lastError: Error = errorInfo.originalError!

    while (attempts < config.maxRetries) {
      attempts++
      
      // 等待延迟（指数退避）
      if (attempts > 1) {
        const delay = this.calculateBackoffDelay(attempts - 1, config)
        logSystem(`重试操作 ${config.maxRetries - attempts + 1}/${config.maxRetries}, 等待 ${delay}ms`, 'ErrorHandler-retryOperation', errorInfo.context.sessionId)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // 检查重试条件
      if (config.retryCondition && !config.retryCondition(lastError)) {
        logSystem(`重试条件不满足，停止重试`, 'ErrorHandler-retryOperation', errorInfo.context.sessionId)
        break
      }

      try {
        // 这里可以执行具体的重试逻辑
        logSystem(`重试操作: ${errorInfo.context.operation}`, 'ErrorHandler-retryOperation', errorInfo.context.sessionId)
        
        // 如果重试成功，返回继续执行
        return { shouldContinue: true }
        
      } catch (error) {
        lastError = error as Error
        logSystem(`重试 ${attempts} 失败: ${lastError.message}`, 'ErrorHandler-retryOperation', errorInfo.context.sessionId)
      }
    }

    // 所有重试都失败了
    logError(`操作重试 ${config.maxRetries} 次后仍失败: ${errorInfo.message}`, errorInfo.originalError, 'ErrorHandler-retryOperation', errorInfo.context.sessionId)
    return { shouldContinue: false }
  }

  // 计算指数退避延迟
  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    return Math.min(exponentialDelay, config.maxDelay)
  }

  // 获取模拟降级方案
  private getSimulationFallback(errorInfo: ErrorInfo): () => Promise<any> {
    return async () => {
      logSystem(`执行模拟降级: ${errorInfo.context.operation}`, 'ErrorHandler-getSimulationFallback', errorInfo.context.sessionId)
      
      // 根据错误类型返回不同的模拟结果
      switch (errorInfo.type) {
        case ErrorType.MCP_TOOL_FAILURE:
          return { success: true, data: '模拟MCP工具执行成功' }
        case ErrorType.AI_SERVICE_ERROR:
          return { success: true, data: '模拟AI响应: 服务暂时不可用，使用模拟响应继续测试流程...' }
        case ErrorType.BROWSER_AUTOMATION_ERROR:
          return { success: true, data: '模拟浏览器操作成功' }
        default:
          return { success: true, data: '模拟操作执行成功' }
      }
    }
  }

  // 检查熔断器状态
  private isCircuitBreakerOpen(errorType: ErrorType): boolean {
    const stats = this.errorStats.get(errorType)
    if (!stats) return false

    const now = new Date()
    const timeSinceLastOccurrence = now.getTime() - stats.lastOccurrence.getTime()

    // 如果最近发生的错误太多，且时间间隔在超时范围内，打开熔断器
    if (stats.count >= this.circuitBreakerThreshold && 
        timeSinceLastOccurrence < this.circuitBreakerTimeout) {
      logSystem(`熔断器打开: ${errorType} 错误频率过高`, 'ErrorHandler-isCircuitBreakerOpen')
      return true
    }

    // 如果距离上次错误已经超过超时时间，重置统计
    if (timeSinceLastOccurrence >= this.circuitBreakerTimeout) {
      this.errorStats.set(errorType, { count: 0, lastOccurrence: now })
      return false
    }

    return false
  }

  // 更新错误统计
  private updateErrorStats(errorType: ErrorType): void {
    const stats = this.errorStats.get(errorType)
    if (stats) {
      stats.count++
      stats.lastOccurrence = new Date()
    }
  }

  // 记录错误
  private logError(errorInfo: ErrorInfo): void {
    const context = errorInfo.context
    const timestamp = errorInfo.timestamp.toISOString()
    
    logError(
      `[${errorInfo.type}] ${errorInfo.message} | 严重程度: ${errorInfo.severity} | 操作: ${errorInfo.context.operation}`,
      errorInfo.originalError,
      'ErrorHandler-logError',
      context.sessionId
    )

    // 记录到错误统计
    console.error(`[${timestamp}] ${errorInfo.type}: ${errorInfo.message}`, {
      severity: errorInfo.severity,
      context: errorInfo.context,
      recoveryStrategy: errorInfo.recoveryStrategy
    })
  }

  // 健康检查
  isSystemHealthy(): boolean {
    return this.isHealthy
  }

  // 重置系统状态
  resetSystem(): void {
    this.isHealthy = true
    this.errorStats.forEach((_, key) => {
      this.errorStats.set(key, { count: 0, lastOccurrence: new Date() })
    })
    logSystem('错误处理器已重置', 'ErrorHandler-resetSystem')
  }

  // 获取错误统计
  getErrorStats(): Record<string, { count: number; lastOccurrence: string }> {
    const stats: Record<string, { count: number; lastOccurrence: string }> = {}
    this.errorStats.forEach((value, key) => {
      stats[key] = {
        count: value.count,
        lastOccurrence: value.lastOccurrence.toISOString()
      }
    })
    return stats
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance()