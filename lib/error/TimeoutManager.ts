import { errorHandler, ErrorType, ErrorSeverity } from './ErrorHandler'

import { logSystem, logError } from '@/lib/logger'

export interface TimeoutConfig {
  maxDuration: number // 最大超时时间（毫秒）
  warningThreshold: number // 警告阈值（毫秒）
  timeoutStrategy: 'abort' | 'retry' | 'continue'
}

export class TimeoutManager {
  private static instance: TimeoutManager
  private timeouts: Map<string, NodeJS.Timeout> = new Map()
  private warningTimers: Map<string, NodeJS.Timeout> = new Map()

  private constructor() {}

  static getInstance(): TimeoutManager {
    if (!TimeoutManager.instance) {
      TimeoutManager.instance = new TimeoutManager()
    }
    return TimeoutManager.instance
  }

  // 创建带超时的操作
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig,
    operationName: string,
    sessionId?: string
  ): Promise<T> {
    const timeoutId = `${operationName}_${Date.now()}`
    
    return new Promise<T>((resolve, reject) => {
      // 设置超时定时器
      const timeoutTimer = setTimeout(async () => {
        this.handleTimeout(operationName, config, sessionId, timeoutId)
        try {
          await operation()
        } catch (error) {
          // 操作已经超时，但可能仍在执行
          console.warn(`操作 ${operationName} 已在超时后完成`)
        }
        reject(new Error(`操作 ${operationName} 超时 (${config.maxDuration}ms)`))
      }, config.maxDuration)

      this.timeouts.set(timeoutId, timeoutTimer)

      // 设置警告定时器
      const warningTimer = setTimeout(() => {
        this.handleTimeoutWarning(operationName, config, sessionId, timeoutId)
      }, config.warningThreshold)

      // 保存警告定时器，以便后续清理
      this.warningTimers.set(timeoutId, warningTimer)

      // 执行操作
      operation()
        .then((result) => {
          this.clearTimeout(timeoutId)
          resolve(result)
        })
        .catch((error) => {
          this.clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  // 处理超时
  private handleTimeout(operationName: string, config: TimeoutConfig, sessionId: string | undefined, timeoutId: string) {
    logSystem(`操作 ${operationName} 达到超时限制`, 'TimeoutManager-handleTimeout', sessionId)

    const context = {
      sessionId,
      operation: operationName,
      timestamp: new Date()
    }

    // 根据超时策略执行相应操作
    switch (config.timeoutStrategy) {
      case 'abort':
        errorHandler.handleError(
          new Error(`操作 ${operationName} 超时并被中止`),
          context,
          'ABORT' as any
        )
        break

      case 'retry':
        errorHandler.handleError(
          new Error(`操作 ${operationName} 超时，准备重试`),
          context,
          'RETRY' as any,
          {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000,
            backoffMultiplier: 2
          }
        )
        break

      case 'continue':
        logSystem(`操作 ${operationName} 超时但继续执行`, 'TimeoutManager-handleTimeout', sessionId)
        break
    }
  }

  // 处理超时警告
  private handleTimeoutWarning(operationName: string, config: TimeoutConfig, sessionId: string | undefined, timeoutId: string) {
    logSystem(`操作 ${operationName} 执行时间较长 (${config.warningThreshold}ms)`, 'TimeoutManager-handleTimeoutWarning', sessionId)
  }

  // 清除超时
  clearTimeout(timeoutId: string) {
    // 清除超时定时器
    const timer = this.timeouts.get(timeoutId)
    if (timer) {
      clearTimeout(timer)
      this.timeouts.delete(timeoutId)
    }
    // 清除警告定时器
    const warningTimer = this.warningTimers.get(timeoutId)
    if (warningTimer) {
      clearTimeout(warningTimer)
      this.warningTimers.delete(timeoutId)
    }
  }

  // 清除所有超时
  clearAllTimeouts() {
    this.timeouts.forEach((timer) => clearTimeout(timer))
    this.timeouts.clear()
    this.warningTimers.forEach((timer) => clearTimeout(timer))
    this.warningTimers.clear()
  }

  // 获取活动超时数量
  getActiveTimeoutCount(): number {
    return this.timeouts.size
  }

  // 检查操作是否即将超时
  isOperationNearTimeout(operationName: string, threshold: number = 5000): boolean {
    for (const [timeoutId, warningTime] of Array.from(this.warnings.entries())) {
      if (timeoutId.startsWith(operationName)) {
        const timeSinceWarning = Date.now() - warningTime.getTime()
        return timeSinceWarning > (threshold - 2000) // 提前2秒警告
      }
    }
    return false
  }
}

// 导出单例实例
export const timeoutManager = TimeoutManager.getInstance()

// 常用的超时配置（警告阈值统一为60秒）
export const TIMEOUT_CONFIGS = {
  QUICK: { maxDuration: 10000, warningThreshold: 60000, timeoutStrategy: 'abort' as const },
  NORMAL: { maxDuration: 60000, warningThreshold: 60000, timeoutStrategy: 'retry' as const },
  LONG: { maxDuration: 180000, warningThreshold: 180000, timeoutStrategy: 'continue' as const },
  AI_REQUEST: { maxDuration: 120000, warningThreshold: 120000, timeoutStrategy: 'retry' as const },
  BROWSER_OPERATION: { maxDuration: 60000, warningThreshold: 60000, timeoutStrategy: 'retry' as const },
  MCP_TOOL: { maxDuration: 90000, warningThreshold: 90000, timeoutStrategy: 'retry' as const }
}