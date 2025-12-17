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
  extractElements(html: string): {
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

      // 提取button元素（包括隐藏的按钮）
      const buttonRegex = /<button[^>]*>([^<]*)<\/button>/gi
      const buttonMatches = html.match(buttonRegex) || []
      
      buttonMatches.forEach((match) => {
        const idMatch = match.match(/id=["']([^"']+)["']/i)
        const nameMatch = match.match(/name=["']([^"']+)["']/i)
        const textMatch = match.match(/>([^<]+)<\/button>/i)
        const typeMatch = match.match(/type=["']([^"']+)["']/i)

        const id = idMatch?.[1] || ''
        const name = nameMatch?.[1] || ''
        const text = textMatch?.[1]?.trim() || ''
        const type = typeMatch?.[1] || 'button'

        let selector = ''
        if (id) {
          selector = `#${id}`
        } else if (name) {
          selector = `button[name="${name}"]`
        } else if (text) {
          selector = `button:has-text("${text}")`
        } else if (type === 'submit') {
          selector = 'button[type="submit"]'
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

      // 提取 div 按钮（layui 等框架使用 div 作为按钮）
      // 匹配带有 lay-submit 或 class="btn" 的 div 元素
      const divButtonRegex = /<div[^>]*(?:lay-submit|class=["'][^"']*btn[^"']*["'])[^>]*>[\s\S]*?<\/div>/gi
      const divButtonMatches = html.match(divButtonRegex) || []
      
      divButtonMatches.forEach((match) => {
        const classMatch = match.match(/class=["']([^"']+)["']/i)
        const layFilterMatch = match.match(/lay-filter=["']([^"']+)["']/i)
        // 提取内部文本（可能嵌套在子元素中）
        const innerTextMatch = match.match(/>([^<]*登[^<]*)<|>([^<]*Login[^<]*)<|>([^<]*Submit[^<]*)</i)
        
        const className = classMatch?.[1] || ''
        const layFilter = layFilterMatch?.[1] || ''
        const text = innerTextMatch?.[1] || innerTextMatch?.[2] || innerTextMatch?.[3] || ''

        let selector = ''
        if (layFilter) {
          selector = `div[lay-filter="${layFilter}"]`
        } else if (className.includes('btn')) {
          selector = `div.btn`
        } else {
          selector = 'div[lay-submit]'
        }

        buttons.push({
          type: 'div-button',
          selector,
          text: text.trim() || '登录按钮'
        })
      })

      // 特别处理：查找包含"立即登录"、"登录"等文本的可点击元素
      const loginTextRegex = /<(?:div|span|a)[^>]*>[^<]*(?:立即登录|登录|登陆|Sign\s*In|Login)[^<]*<\/(?:div|span|a)>/gi
      const loginTextMatches = html.match(loginTextRegex) || []
      
      loginTextMatches.forEach((match) => {
        const textMatch = match.match(/>([^<]+)</i)
        const text = textMatch?.[1]?.trim() || ''
        
        if (text && !buttons.some(b => b.text === text)) {
          buttons.push({
            type: 'text-button',
            selector: `text="${text}"`,
            text
          })
        }
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
      logError('页面元素提取失败', error as Error, 'pageAnalyzer-extractElements')
      return { inputs: [], buttons: [], forms: [] }
    }
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
   * @author Jiane
   */
  async analyzePageFunctionality(
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
      logAI('开始分析页面功能...', 'qwen-vl-max', sessionId)

      const elements = this.extractElements(pageHtml)

      const analysisPrompt = `
你是一个业务功能测试专家，请根据页面元素生成【正向业务流程】的测试步骤。

## 测试需求
${requirement}

## 页面元素
输入框：
${JSON.stringify(elements.inputs, null, 2)}

按钮：
${JSON.stringify(elements.buttons, null, 2)}

## 生成规则
1. 只生成【正向业务操作】的测试步骤，模拟真实用户的正常使用流程
2. 每个步骤必须是可执行的具体操作（填写、点击、选择等）
3. 步骤中必须包含具体的选择器(selector)和测试数据(value)
4. 不要生成以下类型的测试：
   - 异常场景测试（空值、特殊字符、超长输入等）
   - 性能测试（网络延迟、加载状态等）
   - 无障碍测试（Tab键、键盘导航等）
   - 兼容性测试（不同浏览器、屏幕尺寸等）
   - 安全测试（XSS、SQL注入等）
   - 边界测试（重复提交、刷新行为等）

## 输出格式
请用JSON格式返回，每个步骤包含action、selector、value、description：
{
  "testSteps": [
    {
      "action": "fill",
      "selector": "#username",
      "value": "测试数据",
      "description": "在用户名输入框填写测试数据"
    },
    {
      "action": "click",
      "selector": "button[type=submit]",
      "value": "",
      "description": "点击提交按钮"
    }
  ],
  "analysis": "简要说明页面的核心业务功能"
}

action类型：fill(填写)、click(点击)、select(下拉选择)、verify(验证结果)
`

      const aiAnalysis = await qwenClient.chatCompletion(
        {
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'system',
              content: '你是业务功能测试专家，只生成正向业务流程的测试步骤，不生成异常、边界、性能等非业务测试。输出必须是有效的JSON格式。'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        },
        sessionId
      )

      logAI(`功能分析完成: ${aiAnalysis.substring(0, 200)}...`, 'qwen-vl-max', sessionId)

      return {
        success: true,
        testSteps: [],
        analysis: aiAnalysis
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
