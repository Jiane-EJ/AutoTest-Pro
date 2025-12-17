import { logAI, logMCP, logError } from '@/lib/logger'
import { qwenClient } from '@/lib/ai/qwenClient'
import { mcpManager } from '@/lib/mcp/mcpManager'

export interface PageElement {
  type: string
  selector: string
  id?: string
  name?: string
  placeholder?: string
  text?: string
  ariaLabel?: string
  label?: string
  disabled?: boolean
  required?: boolean
}

export interface PageElements {
  inputs: PageElement[]
  selects: PageElement[]
  buttons: PageElement[]
  tables: any[]
  forms: any[]
  links: PageElement[]
  pageTitle: string
  pageUrl: string
}

export interface PageAnalysisResult {
  success: boolean
  inputs: PageElement[]
  buttons: PageElement[]
  forms: PageElement[]
  analysis: string
  error?: string
}

/**
 * 页面分析器 - 通过MCP获取真实DOM元素，AI分析生成测试步骤
 * @author Jiane
 * 
 * 改进流程：
 * 1. MCP直接在浏览器中获取完整的页面元素（不用正则）
 * 2. 多轮迭代：获取元素 → AI分析 → 如果需要更多信息再获取
 * 3. AI只基于实际获取到的元素生成测试，不猜测
 */
export class PageAnalyzer {
  /**
   * 通过MCP获取页面所有可交互元素
   * @author Jiane
   */
  async getPageElements(sessionId?: string): Promise<PageElements | null> {
    try {
      logMCP('通过MCP获取页面可交互元素...', 'playwright', sessionId)
      
      const result = await mcpManager.getPageInteractiveElements(sessionId)
      
      if (!result.success || !result.data) {
        logError('MCP获取页面元素失败', new Error(result.error || '未知错误'), 'pageAnalyzer-getPageElements', sessionId)
        return null
      }

      const elements = result.data as PageElements
      logMCP(`MCP获取元素完成: ${elements.inputs.length}输入框, ${elements.selects.length}下拉框, ${elements.buttons.length}按钮`, 'playwright', sessionId)
      
      return elements
    } catch (error) {
      logError('获取页面元素异常', error as Error, 'pageAnalyzer-getPageElements', sessionId)
      return null
    }
  }

  /**
   * 从HTML中提取所有交互元素（备用方法，当MCP不可用时使用）
   * @deprecated 优先使用 getPageElements 方法
   */
  extractElements(html: string): {
    inputs: PageElement[]
    buttons: PageElement[]
    forms: PageElement[]
  } {
    // 保留原有的正则提取逻辑作为备用
    const inputs: PageElement[] = []
    const buttons: PageElement[] = []
    const forms: PageElement[] = []

    try {
      // 提取input元素
      const inputRegex = /<input[^>]*>/gi
      const inputMatches = html.match(inputRegex) || []
      
      inputMatches.forEach((match) => {
        const typeMatch = match.match(/type=["']([^"']+)["']/i)
        const idMatch = match.match(/id=["']([^"']+)["']/i)
        const nameMatch = match.match(/name=["']([^"']+)["']/i)
        const placeholderMatch = match.match(/placeholder=["']([^"']+)["']/i)

        const id = idMatch?.[1] || ''
        const name = nameMatch?.[1] || ''
        const type = typeMatch?.[1] || 'text'

        if (type === 'hidden') return

        let selector = ''
        if (id) selector = `#${id}`
        else if (name) selector = `input[name="${name}"]`
        else selector = `input[type="${type}"]`

        inputs.push({ type, selector, id, name, placeholder: placeholderMatch?.[1] || '' })
      })

      // 提取button元素
      const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi
      let match
      while ((match = buttonRegex.exec(html)) !== null) {
        const fullMatch = match[0]
        const idMatch = fullMatch.match(/id=["']([^"']+)["']/i)
        const text = match[1]?.replace(/<[^>]*>/g, '').trim() || ''
        
        const id = idMatch?.[1] || ''
        let selector = id ? `#${id}` : text ? `button:has-text("${text}")` : 'button'

        buttons.push({ type: 'button', selector, id, text })
      }
    } catch (error) {
      logError('页面元素提取失败', error as Error, 'pageAnalyzer-extractElements')
    }

    return { inputs, buttons, forms }
  }

  /**
   * 分析页面并生成操作指导
   */
  async analyzePageForLogin(
    pageHtml: string,
    sessionId?: string
  ): Promise<PageAnalysisResult> {
    try {
      logAI('开始分析登录页面结构...', 'qwen-vl-max', sessionId)

      // 第一步：提取页面元素
      const elements = this.extractElements(pageHtml)

      // 第二步：调用AI分析
      const analysisPrompt = `
请分析以下登录页面的结构，并提供操作指导：

页面输入框：
${JSON.stringify(elements.inputs, null, 2)}

页面按钮：
${JSON.stringify(elements.buttons, null, 2)}

请回答以下问题：
1. 哪个输入框是用户名/账号？提供其选择器
2. 哪个输入框是密码？提供其选择器
3. 哪个按钮是登录按钮？提供其选择器
4. 是否有其他需要注意的表单元素？

请用JSON格式返回结果，包含：
{
  "usernameSelector": "...",
  "passwordSelector": "...",
  "loginButtonSelector": "...",
  "notes": "..."
}
`

      const aiAnalysis = await qwenClient.chatCompletion(
        {
          model: 'qwen-vl-max',
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
        },
        sessionId
      )

      logAI(`页面分析完成: ${aiAnalysis.substring(0, 200)}...`, 'qwen-vl-max', sessionId)

      return {
        success: true,
        inputs: elements.inputs,
        buttons: elements.buttons,
        forms: elements.forms,
        analysis: aiAnalysis
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('页面分析失败', error as Error, 'pageAnalyzer-analyzePageForLogin', sessionId)
      return {
        success: false,
        inputs: [],
        buttons: [],
        forms: [],
        analysis: '',
        error: errorMsg
      }
    }
  }

  /**
   * 分析页面功能并生成测试步骤
   * 改进：通过MCP获取真实DOM元素，AI只基于实际元素生成测试
   * @author Jiane
   */
  async analyzePageFunctionality(
    pageHtml: string,
    requirement: string,
    sessionId?: string
  ): Promise<{
    success: boolean
    testSteps: any[]
    analysis: string
    elements?: PageElements
    error?: string
  }> {
    try {
      logAI('开始分析页面功能...', 'qwen-vl-max', sessionId)

      // 第一步：通过MCP获取页面真实元素
      logMCP('[步骤1] 通过MCP获取页面可交互元素...', 'playwright', sessionId)
      const elements = await this.getPageElements(sessionId)
      
      if (!elements) {
        // 备用方案：使用正则提取
        logAI('MCP获取失败，使用备用方案提取元素...', 'qwen-vl-max', sessionId)
        const fallbackElements = this.extractElements(pageHtml)
        return this.generateTestStepsFromElements(fallbackElements, requirement, sessionId)
      }

      logAI(`获取到元素: ${elements.inputs.length}输入框, ${elements.selects.length}下拉框, ${elements.buttons.length}按钮`, 'qwen-vl-max', sessionId)

      // 第二步：AI分析并生成测试步骤
      logAI('[步骤2] AI分析页面元素，生成测试步骤...', 'qwen-vl-max', sessionId)
      
      const analysisPrompt = `
你是业务功能测试专家。请根据【实际获取到的页面元素】生成正向业务测试步骤。

## 测试需求
${requirement}

## 页面信息
- 页面标题: ${elements.pageTitle}
- 页面URL: ${elements.pageUrl}

## 实际获取到的页面元素

### 输入框 (共${elements.inputs.length}个)
${JSON.stringify(elements.inputs, null, 2)}

### 下拉框 (共${elements.selects.length}个)
${JSON.stringify(elements.selects, null, 2)}

### 按钮 (共${elements.buttons.length}个)
${JSON.stringify(elements.buttons, null, 2)}

### 表格 (共${elements.tables.length}个)
${JSON.stringify(elements.tables, null, 2)}

## 严格规则
1. 【禁止猜测】只能使用上面列出的元素，不能凭空创造不存在的元素
2. 【禁止猜测】selector必须使用元素中提供的selector，不能自己编造
3. 只生成正向业务流程测试，模拟用户正常操作
4. 有多少可操作元素就生成多少步骤，不要人为限制数量
5. 不生成异常测试、边界测试、性能测试等

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
  "analysis": "基于实际元素的页面功能分析"
}

action类型: fill(填写输入框)、click(点击按钮)、select(选择下拉框)、verify(验证结果)
`

      const aiAnalysis = await qwenClient.chatCompletion(
        {
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'system',
              content: '你是业务功能测试专家。严格规则：1.只能使用提供的元素，禁止猜测或创造不存在的元素 2.selector必须来自元素数据 3.只生成正向业务测试。输出有效JSON。'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.2,
          max_tokens: 2000
        },
        sessionId
      )

      logAI(`AI分析完成: ${aiAnalysis.substring(0, 300)}...`, 'qwen-vl-max', sessionId)

      // 解析AI返回的测试步骤
      let testSteps: any[] = []
      try {
        const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          testSteps = parsed.testSteps || []
        }
      } catch (e) {
        logAI('解析AI返回的JSON失败，返回原始分析结果', 'qwen-vl-max', sessionId)
      }

      return {
        success: true,
        testSteps,
        analysis: aiAnalysis,
        elements
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('功能分析失败', error as Error, 'pageAnalyzer-analyzePageFunctionality', sessionId)
      return {
        success: false,
        testSteps: [],
        analysis: '',
        error: errorMsg
      }
    }
  }

  /**
   * 从备用元素生成测试步骤（当MCP不可用时）
   * @author Jiane
   */
  private async generateTestStepsFromElements(
    elements: { inputs: PageElement[]; buttons: PageElement[]; forms: PageElement[] },
    requirement: string,
    sessionId?: string
  ): Promise<{
    success: boolean
    testSteps: any[]
    analysis: string
    error?: string
  }> {
    const analysisPrompt = `
你是业务功能测试专家。请根据【实际获取到的页面元素】生成正向业务测试步骤。

## 测试需求
${requirement}

## 实际获取到的元素
输入框: ${JSON.stringify(elements.inputs, null, 2)}
按钮: ${JSON.stringify(elements.buttons, null, 2)}

## 严格规则
1. 只能使用上面列出的元素，禁止猜测
2. selector必须使用元素中提供的selector
3. 只生成正向业务流程测试

## 输出格式
{
  "testSteps": [{"action": "fill/click", "selector": "...", "value": "...", "description": "..."}],
  "analysis": "页面功能分析"
}
`

    const aiAnalysis = await qwenClient.chatCompletion(
      {
        model: 'qwen-vl-max',
        messages: [
          { role: 'system', content: '业务测试专家，只使用提供的元素，禁止猜测。输出JSON。' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      },
      sessionId
    )

    let testSteps: any[] = []
    try {
      const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        testSteps = parsed.testSteps || []
      }
    } catch (e) {
      // ignore
    }

    return { success: true, testSteps, analysis: aiAnalysis }
  }

  /**
   * 验证操作是否成功
   */
  async verifyOperationSuccess(
    beforeHtml: string,
    afterHtml: string,
    operationType: string,
    sessionId?: string
  ): Promise<{
    success: boolean
    verified: boolean
    reason: string
  }> {
    try {
      logAI(`验证操作成功: ${operationType}`, 'qwen-vl-max', sessionId)

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

      const result = await qwenClient.chatCompletion(
        {
          model: 'qwen-vl-max',
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
        },
        sessionId
      )

      return {
        success: true,
        verified: result.includes('true'),
        reason: result
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('操作验证失败', error as Error, 'pageAnalyzer-verifyOperationSuccess', sessionId)
      return {
        success: false,
        verified: false,
        reason: errorMsg
      }
    }
  }
}

export const pageAnalyzer = new PageAnalyzer()
