import { logAI, logError } from '@/lib/logger'

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

export class QwenClient {
  private apiKey: string
  private apiUrl: string

  constructor() {
    this.apiKey = process.env.QWEN_API_KEY || ''
    this.apiUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    
    if (!this.apiKey) {
      throw new Error('QWEN_API_KEY 环境变量未配置')
    }
    logAI(`Qwen客户端已初始化，API URL: ${this.apiUrl}`, undefined)
  }

  async chatCompletion(request: QwenRequest, sessionId?: string): Promise<string> {
    try {
      const userMessage = request.messages[request.messages.length - 1]?.content || ''
      logAI(`调用Qwen API: ${userMessage}`, sessionId)

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature || 0.3,
          max_tokens: request.max_tokens || 1000,
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Qwen API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data: QwenResponse = await response.json()
      
      const result = data.choices?.[0]?.message?.content
      if (!result) {
        throw new Error('Qwen API 返回空响应')
      }

      logAI(`Qwen响应: ${result.substring(0, 200)}...`, sessionId)
      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`Qwen API调用失败: ${errorMsg}`, error instanceof Error ? error : new Error(errorMsg), sessionId)
      throw error
    }
  }

  async analyzeTestStep(stepTitle: string, context: string, sessionId?: string): Promise<string> {
    const request: QwenRequest = {
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的自动化测试AI助手。请分析给定的测试步骤，提供详细的操作指导和预期结果。'
        },
        {
          role: 'user',
          content: `测试步骤: ${stepTitle}\n\n上下文信息: ${context}\n\n请分析这个测试步骤应该如何执行，包括具体的操作指令和验证方法。`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }

    return this.chatCompletion(request, sessionId)
  }

  async generateTestCase(requirement: string, pageInfo: string, sessionId?: string): Promise<string> {
    const request: QwenRequest = {
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的自动化测试用例生成专家。请根据需求生成详细的测试用例。'
        },
        {
          role: 'user',
          content: `测试需求: ${requirement}\n\n页面信息: ${pageInfo}\n\n请生成详细的测试用例，包括测试步骤、预期结果和验证方法。`
        }
      ],
      temperature: 0.4,
      max_tokens: 1500
    }

    return this.chatCompletion(request, sessionId)
  }

  async analyzeLoginStatus(pageContent: string, sessionId?: string): Promise<{ success: boolean; data: any }> {
    const request: QwenRequest = {
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的自动化测试AI助手。请分析给定的页面HTML内容，判断是否登录成功，并提取所有菜单和导航元素。'
        },
        {
          role: 'user',
          content: `请分析以下页面内容，判断登录状态，并列出所有可见的菜单项和导航元素：\n\n${pageContent.substring(0, 2000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }

    try {
      const response = await this.chatCompletion(request, sessionId)
      logAI(`登录状态分析完成: ${response.substring(0, 150)}...`, sessionId)
      
      return {
        success: true,
        data: {
          analysis: response
        }
      }
    } catch (error) {
      logError(`登录状态分析失败`, error instanceof Error ? error : new Error(String(error)), sessionId)
      throw error
    }
  }

  async analyzePageFunctionality(pageContent: string, requirement: string, sessionId?: string): Promise<string> {
    const request: QwenRequest = {
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的自动化测试AI助手。请分析页面功能，生成详细的测试计划。'
        },
        {
          role: 'user',
          content: `测试需求: ${requirement}\n\n页面内容:\n${pageContent.substring(0, 3000)}\n\n请分析这个页面的功能，并生成详细的测试计划。`
        }
      ],
      temperature: 0.4,
      max_tokens: 1500
    }

    return this.chatCompletion(request, sessionId)
  }
}

// 单例实例
export const qwenClient = new QwenClient()