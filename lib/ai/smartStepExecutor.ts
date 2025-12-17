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
      
      // 尝试多个选择器（包括 layui 的 div 按钮）
      const buttonSelectors = [
        loginButtonSelector,
        // layui 框架的登录按钮
        'div.btn',
        'div[lay-submit]',
        'div[lay-filter="login_btn"]',
        // 文本匹配
        'text="立即登录"',
        'text="登录"',
        'text="登陆"',
        // 标准按钮
        'button[type="submit"]',
        'button:has-text("登录")',
        'button:has-text("登陆")',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        analysisResult.buttons[0]?.selector,
        'button'
      ].filter(Boolean)

      let clickSuccess = false
      for (const selector of buttonSelectors) {
        if (!selector) continue
        
        logAI(`尝试点击按钮: ${selector}`, sessionId)
        const clickResult = await mcpManager.callPlaywright(
          'click',
          { selector },
          sessionId
        )
        
        if (clickResult.success) {
          logAI(`成功点击按钮: ${selector}`, sessionId)
          clickSuccess = true
          break
        }
      }

      if (!clickSuccess) {
        // 最后尝试：使用JavaScript直接触发点击
        logAI(`尝试使用JavaScript触发点击事件...`, sessionId)
        const jsResult = await mcpManager.callPlaywright(
          'evaluate',
          {
            script: `
              (function() {
                // 首先尝试找到 layui 的登录按钮 (div.btn)
                let divBtn = document.querySelector('div.btn');
                if (divBtn) {
                  divBtn.click();
                  return 'div.btn';
                }
                
                // 尝试找到 lay-submit 属性的元素
                let laySubmit = document.querySelector('[lay-submit]');
                if (laySubmit) {
                  laySubmit.click();
                  return 'lay-submit';
                }
                
                // 尝试找到包含"立即登录"文本的元素
                const allElements = document.querySelectorAll('div, span, a, button');
                for (let el of allElements) {
                  if (el.textContent && el.textContent.includes('立即登录')) {
                    el.click();
                    return '立即登录';
                  }
                }
                
                // 尝试找到包含"登录"文本的元素
                for (let el of allElements) {
                  if (el.textContent && (el.textContent.includes('登录') || el.textContent.includes('登陆'))) {
                    el.click();
                    return '登录';
                  }
                }
                
                // 尝试找到 id 为 hiddenTrigger 的按钮
                let btn = document.getElementById('hiddenTrigger');
                if (btn) {
                  btn.click();
                  return 'hiddenTrigger';
                }
                
                // 尝试找到所有按钮中的提交按钮
                const buttons = document.querySelectorAll('button[type="submit"]');
                if (buttons.length > 0) {
                  buttons[0].click();
                  return 'submit';
                }
                
                return false;
              })()
            `
          },
          sessionId
        )
        
        if (!jsResult.success || !jsResult.data) {
          throw new Error('无法点击登录按钮')
        }
      }

      // 步骤6：检测是否有滑块验证码
      logAI(`[步骤6] 检测是否有滑块验证码...`, sessionId)
      
      // 检查页面是否有滑块验证码
      const sliderCheckResult = await mcpManager.callPlaywright(
        'evaluate',
        {
          script: `
            (function() {
              // 检查阿里云滑块验证码
              const ncSlider = document.querySelector('#nc_1_n1z, .nc_wrapper, .nc-container, #nc');
              if (ncSlider && ncSlider.offsetParent !== null) {
                return { hasSlider: true, type: 'aliyun' };
              }
              
              // 检查其他类型的验证码
              const captcha = document.querySelector('.captcha, .verify-wrap, .geetest_holder');
              if (captcha && captcha.offsetParent !== null) {
                return { hasSlider: true, type: 'other' };
              }
              
              return { hasSlider: false };
            })()
          `
        },
        sessionId
      )
      
      if (sliderCheckResult.success && sliderCheckResult.data?.hasSlider) {
        logAI(`[警告] 检测到滑块验证码 (${sliderCheckResult.data.type})，需要手动完成验证`, sessionId)
        logSystem(`检测到滑块验证码，等待用户手动完成...`, sessionId)
        // 等待更长时间让用户完成滑块验证
        await new Promise(resolve => setTimeout(resolve, 10000))
      } else {
        logAI(`[步骤6] 未检测到滑块验证码，等待页面跳转...`, sessionId)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // 步骤7：检测登录状态（通过 URL 或页面内容变化）
      logAI(`[步骤7] 检测登录状态...`, sessionId)
      
      const loginStatusResult = await mcpManager.callPlaywright(
        'evaluate',
        {
          script: `
            (function() {
              const url = window.location.href;
              const hasLoginForm = document.querySelector('input[name="loginId"], input[name="loginPwd"]');
              const hasUserInfo = document.querySelector('.user-info, .username, .avatar, .logout');
              const hasMenu = document.querySelector('.menu, .sidebar, .nav-menu');
              
              return {
                url: url,
                isLoginPage: !!hasLoginForm,
                hasUserInfo: !!hasUserInfo,
                hasMenu: !!hasMenu,
                pageTitle: document.title
              };
            })()
          `
        },
        sessionId
      )
      
      if (loginStatusResult.success) {
        const status = loginStatusResult.data
        logAI(`[登录状态检测] URL: ${status.url}`, sessionId)
        logAI(`[登录状态检测] 是否在登录页: ${status.isLoginPage}`, sessionId)
        logAI(`[登录状态检测] 是否有用户信息: ${status.hasUserInfo}`, sessionId)
        logAI(`[登录状态检测] 是否有菜单: ${status.hasMenu}`, sessionId)
        logAI(`[登录状态检测] 页面标题: ${status.pageTitle}`, sessionId)
        
        if (status.isLoginPage && !status.hasUserInfo) {
          logAI(`[警告] 仍在登录页面，登录可能未成功`, sessionId)
        }
      }

      // 步骤8：获取登录后的页面并验证
      logAI(`[步骤8] 验证登录成功...`, sessionId)
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
