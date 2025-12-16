import { logAI, logError } from '@/lib/logger'
import { qwenClient } from '@/lib/ai/qwenClient'

export interface PageElement {
  type: string
  selector: string
  id?: string
  name?: string
  placeholder?: string
  text?: string
  ariaLabel?: string
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
 * 页面分析器 - 在执行操作前分析页面结构
 * 流程：获取HTML → 提取元素 → AI分析 → 生成选择器
 */
export class PageAnalyzer {
  /**
   * 从HTML中提取所有交互元素
   */
  static extractElements(html: string): {
    inputs: PageElement[]
    buttons: PageElement[]
    forms: PageElement[]
  } {
    try {
      // 简单的正则表达式提取（实际应用中应使用DOM解析）
      const inputs: PageElement[] = []
      const buttons: PageElement[] = []
      const forms: PageElement[] = []

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

        let selector = ''
        if (id) {
          selector = `#${id}`
        } else if (name) {
          selector = `input[name="${name}"]`
        } else if (type === 'password') {
          selector = 'input[type="password"]'
        } else {
          selector = `input[type="${type}"]`
        }

        inputs.push({
          type,
          selector,
          id,
          name,
          placeholder: placeholderMatch?.[1] || ''
        })
      })

      // 提取button元素
      const buttonRegex = /<button[^>]*>([^<]*)<\/button>/gi
      const buttonMatches = html.match(buttonRegex) || []
      
      buttonMatches.forEach((match) => {
        const idMatch = match.match(/id=["']([^"']+)["']/i)
        const nameMatch = match.match(/name=["']([^"']+)["']/i)
        const textMatch = match.match(/>([^<]+)<\/button>/i)

        const id = idMatch?.[1] || ''
        const name = nameMatch?.[1] || ''
        const text = textMatch?.[1]?.trim() || ''

        let selector = ''
        if (id) {
          selector = `#${id}`
        } else if (name) {
          selector = `button[name="${name}"]`
        } else if (text) {
          selector = `button:has-text("${text}")`
        } else {
          selector = 'button'
        }

        buttons.push({
          type: 'button',
          selector,
          id,
          name,
          text
        })
      })

      // 提取form元素
      const formRegex = /<form[^>]*>/gi
      const formMatches = html.match(formRegex) || []
      
      formMatches.forEach((match) => {
        const idMatch = match.match(/id=["']([^"']+)["']/i)
        const nameMatch = match.match(/name=["']([^"']+)["']/i)

        const id = idMatch?.[1] || ''
        const name = nameMatch?.[1] || ''

        let selector = ''
        if (id) {
          selector = `#${id}`
        } else if (name) {
          selector = `form[name="${name}"]`
        } else {
          selector = 'form'
        }

        forms.push({
          type: 'form',
          selector,
          id,
          name
        })
      })

      return { inputs, buttons, forms }
    } catch (error) {
      logError('页面元素提取失败', error as Error)
      return { inputs: [], buttons: [], forms: [] }
    }
  }

  /**
   * 分析页面并生成操作指导
   */
  static async analyzePageForLogin(
    pageHtml: string,
    sessionId?: string
  ): Promise<PageAnalysisResult> {
    try {
      logAI('开始分析登录页面结构...', sessionId)

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

      logAI(`页面分析完成: ${aiAnalysis.substring(0, 200)}...`, sessionId)

      return {
        success: true,
        inputs: elements.inputs,
        buttons: elements.buttons,
        forms: elements.forms,
        analysis: aiAnalysis
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('页面分析失败', error as Error, sessionId)
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
   */
  static async analyzePageFunctionality(
    pageHtml: string,
    requirement: string,
    sessionId?: string
  ): Promise<{
    success: boolean
    testSteps: string[]
    analysis: string
    error?: string
  }> {
    try {
      logAI('开始分析页面功能...', sessionId)

      const elements = this.extractElements(pageHtml)

      const analysisPrompt = `
请分析以下页面的功能，并生成测试步骤：

测试需求：${requirement}

页面输入框：
${JSON.stringify(elements.inputs, null, 2)}

页面按钮：
${JSON.stringify(elements.buttons, null, 2)}

请生成详细的测试步骤，并用JSON格式返回：
{
  "testSteps": [
    "步骤1: ...",
    "步骤2: ...",
    ...
  ],
  "analysis": "页面功能分析..."
}
`

      const aiAnalysis = await qwenClient.chatCompletion(
        {
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的自动化测试专家。请分析页面功能并生成测试步骤。'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.4,
          max_tokens: 1200
        },
        sessionId
      )

      logAI(`功能分析完成: ${aiAnalysis.substring(0, 200)}...`, sessionId)

      return {
        success: true,
        testSteps: [],
        analysis: aiAnalysis
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('功能分析失败', error as Error, sessionId)
      return {
        success: false,
        testSteps: [],
        analysis: '',
        error: errorMsg
      }
    }
  }

  /**
   * 验证操作是否成功
   */
  static async verifyOperationSuccess(
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
      logAI(`验证操作成功: ${operationType}`, sessionId)

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
      logError('操作验证失败', error as Error, sessionId)
      return {
        success: false,
        verified: false,
        reason: errorMsg
      }
    }
  }
}

export const pageAnalyzer = new PageAnalyzer()
