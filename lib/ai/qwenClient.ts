/**
 * Qwen客户端 - 已废弃，请使用 aiClient
 * @author Jiane
 * @deprecated 请使用 lib/ai/aiClient.ts 中的 aiClient
 * 
 * 此文件保留是为了向后兼容，所有方法都委托给 aiClient
 */
import { logAI, logError } from '@/lib/logger'
import { getAIClient, AIRequest as UnifiedAIRequest } from '@/lib/ai/aiClient'

export interface QwenRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  max_tokens?: number
}

export interface QwenResponse {
  choices: Array<{
    message: {
      role: string
      content: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * @deprecated 请使用 aiClient
 */
export class QwenClient {
  constructor() {
    logAI(`[兼容层] QwenClient 已废弃，请使用 aiClient`, 'qwenClient-constructor')
  }

  async chatCompletion(request: QwenRequest, sessionId?: string): Promise<string> {
    const client = getAIClient()
    return client.chatCompletion({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens
    }, sessionId)
  }

  async analyzeTestStep(stepTitle: string, context: string, sessionId?: string): Promise<string> {
    const client = getAIClient()
    return client.analyzeTestStep(stepTitle, context, sessionId)
  }

  async generateTestCase(requirement: string, pageInfo: string, sessionId?: string): Promise<string> {
    const client = getAIClient()
    return client.generateTestCase(requirement, pageInfo, sessionId)
  }

  async analyzeLoginStatus(pageContent: string, sessionId?: string): Promise<{ success: boolean; data: any }> {
    const client = getAIClient()
    return client.analyzeLoginStatus(pageContent, sessionId)
  }

  async analyzePageFunctionality(pageContent: string, requirement: string, sessionId?: string): Promise<string> {
    const client = getAIClient()
    return client.analyzePageFunctionality(pageContent, requirement, sessionId)
  }
}

// 单例实例 - 委托给 aiClient
export const qwenClient = new QwenClient()
