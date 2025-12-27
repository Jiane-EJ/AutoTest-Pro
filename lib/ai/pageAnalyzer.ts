import { logAI, logMCP, logError } from '@/lib/logger'
import { getAIClient, ModelPurpose } from '@/lib/ai/aiClient'
import { mcpManager } from '@/lib/mcp/mcpManager'

/**
 * 获取当前AI模型名称（用于日志）
 * @author Jiane
 */
function getModelName(): string {
  try {
    return getAIClient().getModelName(ModelPurpose.ANALYSIS)
  } catch {
    return 'ai-model'
  }
}

/**
 * 获取视觉模型名称（用于日志）
 * @author Jiane
 */
function getVLModelName(): string {
  try {
    return getAIClient().getVLModelName()
  } catch {
    return 'vl-model'
  }
}

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
  areas?: PageArea[]
}

export interface PageArea {
  selector: string
  description?: string
  elements: {
    inputs: PageElement[]
    selects: PageElement[]
    buttons: PageElement[]
    tables: any[]
    forms: any[]
    links: PageElement[]
  }
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
 * 从AI响应中提取JSON对象（健壮版本）
 * @author Jiane
 */
function extractJSONFromText(text: string): any | null {
  if (!text || typeof text !== 'string') return null
  
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,  // markdown json code block
    /```\s*([\s\S]*?)\s*```/,       // markdown code block
    /\{[\s\S]*\}/                   // raw JSON
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const jsonStr = match[1] || match[0]
      try {
        return JSON.parse(jsonStr)
      } catch {
        // 尝试修复常见的JSON格式问题
        try {
          const fixed = jsonStr
            .replace(/,\s*}/g, '}')      // 移除尾随逗号
            .replace(/,\s*]/g, ']')      // 移除数组尾随逗号
            .replace(/'/g, '"')          // 单引号转双引号
          return JSON.parse(fixed)
        } catch {
          continue
        }
      }
    }
  }
  return null
}

/**
 * 验证测试步骤中的选择器是否有效
 * @author Jiane
 */
function validateTestStepSelectors(
  testSteps: any[],
  validSelectorSet: Set<string>,
  sessionId?: string
): any[] {
  if (!Array.isArray(testSteps)) return []
  
  const rawCount = testSteps.length
  const validSteps = testSteps.filter((step: any) => {
    const selector = step?.selector
    if (!selector || typeof selector !== 'string') return false
    const isValid = validSelectorSet.has(selector)
    if (!isValid) {
      logAI(`⚠️ 选择器无效，已过滤: ${selector}`, getModelName(), sessionId)
    }
    return isValid
  })
  
  logAI(`✅ 选择器验证通过 ${validSteps.length}/${rawCount} 个测试步骤`, getModelName(), sessionId)
  return validSteps
}

/**
 * 从页面元素构建有效选择器集合
 * @author Jiane
 */
function buildValidSelectorSet(elements: PageElements, areas?: PageArea[]): Set<string> {
  const validSelectorSet = new Set<string>()
  
  ;(elements.inputs || []).forEach(el => validSelectorSet.add(el.selector))
  ;(elements.selects || []).forEach(el => validSelectorSet.add(el.selector))
  ;(elements.buttons || []).forEach(el => validSelectorSet.add(el.selector))
  
  // 添加区域内的选择器
  ;(areas || []).forEach(area => {
    ;(area.elements?.inputs || []).forEach(el => validSelectorSet.add(el.selector))
    ;(area.elements?.selects || []).forEach(el => validSelectorSet.add(el.selector))
    ;(area.elements?.buttons || []).forEach(el => validSelectorSet.add(el.selector))
  })
  
  return validSelectorSet
}

/**
 * 页面分析器 - 通过MCP获取真实DOM元素，AI分析生成测试步骤
 * @author Jiane
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
   * 从HTML中提取所有交互元素（备用方法）
   * @deprecated 优先使用 getPageElements 方法
   */
  extractElements(html: string): {
    inputs: PageElement[]
    buttons: PageElement[]
    forms: PageElement[]
  } {
    const inputs: PageElement[] = []
    const buttons: PageElement[] = []
    const forms: PageElement[] = []

    try {
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
      logAI('开始分析登录页面结构...', getModelName(), sessionId)

      const elements = this.extractElements(pageHtml)

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

      const aiClient = getAIClient()
      const aiAnalysis = await aiClient.analyzePageStructure(pageHtml, analysisPrompt, sessionId)

      logAI(`页面分析完成: ${aiAnalysis.substring(0, 200)}...`, getModelName(), sessionId)

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
   * 使用视觉模型分析登录页面（截图+元素）
   * @author Jiane
   */
  async analyzeLoginPageWithVision(sessionId?: string): Promise<PageAnalysisResult> {
    try {
      logAI('开始使用视觉模型分析登录页面...', getVLModelName(), sessionId)

      // 1. 获取视觉上下文（截图+元素）
      logMCP('[视觉分析] 获取页面截图和元素...', 'playwright', sessionId)
      const visualContext = await mcpManager.getVisualPageContext(sessionId)
      
      if (!visualContext.success || !visualContext.data) {
        logAI('获取视觉上下文失败，回退到普通分析', getModelName(), sessionId)
        const pageHtmlResult = await mcpManager.callPlaywright('get_visible_html', {}, sessionId)
        return this.analyzePageForLogin(pageHtmlResult.data || '', sessionId)
      }

      const { screenshot, elements } = visualContext.data

      // 2. 调用视觉模型分析
      logAI(`[视觉分析] 截图大小: ${(screenshot.size / 1024).toFixed(2)}KB, 元素: ${elements.inputs?.length || 0}输入框, ${elements.buttons?.length || 0}按钮`, getVLModelName(), sessionId)
      
      const aiClient = getAIClient()
      const aiAnalysis = await aiClient.analyzeLoginPageWithVision(
        screenshot.base64,
        screenshot.mimeType,
        elements,
        sessionId
      )

      logAI(`[视觉分析] 登录页面分析完成: ${aiAnalysis.substring(0, 200)}...`, getVLModelName(), sessionId)

      return {
        success: true,
        inputs: elements.inputs || [],
        buttons: elements.buttons || [],
        forms: elements.forms || [],
        analysis: aiAnalysis
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('视觉分析登录页面失败', error as Error, 'pageAnalyzer-analyzeLoginPageWithVision', sessionId)
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
   * 使用视觉模型分析页面功能（截图+元素）
   * @author Jiane
   */
  async analyzePageFunctionalityWithVision(
    requirement: string,
    sessionId?: string,
    depth: number = 0
  ): Promise<{
    success: boolean
    testSteps: any[]
    analysis: string
    elements?: PageElements
    screenshot?: any
    error?: string
  }> {
    try {
      logAI('开始使用视觉模型分析页面功能...', getVLModelName(), sessionId)

      // 1. 获取视觉上下文（截图+元素）
      logMCP('[视觉分析] 获取页面截图和元素...', 'playwright', sessionId)
      const visualContext = await mcpManager.getVisualPageContext(sessionId)
      
      if (!visualContext.success || !visualContext.data) {
        logAI('获取视觉上下文失败，回退到普通分析', getModelName(), sessionId)
        return this.analyzePageFunctionality('', requirement, sessionId, depth)
      }

      const { screenshot, elements } = visualContext.data

      // 2. 调用视觉模型分析
      logAI(`[视觉分析] 截图大小: ${(screenshot.size / 1024).toFixed(2)}KB`, getVLModelName(), sessionId)
      logAI(`[视觉分析] 元素统计: ${elements.inputs?.length || 0}输入框, ${elements.buttons?.length || 0}按钮, ${elements.selects?.length || 0}下拉框, ${elements.tables?.length || 0}表格`, getVLModelName(), sessionId)
      
      const aiClient = getAIClient()
      const aiAnalysis = await aiClient.analyzePageWithVision(
        screenshot.base64,
        screenshot.mimeType,
        elements,
        requirement,
        sessionId
      )

      logAI(`[视觉分析] 页面功能分析完成: ${aiAnalysis.substring(0, 300)}...`, getVLModelName(), sessionId)

      // 3. 解析测试步骤（使用健壮的JSON提取）
      let testSteps: any[] = []
      const parsed = extractJSONFromText(aiAnalysis)
      if (parsed) {
        testSteps = parsed.testSteps || []
      } else {
        logAI('解析AI返回的JSON失败，返回原始分析结果', getVLModelName(), sessionId)
      }

      // 4. 严格验证选择器（使用工具函数）
      const validSelectorSet = buildValidSelectorSet(elements)
      testSteps = validateTestStepSelectors(testSteps, validSelectorSet, sessionId)

      return {
        success: true,
        testSteps,
        analysis: aiAnalysis,
        elements,
        screenshot
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('视觉分析页面功能失败', error as Error, 'pageAnalyzer-analyzePageFunctionalityWithVision', sessionId)
      return {
        success: false,
        testSteps: [],
        analysis: '',
        error: errorMsg
      }
    }
  }

  /**
   * 分析页面功能并生成测试步骤
   * @author Jiane
   */
  async analyzePageFunctionality(
    pageHtml: string,
    requirement: string,
    sessionId?: string,
    depth: number = 0
  ): Promise<{
    success: boolean
    testSteps: any[]
    analysis: string
    elements?: PageElements
    context?: any
    error?: string
  }> {
    try {
      logAI('开始分析页面功能...', getModelName(), sessionId)

      logMCP('[步骤1] 通过MCP获取完整页面上下文...', 'playwright', sessionId)
      const contextResult = await mcpManager.getFullPageContext(sessionId)
      
      if (!contextResult.success || !contextResult.data) {
        logAI('获取完整上下文失败，尝试只获取元素...', getModelName(), sessionId)
        const elements = await this.getPageElements(sessionId)
        if (!elements) {
          const fallbackElements = this.extractElements(pageHtml)
          return this.generateTestStepsFromElements(fallbackElements, requirement, sessionId)
        }
        return this.generateTestStepsWithElements(elements, requirement, sessionId)
      }

      const context = contextResult.data
      const elements = context.elements as PageElements
      
      logAI(`获取上下文: ${context.summary.inputCount}输入框, ${context.summary.buttonCount}按钮, ${context.summary.apiCount}个API响应`, getModelName(), sessionId)

      logAI('[步骤2] AI分析页面上下文，生成测试步骤...', getModelName(), sessionId)
      
      let apiInfo = ''
      if (context.apiResponses && context.apiResponses.length > 0) {
        apiInfo = `
### API接口响应 (共${context.apiResponses.length}个)
${context.apiResponses.map((api: any) => `
- ${api.method} ${api.url}
  状态: ${api.status}
  响应数据结构: ${JSON.stringify(api.responseBody, null, 2).substring(0, 500)}
`).join('\n')}
`
      }

      let errorInfo = ''
      if (context.consoleErrors && context.consoleErrors.length > 0) {
        errorInfo = `
### 控制台错误 (共${context.consoleErrors.length}个)
${context.consoleErrors.slice(0, 5).map((e: any) => `- ${e.text}`).join('\n')}
`
      }

      const aiClient = getAIClient()
      let areas = (context.areas || elements.areas || []) as PageArea[]

      if (depth > 0 && areas.length > 0) {
        const maxAreas = 5
        const candidateAreas = areas.slice(0, maxAreas)

        const refreshedAreas: PageArea[] = []
        for (const area of candidateAreas) {
          const areaSelector = area?.selector
          if (!areaSelector) {
            continue
          }

          const areaResult = await mcpManager.getElementsInArea(areaSelector, sessionId)
          if (areaResult.success && areaResult.data) {
            refreshedAreas.push({
              selector: areaSelector,
              description: area.description,
              elements: areaResult.data
            } as PageArea)
          } else {
            refreshedAreas.push(area)
          }
        }

        areas = refreshedAreas
      }
      const aiAnalysis = await aiClient.analyzePageForTesting(elements, requirement, apiInfo, errorInfo, areas, depth, sessionId)

      logAI(`AI分析完成: ${aiAnalysis.substring(0, 300)}...`, getModelName(), sessionId)

      // 解析测试步骤（使用健壮的JSON提取）
      let testSteps: any[] = []
      const parsed = extractJSONFromText(aiAnalysis)
      if (parsed) {
        testSteps = parsed.testSteps || []
      } else {
        logAI('解析AI返回的JSON失败，返回原始分析结果', getModelName(), sessionId)
      }

      // 严格验证每个步骤的选择器（使用工具函数）
      const validSelectorSet = buildValidSelectorSet(elements, areas)
      testSteps = validateTestStepSelectors(testSteps, validSelectorSet, sessionId)
      logAI(`选择器验证完成 (depth=${depth})`, getModelName(), sessionId)

      return {
        success: true,
        testSteps,
        analysis: aiAnalysis,
        elements,
        context
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
   * 只使用元素生成测试步骤
   * @author Jiane
   */
  private async generateTestStepsWithElements(
    elements: PageElements,
    requirement: string,
    sessionId?: string
  ): Promise<{
    success: boolean
    testSteps: any[]
    analysis: string
    elements?: PageElements
    error?: string
  }> {
    // 提取所有有效的选择器
    const validSelectors = {
      inputs: elements.inputs.map(el => el.selector),
      selects: elements.selects.map(el => el.selector),
      buttons: elements.buttons.map(el => el.selector)
    }

    const analysisPrompt = `
你是业务功能测试专家。请根据【实际获取到的页面元素】生成正向业务测试步骤。

## 测试需求
${requirement}

## 实际页面元素
输入框: ${JSON.stringify(elements.inputs, null, 2)}
下拉框: ${JSON.stringify(elements.selects, null, 2)}
按钮: ${JSON.stringify(elements.buttons, null, 2)}

## 有效选择器列表
- 输入框选择器: ${validSelectors.inputs.join(', ')}
- 下拉框选择器: ${validSelectors.selects.join(', ')}
- 按钮选择器: ${validSelectors.buttons.join(', ')}

## 严格规则（违反规则将导致测试失败）
1. 【绝对禁止】只能使用上面列出的元素，不能使用任何未列出的选择器
2. 【绝对禁止】selector必须严格使用元素中提供的selector，不能修改或创造
3. 【绝对禁止】不能使用通用选择器如"button"、"input"等
4. 【绝对禁止】只生成正向业务流程测试
5. 每个步骤的selector必须在有效选择器列表中

## 输出格式（严格JSON）
{
  "testSteps": [
    {
      "action": "fill",
      "selector": "必须从上面的有效选择器列表中选择",
      "value": "合理的测试数据",
      "description": "操作描述"
    }
  ],
  "analysis": "基于实际元素的页面功能分析"
}

## 选择器验证要求
每个testSteps中的selector都必须是以下之一：
${validSelectors.inputs.map(s => `- ${s}`).join('\n')}
${validSelectors.selects.map(s => `- ${s}`).join('\n')}
${validSelectors.buttons.map(s => `- ${s}`).join('\n')}
`

    const aiClient = getAIClient()
    const aiAnalysis = await aiClient.chatCompletion(
      {
        messages: [
          { 
            role: 'system', 
            content: '你是严格的业务测试专家。必须只使用提供的元素selector，违反此规则将导致测试失败。输出的JSON中每个selector都必须来自有效选择器列表。' 
          },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1, // 降低温度以减少创造性
        max_tokens: 2000
      },
      sessionId
    )

    let testSteps: any[] = []
    const parsed = extractJSONFromText(aiAnalysis)
    if (parsed) {
      const rawTestSteps = parsed.testSteps || []
      
      // 严格验证每个步骤的选择器
      testSteps = rawTestSteps.filter((step: any) => {
        const selector = step.selector
        const isValid = validSelectors.inputs.includes(selector) || 
                      validSelectors.selects.includes(selector) || 
                      validSelectors.buttons.includes(selector)
        
        if (!isValid) {
          logAI(`⚠️ 选择器无效，已过滤: ${selector}`, getModelName(), sessionId)
          return false
        }
        return true
      })
      
      logAI(`✅ 验证通过 ${testSteps.length}/${rawTestSteps.length} 个测试步骤`, getModelName(), sessionId)
    } else {
      logAI(`解析AI响应失败`, getModelName(), sessionId)
    }

    // 如果没有有效的测试步骤，生成基础测试
    if (testSteps.length === 0 && elements.buttons.length > 0) {
      logAI(`生成基础测试步骤作为备用方案`, getModelName(), sessionId)
      testSteps = elements.buttons.slice(0, 3).map((btn, index) => ({
        action: 'click',
        selector: btn.selector,
        description: `点击按钮: ${btn.text || btn.selector}`
      }))
    }

    return { success: true, testSteps, analysis: aiAnalysis, elements }
  }

  /**
   * 从备用元素生成测试步骤
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
    // 提取所有有效的选择器
    const validSelectors = {
      inputs: elements.inputs.map(el => el.selector),
      buttons: elements.buttons.map(el => el.selector)
    }

    const analysisPrompt = `
你是业务功能测试专家。请根据【实际获取到的页面元素】生成正向业务测试步骤。

## 测试需求
${requirement}

## 实际获取到的元素
输入框: ${JSON.stringify(elements.inputs, null, 2)}
按钮: ${JSON.stringify(elements.buttons, null, 2)}

## 有效选择器列表
- 输入框选择器: ${validSelectors.inputs.join(', ')}
- 按钮选择器: ${validSelectors.buttons.join(', ')}

## 严格规则（违反规则将导致测试失败）
1. 【绝对禁止】只能使用上面列出的元素，不能使用任何未列出的选择器
2. 【绝对禁止】selector必须严格使用元素中提供的selector，不能修改或创造
3. 【绝对禁止】不能使用通用选择器如"button"、"input"等
4. 【绝对禁止】只生成正向业务流程测试
5. 每个步骤的selector必须在有效选择器列表中

## 输出格式（严格JSON）
{
  "testSteps": [
    {
      "action": "fill/click",
      "selector": "必须从上面的有效选择器列表中选择",
      "value": "合理的测试数据",
      "description": "操作描述"
    }
  ],
  "analysis": "基于实际元素的页面功能分析"
}

## 选择器验证要求
每个testSteps中的selector都必须是以下之一：
${validSelectors.inputs.map(s => `- ${s}`).join('\n')}
${validSelectors.buttons.map(s => `- ${s}`).join('\n')}
`

    const aiClient = getAIClient()
    const aiAnalysis = await aiClient.chatCompletion(
      {
        messages: [
          { 
            role: 'system', 
            content: '你是严格的业务测试专家。必须只使用提供的元素selector，违反此规则将导致测试失败。输出的JSON中每个selector都必须来自有效选择器列表。' 
          },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1, // 降低温度以减少创造性
        max_tokens: 1500
      },
      sessionId
    )

    let testSteps: any[] = []
    const parsed = extractJSONFromText(aiAnalysis)
    if (parsed) {
      const rawTestSteps = parsed.testSteps || []
      
      // 严格验证每个步骤的选择器
      testSteps = rawTestSteps.filter((step: any) => {
        const selector = step.selector
        const isValid = validSelectors.inputs.includes(selector) || 
                      validSelectors.buttons.includes(selector)
        
        if (!isValid) {
          logAI(`⚠️ 选择器无效，已过滤: ${selector}`, getModelName(), sessionId)
          return false
        }
        return true
      })
      
      logAI(`✅ 验证通过 ${testSteps.length}/${rawTestSteps.length} 个测试步骤`, getModelName(), sessionId)
    } else {
      logAI(`解析AI响应失败`, getModelName(), sessionId)
    }

    // 如果没有有效的测试步骤，生成基础测试
    if (testSteps.length === 0 && elements.buttons.length > 0) {
      logAI(`生成基础测试步骤作为备用方案`, getModelName(), sessionId)
      testSteps = elements.buttons.slice(0, 3).map((btn, index) => ({
        action: 'click',
        selector: btn.selector,
        description: `点击按钮: ${btn.text || btn.selector}`
      }))
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
      logAI(`验证操作成功: ${operationType}`, getModelName(), sessionId)

      const aiClient = getAIClient()
      const result = await aiClient.verifyOperation(beforeHtml, afterHtml, operationType, sessionId)

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
