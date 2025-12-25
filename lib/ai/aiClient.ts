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

  async analyzeLoginStatusByContext(
    context: {
      url?: string
      title?: string
      elements?: any
      summary?: any
      statusHint?: any
    },
    sessionId?: string
  ): Promise<{ success: boolean; data: any }> {
    const model = getModelForPurpose(this.provider, ModelPurpose.ANALYSIS)
    try {
      const elements = context?.elements || {}
      const safeElements = {
        pageTitle: elements?.pageTitle || context?.title || '',
        pageUrl: elements?.pageUrl || context?.url || '',
        inputs: Array.isArray(elements?.inputs) ? elements.inputs.slice(0, 20) : [],
        selects: Array.isArray(elements?.selects) ? elements.selects.slice(0, 10) : [],
        buttons: Array.isArray(elements?.buttons) ? elements.buttons.slice(0, 30) : [],
        links: Array.isArray(elements?.links) ? elements.links.slice(0, 80) : [],
        forms: Array.isArray(elements?.forms) ? elements.forms.slice(0, 10) : [],
        tables: Array.isArray(elements?.tables) ? elements.tables.slice(0, 5) : []
      }

      const safeContext = {
        url: context?.url || safeElements.pageUrl,
        title: context?.title || safeElements.pageTitle,
        summary: context?.summary || {},
        statusHint: context?.statusHint || {},
        elements: safeElements
      }

      const response = await this.chatCompletion({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的自动化测试AI助手。请基于MCP提供的结构化元素JSON判断是否登录成功，并提取所有可见的菜单和导航元素。严禁基于猜测输出不存在的selector。'
          },
          {
            role: 'user',
            content: `请基于以下结构化上下文判断登录状态并输出严格JSON：\n\n${JSON.stringify(safeContext)}\n\n输出格式(严格JSON):\n{\n  "isLoggedIn": true/false,\n  "confidence": 0-100,\n  "evidence": ["..."],\n  "menuItems": [{"text":"","selector":"","href":""}],\n  "analysis": ""\n}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      }, sessionId)

      return { success: true, data: { analysis: response } }
    } catch (error) {
      logError(`登录状态分析失败`, error instanceof Error ? error : new Error(String(error)), 'aiClient-analyzeLoginStatusByContext', sessionId)
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
    areas?: any[],
    depth: number = 0,
    sessionId?: string
  ): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.TEST_GEN)

    const safeAreas = Array.isArray(areas) ? areas : []
    const areaInfo = safeAreas.length > 0
      ? `
## 可操作区域 (第${depth + 1}轮探索，共${safeAreas.length}个候选区域)
${safeAreas.map((area: any, index: number) => {
  const desc = area?.description || area?.selector || ''
  const areaElements = area?.elements || {}
  const inputs = Array.isArray(areaElements.inputs) ? areaElements.inputs : []
  const selects = Array.isArray(areaElements.selects) ? areaElements.selects : []
  const buttons = Array.isArray(areaElements.buttons) ? areaElements.buttons : []
  const tables = Array.isArray(areaElements.tables) ? areaElements.tables : []
  return `
【区域${index + 1}】${desc}
- 区域容器Selector: ${area?.selector || '未知'}
- 输入框: ${inputs.slice(0, 15).map((i: any) => i.selector).join(', ') || '无'}
- 下拉框: ${selects.slice(0, 10).map((s: any) => s.selector).join(', ') || '无'}
- 按钮: ${buttons.slice(0, 20).map((b: any) => `${b.selector}${b.text ? `("${String(b.text).substring(0, 10)}")` : ''}`).join(', ') || '无'}
- 表格: ${(tables || []).slice(0, 5).map((t: any) => t.selector).join(', ') || '无'}
`
}).join('\n')}
`
      : ''
    
    const analysisPrompt = `
你是页面功能测试专家。请根据【实际获取到的页面元素】生成合理的用户操作测试步骤。

## 测试需求
${requirement}

## 页面信息
- 页面标题: ${elements?.pageTitle || '未知'}
- 页面URL: ${elements?.pageUrl || '未知'}

## 实际获取到的页面元素详情

### 输入框 (共${elements?.inputs?.length || 0}个)
${elements?.inputs?.map((input: any, index: number) => 
`${index + 1}. Selector: ${input.selector}
   - 类型: ${input.type || 'text'}
   - Name: ${input.name || '无'}
   - Placeholder: ${input.placeholder || '无'}
   - Class: ${input.className || '无'}
   - 可见: ${input.visible !== false ? '是' : '否'}
   - Keywords: ${input.keywords ? input.keywords.join(', ') : '无'}
`).join('\n') || '无'}

### 按钮 (共${elements?.buttons?.length || 0}个)
${elements?.buttons?.map((button: any, index: number) => 
`${index + 1}. Selector: ${button.selector}
   - 文本内容: "${button.text || '无'}"
   - 类型: ${button.type || 'button'}
   - ID: ${button.id || '无'}
   - Class: ${button.className || '无'}
   - 可见: ${button.visible !== false ? '是' : '否'}
   - Keywords: ${button.keywords ? button.keywords.join(', ') : '无'}
`).join('\n') || '无'}

### 下拉框 (共${elements?.selects?.length || 0}个)
${elements?.selects?.map((select: any, index: number) => 
`${index + 1}. Selector: ${select.selector}
   - 文本内容: "${select.text || '无'}"
   - 类型: ${select.type || 'select'}
   - 选项: ${JSON.stringify(select.options || [])}
   - Keywords: ${select.keywords ? select.keywords.join(', ') : '无'}
`).join('\n') || '无'}

### 表格 (共${elements?.tables?.length || 0}个)
${elements?.tables?.map((table: any, index: number) => 
`${index + 1}. Selector: ${table.selector}
   - 行数: ${table.rowCount || '未知'}
   - 列数: ${table.columnCount || '未知'}
`).join('\n') || '无'}
${areaInfo}
${apiInfo || ''}
${errorInfo || ''}

## 测试步骤生成规则
1. 【页面交互优先】优先测试用户界面交互功能，而非API接口验证
2. 【基于元素属性】利用Keywords字段来判断元素功能，而不是猜测
3. 【区域优先】如果存在“可操作区域”，优先从区域内元素选择selector（因为更聚焦、更可靠）
3. 【实际操作步骤】生成用户真实能执行的操作步骤：
   - 输入框：填写有意义的测试数据（根据placeholder判断用途）
   - 按钮：点击有功能的按钮（根据keywords判断功能）
   - 下拉框：选择合理的选项值
4. 【避免API依赖】不要生成API验证步骤，除非有明确的API状态元素需要验证
5. 【合理顺序】按照用户实际操作流程的合理顺序排列步骤
6. 【只使用真实元素】必须使用上面列出的真实selector
7. 【绝对禁止猜测】不要输出任何未出现在“实际获取到的页面元素详情/可操作区域”的selector

## 操作类型说明
- fill: 填写输入框
- click: 点击按钮/链接
- select: 选择下拉框选项
- wait: 等待页面响应
- verify: 验证元素状态（仅在必要时使用）

## 输出格式 (严格JSON)
{
  "testSteps": [
    {
      "action": "fill/click/select/wait/verify",
      "selector": "必须从上面元素列表中选择真实存在的selector", 
      "value": "基于输入框用途的合理测试数据",
      "description": "基于元素Keywords的用户操作描述"
    }
  ],
  "analysis": "基于页面元素的用户界面功能分析和测试计划"
}

注意：每个步骤必须基于实际存在的元素，生成用户真实可执行的操作。
`

    return this.chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: '你是页面功能测试专家。基于实际页面元素生成用户交互测试步骤，优先测试界面功能而非API验证。利用元素的Keywords属性智能判断功能。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    }, sessionId)
  }

  /**
   * 使用视觉模型分析页面截图
   * 结合截图和元素信息，让AI更准确地理解页面
   * @author Jiane
   */
  async analyzePageWithVision(
    screenshotBase64: string,
    mimeType: string,
    elements: any,
    requirement: string,
    sessionId?: string
  ): Promise<string> {
    const vlModel = this.config.vlModel
    const startTime = Date.now()

    try {
      logAI(`[视觉分析] 使用 ${vlModel} 分析页面截图...`, vlModel, sessionId)

      // 构建元素摘要信息
      const elementsSummary = {
        pageTitle: elements?.pageTitle || '未知',
        pageUrl: elements?.pageUrl || '未知',
        inputCount: elements?.inputs?.length || 0,
        buttonCount: elements?.buttons?.length || 0,
        selectCount: elements?.selects?.length || 0,
        tableCount: elements?.tables?.length || 0,
        inputs: (elements?.inputs || []).slice(0, 15).map((i: any) => ({
          selector: i.selector,
          type: i.type,
          placeholder: i.placeholder,
          name: i.name
        })),
        buttons: (elements?.buttons || []).slice(0, 20).map((b: any) => ({
          selector: b.selector,
          text: b.text?.substring(0, 20),
          keywords: b.keywords
        })),
        selects: (elements?.selects || []).slice(0, 10).map((s: any) => ({
          selector: s.selector,
          options: s.options?.slice(0, 5)
        }))
      }

      const analysisPrompt = `你是一个专业的Web页面分析专家。请结合页面截图和MCP获取的元素信息，分析这个页面的功能和布局。

## 测试需求
${requirement}

## MCP获取的页面元素信息
${JSON.stringify(elementsSummary, null, 2)}

## 分析任务
1. 观察截图，描述页面的整体布局和主要功能区域
2. 结合元素信息，识别页面上的关键交互元素（输入框、按钮、表格等）
3. 根据测试需求，规划测试步骤

## 输出格式（严格JSON）
{
  "pageDescription": "页面整体描述",
  "functionalAreas": [
    {
      "name": "区域名称",
      "description": "区域功能描述",
      "elements": ["相关元素selector"]
    }
  ],
  "testSteps": [
    {
      "action": "fill/click/select/wait/verify",
      "selector": "必须使用MCP返回的真实selector",
      "value": "操作值（如需要）",
      "description": "步骤描述"
    }
  ],
  "analysis": "综合分析结论"
}

注意：
1. selector必须从MCP元素信息中选择，不能自己编造
2. 测试步骤要符合用户实际操作流程
3. 结合截图观察到的视觉信息和MCP获取的元素信息进行综合判断`

      // 构建视觉模型请求（OpenAI兼容格式）
      const response = await fetch(`${this.config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: vlModel,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${screenshotBase64}`
                  }
                },
                {
                  type: 'text',
                  text: analysisPrompt
                }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 2500
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`视觉模型API错误: ${response.status} - ${errorText}`)
      }

      const data: AIResponse = await response.json()
      const result = data.choices?.[0]?.message?.content

      if (!result) {
        throw new Error('视觉模型返回空响应')
      }

      const duration = Date.now() - startTime
      const tokens = data.usage?.total_tokens || 0
      logAI(`[视觉分析] 完成(${duration}ms, ${tokens}tokens): ${result.substring(0, 150)}...`, vlModel, sessionId)

      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`视觉模型分析失败: ${errorMsg}`, error instanceof Error ? error : new Error(errorMsg), 'aiClient-analyzePageWithVision', sessionId)
      throw error
    }
  }

  /**
   * 使用视觉模型分析登录页面
   * @author Jiane
   */
  async analyzeLoginPageWithVision(
    screenshotBase64: string,
    mimeType: string,
    elements: any,
    sessionId?: string
  ): Promise<string> {
    const vlModel = this.config.vlModel

    try {
      logAI(`[视觉分析] 分析登录页面...`, vlModel, sessionId)

      const elementsSummary = {
        inputs: (elements?.inputs || []).map((i: any) => ({
          selector: i.selector,
          type: i.type,
          placeholder: i.placeholder,
          name: i.name,
          id: i.id
        })),
        buttons: (elements?.buttons || []).map((b: any) => ({
          selector: b.selector,
          text: b.text,
          id: b.id
        }))
      }

      const analysisPrompt = `你是一个专业的Web自动化测试专家。请分析这个登录页面的截图，结合MCP获取的元素信息，识别登录表单的各个字段。

## MCP获取的页面元素
${JSON.stringify(elementsSummary, null, 2)}

## 分析任务
1. 观察截图，识别用户名/账号输入框
2. 识别密码输入框
3. 识别登录按钮
4. 识别是否有验证码、记住密码等其他元素

## 输出格式（严格JSON）
{
  "usernameSelector": "用户名输入框的selector（从MCP元素中选择）",
  "passwordSelector": "密码输入框的selector（从MCP元素中选择）",
  "loginButtonSelector": "登录按钮的selector（从MCP元素中选择）",
  "hasCaptcha": true/false,
  "hasRememberMe": true/false,
  "otherElements": ["其他重要元素"],
  "notes": "备注信息"
}

注意：所有selector必须从MCP元素信息中选择，不能自己编造！`

      const response = await fetch(`${this.config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: vlModel,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${screenshotBase64}`
                  }
                },
                {
                  type: 'text',
                  text: analysisPrompt
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`视觉模型API错误: ${response.status} - ${errorText}`)
      }

      const data: AIResponse = await response.json()
      const result = data.choices?.[0]?.message?.content

      if (!result) {
        throw new Error('视觉模型返回空响应')
      }

      logAI(`[视觉分析] 登录页面分析完成: ${result.substring(0, 150)}...`, vlModel, sessionId)
      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`登录页面视觉分析失败: ${errorMsg}`, error instanceof Error ? error : new Error(errorMsg), 'aiClient-analyzeLoginPageWithVision', sessionId)
      throw error
    }
  }

  /**
   * 生成补救步骤 - 当测试步骤失败时调用
   * @author Jiane
   */
  async generateRecoverySteps(
    pageHtml: string,
    failedStepDescription: string,
    errorMessage: string,
    sessionId?: string
  ): Promise<string> {
    const model = getModelForPurpose(this.provider, ModelPurpose.ANALYSIS)
    
    const recoveryPrompt = `
你是自动化测试故障排查专家。一个测试步骤执行失败了，请分析原因并生成补救步骤。

## 失败的测试步骤
${failedStepDescription}

## 错误信息
${errorMessage}

## 当前页面状态
${pageHtml.substring(0, 5000)}

## 任务
1. 分析失败的原因（可能是选择器错误、元素不可见、页面状态改变等）
2. 根据当前页面状态，生成替代的操作步骤
3. 提供多个备选方案

## 输出格式 (JSON)
{
  "analysis": "失败原因分析",
  "steps": [
    {
      "action": "fill|click|select|wait|verify",
      "selector": "CSS选择器或文本匹配",
      "value": "操作值（如果需要）",
      "description": "步骤描述"
    }
  ],
  "notes": "其他建议"
}
`

    return this.chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: '你是自动化测试故障排查专家。分析失败原因，生成补救步骤。输出有效JSON。'
        },
        {
          role: 'user',
          content: recoveryPrompt
        }
      ],
      temperature: 0.4,
      max_tokens: 1500
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
