/**
 * 统一AI客户端 - 支持多模型切换
 * @author Jiane
 * 
 * 支持的AI厂商:
 * - qwen: 通义千问 (阿里云)
 * - doubao: 豆包 (火山引擎)
 * 
 * 使用方法:
 * 1. 在 .env.local 中设置 AI_PROVIDER=qwen 或 AI_PROVIDER=doubao
 * 2. 配置对应厂商的 API_KEY 和其他参数
 * 3. 使用 aiClient 单例调用 AI 服务
 */
import { logAI, logError } from '@/lib/logger'

// ==================== 类型定义 ====================

export type AIProvider = 'qwen' | 'doubao'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIRequest {
  messages: AIMessage[]
  temperature?: number
  max_tokens?: number
  model?: string  // 可选，覆盖默认模型
}

export interface AIResponse {
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface ProviderConfig {
  apiKey: string
  apiUrl: string
  model: string
  vlModel: string  // 视觉语言模型
  name: string
}

// ==================== 模型配置 ====================

/**
 * 模型用途枚举
 */
export enum ModelPurpose {
  CHAT = 'chat',           // 通用对话
  ANALYSIS = 'analysis',   // 页面分析
  TEST_GEN = 'testGen',    // 测试用例生成
  REPORT = 'report',       // 报告生成
  VL = 'vl'                // 视觉语言（图片分析）
}

/**
 * 获取指定用途的模型名称
 * 可以在这里为不同用途配置不同的模型
 */
function getModelForPurpose(provider: AIProvider, purpose: ModelPurpose): string {
  const modelMap: Record<AIProvider, Record<ModelPurpose, string>> = {
    qwen: {
      [ModelPurpose.CHAT]: process.env.QWEN_MODEL || '',
      [ModelPurpose.ANALYSIS]: process.env.QWEN_MODEL || '',
      [ModelPurpose.TEST_GEN]: process.env.QWEN_MODEL || '',
      [ModelPurpose.REPORT]: process.env.QWEN_MODEL || '',
      [ModelPurpose.VL]: process.env.QWEN_MODEL || ''
    },
    doubao: {
      [ModelPurpose.CHAT]: process.env.DOUBAO_MODEL || '',
      [ModelPurpose.ANALYSIS]: process.env.DOUBAO_MODEL || '',
      [ModelPurpose.TEST_GEN]: process.env.DOUBAO_MODEL || '',
      [ModelPurpose.REPORT]: process.env.DOUBAO_MODEL || '',
      [ModelPurpose.VL]: process.env.DOUBAO_MODEL || ''
    }
  }
  
  return modelMap[provider][purpose]
}

// ==================== AI客户端类 ====================

export class AIClient {
  private provider: AIProvider
  private config: ProviderConfig

  constructor() {
    this.provider = (process.env.AI_PROVIDER as AIProvider) || 'qwen'
    this.config = this.getProviderConfig()
    
    if (!this.config.apiKey || this.config.apiKey.includes('your-')) {
      throw new Error(`${this.config.name} API Key 未配置，请在 .env.local 中设置`)
    }
    
    logAI(`AI客户端已初始化 [${this.provider}] 默认模型: ${this.config.model}`, this.config.model)
  }

  /**
   * 获取当前厂商配置
   */
  private getProviderConfig(): ProviderConfig {
    if (this.provider === 'doubao') {
      return {
        apiKey: process.env.DOUBAO_API_KEY || '',
        apiUrl: process.env.DOUBAO_API_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        model: process.env.DOUBAO_MODEL || '',
        vlModel: process.env.DOUBAO_VL_MODEL || 'doubao-seed-1-6-thinking-250715',
        name: '火山引擎(豆包)'
      }
    }
    // 默认 qwen
    return {
      apiKey: process.env.QWEN_API_KEY || '',
      apiUrl: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: process.env.QWEN_MODEL || '',
      vlModel: process.env.QWEN_VL_MODEL || 'qwen3-vl-plus',
      name: '通义千问'
    }
  }

  // ==================== 基础方法 ====================

  getProvider(): AIProvider {
    return this.provider
  }

  getProviderName(): string {
    return this.config.name
  }

  getModelName(purpose?: ModelPurpose): string {
    if (purpose) {
      return getModelForPurpose(this.provider, purpose)
    }
    return this.config.model
  }

  getVLModelName(): string {
    return this.config.vlModel
  }

  // ==================== 核心API调用 ====================

  /**
   * 通用聊天补全接口
   */
  async chatCompletion(request: AIRequest, sessionId?: string): Promise<string> {
    const startTime = Date.now()
    const modelName = request.model || this.config.model
    
    try {
      const userMessage = request.messages[request.messages.length - 1]?.content || ''
      logAI(`[${this.provider}] 输入: ${userMessage.substring(0, 100)}...`, modelName, sessionId)

      const response = await fetch(`${this.config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: request.messages,
          temperature: request.temperature ?? 0.3,
          max_tokens: request.max_tokens ?? 2000,
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${this.config.name} API错误: ${response.status} - ${errorText}`)
      }

      const data: AIResponse = await response.json()
      const result = data.choices?.[0]?.message?.content

      if (!result) {
        throw new Error(`${this.config.name} 返回空响应`)
      }

      const duration = Date.now() - startTime
      const tokens = data.usage?.total_tokens || 0
      logAI(`[${this.provider}] 响应(${duration}ms, ${tokens}tokens): ${result.substring(0, 150)}...`, modelName, sessionId)
      
      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`${this.config.name} API调用失败: ${errorMsg}`, error instanceof Error ? error : new Error(errorMsg), 'aiClient-chatCompletion', sessionId)
      throw error
    }
  }

  // ==================== 便捷方法 ====================

  /**
   * 分析测试步骤
   */
  async analyzeTestStep(stepTitle: string, context: string, sessionId?: string): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.ANALYSIS)
    return this.chatCompletion({
      model,
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
    }, sessionId)
  }

  /**
   * 生成测试用例
   */
  async generateTestCase(requirement: string, pageInfo: string, sessionId?: string): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.TEST_GEN)
    return this.chatCompletion({
      model,
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
    }, sessionId)
  }

  /**
   * 分析登录状态
   */
  async analyzeLoginStatus(pageContent: string, sessionId?: string): Promise<{ success: boolean; data: any }> {
    const model = getModelForPurpose(this.provider, ModelPurpose.ANALYSIS)
    try {
      const response = await this.chatCompletion({
        model,
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
      }, sessionId)

      return { success: true, data: { analysis: response } }
    } catch (error) {
      logError(`登录状态分析失败`, error instanceof Error ? error : new Error(String(error)), 'aiClient-analyzeLoginStatus', sessionId)
      throw error
    }
  }

  /**
   * 分析页面功能
   */
  async analyzePageFunctionality(pageContent: string, requirement: string, sessionId?: string): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.ANALYSIS)
    return this.chatCompletion({
      model,
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
    }, sessionId)
  }

  /**
   * 生成测试报告
   */
  async generateTestReport(testResults: string, sessionId?: string): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.REPORT)
    return this.chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的测试报告生成专家。请生成详细的测试报告。'
        },
        {
          role: 'user',
          content: `请生成一份测试报告，总结本次测试的执行情况、发现的问题和建议。\n\n测试结果:\n${testResults}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }, sessionId)
  }

  /**
   * 分析页面结构（用于登录页面分析）
   */
  async analyzePageStructure(pageHtml: string, analysisPrompt: string, sessionId?: string): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.ANALYSIS)
    return this.chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的自动化测试AI助手。请精确分析页面结构并提供选择器。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    }, sessionId)
  }

  /**
   * 分析菜单结构
   */
  async analyzeMenuStructure(pageHtml: string, menuPath: string, sessionId?: string): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.ANALYSIS)
    const menuParts = menuPath.split('-').map(p => p.trim())
    
    const menuAnalysisPrompt = `
请分析以下页面的菜单结构，找到导航到"${menuPath}"的方法。

菜单路径：${menuParts.join(' -> ')}

请返回JSON格式的操作步骤：
{
  "found": true/false,
  "steps": [
    {
      "action": "click",
      "selector": "菜单项的CSS选择器",
      "description": "点击xxx菜单"
    }
  ],
  "notes": "备注信息"
}

常见的菜单选择器模式：
- layui框架: .layui-nav-item, .layui-nav-child, [lay-href]
- 普通菜单: .menu-item, .nav-item, .sidebar-item
- 文本匹配: text="菜单名称"

请根据页面实际结构返回正确的选择器。
`

    return this.chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的Web页面分析专家，擅长分析页面菜单结构并提供准确的CSS选择器。'
        },
        {
          role: 'user',
          content: `${menuAnalysisPrompt}\n\n页面HTML片段（菜单相关部分）：\n${pageHtml.substring(0, 15000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }, sessionId)
  }

  /**
   * 验证操作结果
   */
  async verifyOperation(beforeHtml: string, afterHtml: string, operationType: string, sessionId?: string): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.ANALYSIS)
    
    const verifyPrompt = `
请比较以下两个页面HTML，判断操作"${operationType}"是否成功执行：

操作前页面长度: ${beforeHtml.length}
操作后页面长度: ${afterHtml.length}

操作前页面摘要: ${beforeHtml.substring(0, 500)}...

操作后页面摘要: ${afterHtml.substring(0, 500)}...

请判断操作是否成功，并用JSON格式返回：
{
  "verified": true/false,
  "reason": "..."
}
`

    return this.chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的自动化测试验证专家。请判断操作是否成功。'
        },
        {
          role: 'user',
          content: verifyPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    }, sessionId)
  }

  /**
   * 分析页面功能并生成测试步骤（高级方法）
   */
  async analyzePageForTesting(
    elements: any,
    requirement: string,
    apiInfo?: string,
    errorInfo?: string,
    sessionId?: string
  ): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.TEST_GEN)
    
    const analysisPrompt = `
你是业务功能测试专家。请根据【实际获取到的页面信息】生成正向业务测试步骤。

## 测试需求
${requirement}

## 页面信息
- 页面标题: ${elements?.pageTitle || '未知'}
- 页面URL: ${elements?.pageUrl || '未知'}

## 实际获取到的页面元素

### 输入框 (共${elements?.inputs?.length || 0}个)
${JSON.stringify(elements?.inputs || [], null, 2)}

### 下拉框 (共${elements?.selects?.length || 0}个)
${JSON.stringify(elements?.selects || [], null, 2)}

### 按钮 (共${elements?.buttons?.length || 0}个)
${JSON.stringify(elements?.buttons || [], null, 2)}

### 表格 (共${elements?.tables?.length || 0}个)
${JSON.stringify(elements?.tables || [], null, 2)}
${apiInfo || ''}
${errorInfo || ''}

## 严格规则
1. 【禁止猜测】只能使用上面列出的元素，不能凭空创造不存在的元素
2. 【禁止猜测】selector必须使用元素中提供的selector，不能自己编造
3. 只生成正向业务流程测试，模拟用户正常操作
4. 有多少可操作元素就生成多少步骤，不要人为限制数量
5. 如果有API响应数据，可以参考数据结构来生成合理的测试数据
6. 不生成异常测试、边界测试、性能测试等

## 输出格式 (严格JSON)
{
  "testSteps": [
    {
      "action": "fill",
      "selector": "元素中提供的selector",
      "value": "合理的测试数据",
      "description": "操作描述"
    }
  ],
  "analysis": "基于实际元素和API的页面功能分析"
}

action类型: fill(填写输入框)、click(点击按钮)、select(选择下拉框)、verify(验证结果)
`

    return this.chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: '你是业务功能测试专家。严格规则：1.只能使用提供的元素，禁止猜测 2.selector必须来自元素数据 3.可参考API响应生成测试数据 4.只生成正向业务测试。输出有效JSON。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2500
    }, sessionId)
  }
}

// ==================== 单例导出 ====================

// 延迟初始化，避免在模块加载时就抛出错误
let _aiClient: AIClient | null = null

export function getAIClient(): AIClient {
  if (!_aiClient) {
    _aiClient = new AIClient()
  }
  return _aiClient
}

// 为了兼容现有代码，也导出一个默认实例（但使用getter延迟初始化）
export const aiClient = new Proxy({} as AIClient, {
  get(target, prop) {
    return (getAIClient() as any)[prop]
  }
})
