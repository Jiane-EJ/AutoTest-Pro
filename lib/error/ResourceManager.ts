import { logSystem, logError } from '@/lib/logger'

export interface ResourceInfo {
  id: string
  type: 'browser' | 'database' | 'websocket' | 'mcp_process' | 'timer'
  createdAt: Date
  lastUsed: Date
  metadata?: any
}

export class ResourceManager {
  private static instance: ResourceManager
  private resources: Map<string, ResourceInfo> = new Map()
  private resourceLimits: Map<string, number> = new Map()

  private constructor() {
    // 设置默认资源限制
    this.resourceLimits.set('browser', 5)
    this.resourceLimits.set('mcp_process', 10)
    this.resourceLimits.set('websocket', 50)
  }

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager()
    }
    return ResourceManager.instance
  }

  // 注册资源
  registerResource(resource: ResourceInfo): boolean {
    const resourceType = resource.type
    const currentCount = this.getResourceCount(resourceType)
    const limit = this.resourceLimits.get(resourceType) || 10

    // 检查资源限制
    if (currentCount >= limit) {
      logError(`资源限制超限: ${resourceType} (${currentCount}/${limit})`, new Error('Resource limit exceeded'))
      return false
    }

    this.resources.set(resource.id, {
      ...resource,
      lastUsed: new Date()
    })

    logSystem(`资源已注册: ${resource.type} (${resource.id})`)
    return true
  }

  // 使用资源
  useResource(resourceId: string): boolean {
    const resource = this.resources.get(resourceId)
    if (!resource) {
      logError(`尝试使用不存在的资源: ${resourceId}`, new Error('Resource not found'))
      return false
    }

    resource.lastUsed = new Date()
    this.resources.set(resourceId, resource)
    return true
  }

  // 释放资源
  async releaseResource(resourceId: string, cleanupFn?: () => Promise<void>): Promise<boolean> {
    const resource = this.resources.get(resourceId)
    if (!resource) {
      logSystem(`尝试释放不存在的资源: ${resourceId}`)
      return false
    }

    try {
      // 执行清理函数
      if (cleanupFn) {
        await cleanupFn()
      }

      this.resources.delete(resourceId)
      logSystem(`资源已释放: ${resource.type} (${resourceId})`)
      return true
    } catch (error) {
      logError(`释放资源失败: ${resourceId}`, error as Error)
      return false
    }
  }

  // 获取资源
  getResource(resourceId: string): ResourceInfo | undefined {
    const resource = this.resources.get(resourceId)
    if (resource) {
      this.useResource(resourceId)
    }
    return resource
  }

  // 获取某种类型的所有资源
  getResourcesByType(type: ResourceInfo['type']): ResourceInfo[] {
    return Array.from(this.resources.values()).filter(resource => resource.type === type)
  }

  // 获取资源数量
  getResourceCount(type?: ResourceInfo['type']): number {
    if (type) {
      return this.getResourcesByType(type).length
    }
    return this.resources.size
  }

  // 清理长时间未使用的资源
  async cleanupUnusedResources(maxIdleTime: number = 300000): Promise<number> { // 5分钟默认
    const now = new Date()
    const idleResources: string[] = []

    this.resources.forEach((resource, resourceId) => {
      const idleTime = now.getTime() - resource.lastUsed.getTime()
      if (idleTime > maxIdleTime) {
        idleResources.push(resourceId)
      }
    })

    let cleanedCount = 0
    for (const resourceId of idleResources) {
      const success = await this.releaseResource(resourceId)
      if (success) cleanedCount++
    }

    if (cleanedCount > 0) {
      logSystem(`清理了 ${cleanedCount} 个闲置资源`)
    }

    return cleanedCount
  }

  // 设置资源限制
  setResourceLimit(type: ResourceInfo['type'], limit: number): void {
    this.resourceLimits.set(type, limit)
    logSystem(`资源限制已更新: ${type} = ${limit}`)
  }

  // 获取资源限制
  getResourceLimit(type: ResourceInfo['type']): number {
    return this.resourceLimits.get(type) || 10
  }

  // 获取资源使用统计
  getResourceStats(): Record<string, { count: number; limit: number; percentage: number }> {
    const stats: Record<string, { count: number; limit: number; percentage: number }> = {}

    this.resourceLimits.forEach((limit, type) => {
      const count = this.getResourceCount(type as ResourceInfo['type'])
      const percentage = Math.round((count / limit) * 100)
      stats[type] = { count, limit, percentage }
    })

    return stats
  }

  // 检查资源健康状态
  isResourceHealthy(): boolean {
    const stats = this.getResourceStats()
    
    for (const [type, { count, limit, percentage }] of Object.entries(stats)) {
      if (percentage >= 90) {
        logError(`资源使用率过高: ${type} (${percentage}%)`, new Error('Resource usage too high'))
        return false
      }
    }

    return true
  }

  // 强制清理所有资源（用于关闭应用时）
  async cleanupAllResources(): Promise<void> {
    const resourceIds = Array.from(this.resources.keys())
    const cleanupPromises = resourceIds.map(resourceId => this.releaseResource(resourceId))
    
    await Promise.allSettled(cleanupPromises)
    
    this.resources.clear()
    logSystem('所有资源已清理')
  }

  // 创建浏览器资源
  async createBrowserResource(sessionId: string, browserInstance: any): Promise<string | null> {
    const resourceId = `browser_${sessionId}_${Date.now()}`
    const resource: ResourceInfo = {
      id: resourceId,
      type: 'browser',
      createdAt: new Date(),
      lastUsed: new Date(),
      metadata: { sessionId }
    }

    if (this.registerResource(resource)) {
      // 存储浏览器实例引用
      ;(this.resources.get(resourceId) as any).browserInstance = browserInstance
      return resourceId
    }

    return null
  }

  // 创建MCP进程资源
  async createMCPResource(toolName: string, processInstance: any): Promise<string | null> {
    const resourceId = `mcp_${toolName}_${Date.now()}`
    const resource: ResourceInfo = {
      id: resourceId,
      type: 'mcp_process',
      createdAt: new Date(),
      lastUsed: new Date(),
      metadata: { toolName }
    }

    if (this.registerResource(resource)) {
      // 存储进程实例引用
      ;(this.resources.get(resourceId) as any).processInstance = processInstance
      return resourceId
    }

    return null
  }

  // 获取资源摘要
  getResourceSummary(): string {
    const stats = this.getResourceStats()
    const totalResources = this.getResourceCount()
    
    let summary = `资源使用情况 (总计: ${totalResources}):\n`
    
    for (const [type, { count, limit, percentage }] of Object.entries(stats)) {
      summary += `  ${type}: ${count}/${limit} (${percentage}%)\n`
    }

    return summary
  }
}

// 导出单例实例
export const resourceManager = ResourceManager.getInstance()

// 装饰器：自动资源管理
export function AutoResource(type: ResourceInfo['type'], metadata?: any) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const resourceId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      try {
        // 注册资源
        resourceManager.registerResource({
          id: resourceId,
          type,
          createdAt: new Date(),
          lastUsed: new Date(),
          metadata
        })

        // 执行原方法
        const result = await originalMethod.apply(this, [...args, resourceId])
        
        // 使用资源
        resourceManager.useResource(resourceId)
        
        return result
      } finally {
        // 释放资源
        await resourceManager.releaseResource(resourceId)
      }
    }

    return descriptor
  }
}