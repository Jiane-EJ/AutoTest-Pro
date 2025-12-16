import { logAI, logMCP, logSystem, logError } from '@/lib/logger'
import { mcpManager } from '@/lib/mcp/mcpManager'
import { pageAnalyzer } from '@/lib/ai/pageAnalyzer'
import { qwenClient } from '@/lib/ai/qwenClient'

export interface StepExecutionContext {
  sessionId: string
  stepId: number
  stepTitle: string
  config: any
}

export interface StepResult {
  success: boolean
  data?: any
  error?: string
  duration: number
}

/**
 * 智能步骤执行器 - 改进的流程
 * 
 * 新流程：
 * 1. 获取当前页面HTML
 * 2. AI分析页面结构
 * 3. 生成正确的操作指令
 * 4. 执行MCP操作
 * 5. 验证操作结果
 */
export class SmartStepExecutor {
  /**
   * 执行登录步骤（改进版）
   * 流程：获取页面 → AI分析 → 填充表单 → 点击登录 → 验证
   */
  static async executeLoginFlow(
    context: StepExecutionContext
  ): Promise<StepResult> {
    const startTime = Date.now()
    const { sessionId, config } = context

    try {
      logSystem(`开始执行登录流程`, sessionId)

      // 步骤1：获取登录页面HTML
      logAI(`[步骤1] 获取登录页面HTML...`, sessionId)
      const pageHtmlResult = await mcpManager.callPlaywright(
        'get_visible_html',
        {},
        sessionId
      )

      if (!pageHtmlResult.success) {
        throw new Error('获取页面HTML失败')
      }

      const pageHtml = pageHtmlResult.data || ''

      // 步骤2：AI分析页面结构，获取正确的选择器
      logAI(`[步骤2] AI分析页面结构...`, sessionId)
      const analysisResult = await pageAnalyzer.analyzePageForLogin(
        pageHtml,
        sessionId
      )

      if (!analysisResult.success) {
        throw new Error('页面分析失败')
      }

      logAI(`页面分析结果: ${analysisResult.analysis}`, sessionId)

      // 从AI分析结果中提取选择器
      let usernameSelector = 'input[name="loginId"]'
      let passwordSelector = 'input[name="loginPwd"]'
      let loginButtonSelector = '#hiddenTrigger'

      // 尝试从AI分析结果中解析JSON
      try {
        const jsonMatch = analysisResult.analysis.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          usernameSelector = parsed.usernameSelector || usernameSelector
          passwordSelector = parsed.passwordSelector || passwordSelector
          loginButtonSelector = parsed.loginButtonSelector || loginButtonSelector
        }
      } catch (e) {
        logAI(`无法从AI分析结果解析JSON，使用默认选择器`, sessionId)
      }

      logAI(
        `确定的选择器 - 用户名: ${usernameSelector}, 密码: ${passwordSelector}, 登录按钮: ${loginButtonSelector}`,
        sessionId
      )

      // 步骤3：填充用户名
      logAI(`[步骤3] 填充用户名: ${config.username}`, sessionId)
      const fillUsernameResult = await mcpManager.callPlaywright(
        'fill',
        {
          selector: usernameSelector,
          value: config.username
        },
        sessionId
      )

      if (!fillUsernameResult.success) {
        logAI(`用户名填充失败，尝试替代选择器...`, sessionId)
        // 尝试替代选择器
        const altResult = await mcpManager.callPlaywright(
          'fill',
          {
            selector: analysisResult.inputs[0]?.selector || 'input[type="text"]',
            value: config.username
          },
          sessionId
        )
        if (!altResult.success) {
          throw new Error('无法填充用户名')
        }
      }

      // 步骤4：填充密码
      logAI(`[步骤4] 填充密码`, sessionId)
      const fillPasswordResult = await mcpManager.callPlaywright(
        'fill',
        {
          selector: passwordSelector,
          value: config.password
        },
        sessionId
      )

      if (!fillPasswordResult.success) {
        logAI(`密码填充失败，尝试替代选择器...`, sessionId)
        const altResult = await mcpManager.callPlaywright(
          'fill',
          {
            selector: analysisResult.inputs.find(i => i.type === 'password')?.selector || 'input[type="password"]',
            value: config.password
          },
          sessionId
        )
        if (!altResult.success) {
          throw new Error('无法填充密码')
        }
      }

      // 步骤5：点击登录按钮
      logAI(`[步骤5] 点击登录按钮`, sessionId)
      const clickResult = await mcpManager.callPlaywright(
        'click',
        {
          selector: loginButtonSelector
        },
        sessionId
      )

      if (!clickResult.success) {
        logAI(`登录按钮点击失败，尝试替代选择器...`, sessionId)
        const altResult = await mcpManager.callPlaywright(
          'click',
          {
            selector: analysisResult.buttons[0]?.selector || 'button[type="submit"]'
          },
          sessionId
        )
        if (!altResult.success) {
          throw new Error('无法点击登录按钮')
        }
      }

      // 步骤6：等待登录完成
      logAI(`[步骤6] 等待登录完成...`, sessionId)
      await new Promise(resolve => setTimeout(resolve, 3000))

      // 步骤7：获取登录后的页面并验证
      logAI(`[步骤7] 验证登录成功...`, sessionId)
      const afterLoginHtml = await mcpManager.callPlaywright(
        'get_visible_html',
        {},
        sessionId
      )

      if (!afterLoginHtml.success) {
        throw new Error('获取登录后页面失败')
      }

      // 调用AI验证登录状态
      const loginVerification = await qwenClient.analyzeLoginStatus(
        afterLoginHtml.data || '',
        sessionId
      )

      if (!loginVerification.success) {
        throw new Error('登录验证失败')
      }

      logAI(`登录验证完成: ${loginVerification.data.analysis.substring(0, 200)}...`, sessionId)

      return {
        success: true,
        data: {
          username: config.username,
          verification: loginVerification.data.analysis
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`登录流程执行失败: ${errorMsg}`, error as Error, sessionId)
      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 执行页面功能测试
   */
  static async executePageFunctionalityTest(
    context: StepExecutionContext,
    requirement: string
  ): Promise<StepResult> {
    const startTime = Date.now()
    const { sessionId } = context

    try {
      logSystem(`开始执行页面功能测试`, sessionId)

      // 步骤1：获取页面HTML
      logAI(`[步骤1] 获取页面HTML...`, sessionId)
      const pageHtmlResult = await mcpManager.callPlaywright(
        'get_visible_html',
        {},
        sessionId
      )

      if (!pageHtmlResult.success) {
        throw new Error('获取页面HTML失败')
      }

      const pageHtml = pageHtmlResult.data || ''

      // 步骤2：AI分析页面功能
      logAI(`[步骤2] AI分析页面功能...`, sessionId)
      const analysisResult = await pageAnalyzer.analyzePageFunctionality(
        pageHtml,
        requirement,
        sessionId
      )

      if (!analysisResult.success) {
        throw new Error('页面功能分析失败')
      }

      logAI(`功能分析完成: ${analysisResult.analysis.substring(0, 300)}...`, sessionId)

      // 步骤3：根据分析结果生成测试步骤
      logAI(`[步骤3] 生成测试步骤...`, sessionId)
      const testStepsPrompt = `
基于以下页面分析结果，生成具体的测试步骤：

${analysisResult.analysis}

请生成JSON格式的测试步骤：
{
  "steps": [
    {
      "action": "click|fill|navigate|verify",
      "selector": "...",
      "value": "...",
      "description": "..."
    }
  ]
}
`

      const testStepsResult = await qwenClient.chatCompletion(
        {
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的自动化测试专家。请生成具体的测试步骤。'
            },
            {
              role: 'user',
              content: testStepsPrompt
            }
          ],
          temperature: 0.4,
          max_tokens: 1000
        },
        sessionId
      )

      logAI(`测试步骤生成完成`, sessionId)

      return {
        success: true,
        data: {
          analysis: analysisResult.analysis,
          testSteps: testStepsResult
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`页面功能测试执行失败: ${errorMsg}`, error as Error, sessionId)
      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 执行导航操作
   */
  static async executeNavigation(
    context: StepExecutionContext,
    url: string
  ): Promise<StepResult> {
    const startTime = Date.now()
    const { sessionId } = context

    try {
      logSystem(`开始导航到: ${url}`, sessionId)

      const result = await mcpManager.callPlaywright(
        'navigate',
        { url, headless: false },
        sessionId
      )

      if (!result.success) {
        throw new Error(`导航失败: ${result.error}`)
      }

      logAI(`导航成功: ${url}`, sessionId)

      return {
        success: true,
        data: result.data,
        duration: Date.now() - startTime
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`导航执行失败: ${errorMsg}`, error as Error, sessionId)
      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime
      }
    }
  }
}

export const smartStepExecutor = new SmartStepExecutor()
