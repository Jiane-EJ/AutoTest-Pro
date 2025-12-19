import { logAI, logMCP, logSystem, logError } from '@/lib/logger'
import { mcpManager } from '@/lib/mcp/mcpManager'
import { pageAnalyzer } from '@/lib/ai/pageAnalyzer'
import { getAIClient, ModelPurpose } from '@/lib/ai/aiClient'

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
 * @author Jiane
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
   * 流程：获取页面 -> AI分析 -> 填充表单 -> 点击登录 -> 验证
   */
  static async executeLoginFlow(
    context: StepExecutionContext
  ): Promise<StepResult> {
    const startTime = Date.now()
    const { sessionId, config } = context

    try {
      logSystem(`开始执行登录流程`, 'smartStepExecutor-executeLoginFlow', sessionId)

      // 步骤1：获取登录页面HTML
      logAI(`[步骤1] 获取登录页面HTML...`, getModelName(), sessionId)
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
      logAI(`[步骤2] AI分析页面结构...`, getModelName(), sessionId)
      const analysisResult = await pageAnalyzer.analyzePageForLogin(
        pageHtml,
        sessionId
      )

      if (!analysisResult.success) {
        throw new Error('页面分析失败')
      }

      logAI(`页面分析结果: ${analysisResult.analysis}`, getModelName(), sessionId)

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
        logAI(`无法从AI分析结果解析JSON，使用默认选择器`, getModelName(), sessionId)
      }

      logAI(
        `确定的选择器 - 用户名: ${usernameSelector}, 密码: ${passwordSelector}, 登录按钮: ${loginButtonSelector}`,
        getModelName(), sessionId
      )

      // 步骤3：填充用户名
      logAI(`[步骤3] 填充用户名: ${config.username}`, getModelName(), sessionId)
      const fillUsernameResult = await mcpManager.callPlaywright(
        'fill',
        {
          selector: usernameSelector,
          value: config.username
        },
        sessionId
      )

      if (!fillUsernameResult.success) {
        logAI(`用户名填充失败，尝试替代选择器...`, getModelName(), sessionId)
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
      logAI(`[步骤4] 填充密码`, getModelName(), sessionId)
      const fillPasswordResult = await mcpManager.callPlaywright(
        'fill',
        {
          selector: passwordSelector,
          value: config.password
        },
        sessionId
      )

      if (!fillPasswordResult.success) {
        logAI(`密码填充失败，尝试替代选择器...`, getModelName(), sessionId)
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
      logAI(`[步骤5] 点击登录按钮`, getModelName(), sessionId)
      
      const buttonSelectors = [
        loginButtonSelector,
        'div.btn',
        'div[lay-submit]',
        'div[lay-filter="login_btn"]',
        'text="立即登录"',
        'text="登录"',
        'text="登陆"',
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
        
        logAI(`尝试点击按钮: ${selector}`, getModelName(), sessionId)
        const clickResult = await mcpManager.callPlaywright(
          'click',
          { selector },
          sessionId
        )
        
        if (clickResult.success) {
          logAI(`成功点击按钮: ${selector}`, getModelName(), sessionId)
          clickSuccess = true
          break
        }
      }

      if (!clickSuccess) {
        logAI(`尝试使用JavaScript触发点击事件...`, getModelName(), sessionId)
        const jsResult = await mcpManager.callPlaywright(
          'evaluate',
          {
            script: `
              (function() {
                let divBtn = document.querySelector('div.btn');
                if (divBtn) { divBtn.click(); return 'div.btn'; }
                
                let laySubmit = document.querySelector('[lay-submit]');
                if (laySubmit) { laySubmit.click(); return 'lay-submit'; }
                
                const allElements = document.querySelectorAll('div, span, a, button');
                for (let el of allElements) {
                  if (el.textContent && el.textContent.includes('立即登录')) {
                    el.click(); return '立即登录';
                  }
                }
                
                for (let el of allElements) {
                  if (el.textContent && (el.textContent.includes('登录') || el.textContent.includes('登陆'))) {
                    el.click(); return '登录';
                  }
                }
                
                let btn = document.getElementById('hiddenTrigger');
                if (btn) { btn.click(); return 'hiddenTrigger'; }
                
                const buttons = document.querySelectorAll('button[type="submit"]');
                if (buttons.length > 0) { buttons[0].click(); return 'submit'; }
                
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
      logAI(`[步骤6] 检测是否有滑块验证码...`, getModelName(), sessionId)
      
      const sliderCheckResult = await mcpManager.callPlaywright(
        'evaluate',
        {
          script: `
            (function() {
              const ncSlider = document.querySelector('#nc_1_n1z, .nc_wrapper, .nc-container, #nc');
              if (ncSlider && ncSlider.offsetParent !== null) {
                return { hasSlider: true, type: 'aliyun' };
              }
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
        logAI(`[警告] 检测到滑块验证码 (${sliderCheckResult.data.type})，需要手动完成验证`, getModelName(), sessionId)
        logSystem(`检测到滑块验证码，等待用户手动完成...`, 'smartStepExecutor-executeLoginFlow', sessionId)
        await new Promise(resolve => setTimeout(resolve, 10000))
      } else {
        logAI(`[步骤6] 未检测到滑块验证码，等待页面跳转...`, getModelName(), sessionId)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // 步骤7：检测登录状态
      logAI(`[步骤7] 检测登录状态...`, getModelName(), sessionId)
      
      const loginStatusResult = await mcpManager.callPlaywright(
        'evaluate',
        {
          script: `
            (function() {
              const url = window.location.href;
              const hasLoginForm = document.querySelector('input[name="loginId"], input[name="loginPwd"]');
              const hasUserInfo = document.querySelector('.user-info, .username, .avatar, .logout');
              const hasMenu = document.querySelector('.menu, .sidebar, .nav-menu, .layui-nav, .layui-side');
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
      
      if (loginStatusResult.success && loginStatusResult.data) {
        const status = loginStatusResult.data
        logAI(`[登录状态检测] URL: ${status.url || '未知'}`, getModelName(), sessionId)
        logAI(`[登录状态检测] 是否在登录页: ${status.isLoginPage}`, getModelName(), sessionId)
        logAI(`[登录状态检测] 是否有用户信息: ${status.hasUserInfo}`, getModelName(), sessionId)
        logAI(`[登录状态检测] 是否有菜单: ${status.hasMenu}`, getModelName(), sessionId)
        logAI(`[登录状态检测] 页面标题: ${status.pageTitle || '未知'}`, getModelName(), sessionId)
        
        if (status.isLoginPage && !status.hasUserInfo && !status.hasMenu) {
          logAI(`[警告] 仍在登录页面，登录可能未成功`, getModelName(), sessionId)
        }
      } else {
        logAI(`[警告] 登录状态检测返回无效结果，继续执行...`, getModelName(), sessionId)
      }

      // 步骤8：获取登录后的页面并验证
      logAI(`[步骤8] 验证登录成功...`, getModelName(), sessionId)
      const afterLoginContext = await mcpManager.getFullPageContext(sessionId)
      if (!afterLoginContext.success || !afterLoginContext.data) {
        throw new Error('获取登录后页面上下文失败')
      }

      const aiClient = getAIClient()

      const statusHint = loginStatusResult.success ? loginStatusResult.data : null
      const loginVerification = await aiClient.analyzeLoginStatusByContext({
        url: statusHint?.url,
        title: statusHint?.pageTitle,
        summary: afterLoginContext.data?.summary,
        statusHint,
        elements: afterLoginContext.data?.elements
      }, sessionId)

      if (!loginVerification.success) {
        throw new Error('登录验证失败')
      }

      logAI(`登录验证完成: ${loginVerification.data.analysis.substring(0, 200)}...`, getModelName(), sessionId)

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
      logError(`登录流程执行失败: ${errorMsg}`, error as Error, 'smartStepExecutor-executeLoginFlow', sessionId)
      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 执行单个测试步骤
   * @author Jiane
   */
  private static async executeTestStep(
    step: any,
    sessionId: string,
    stepIndex: number,
    strict: boolean = false
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const action = step.action?.toLowerCase() || ''
      const selector = step.selector || ''
      const value = step.value || ''
      const description = step.description || ''

      logAI(`[测试步骤 ${stepIndex + 1}] 执行: ${description}`, getModelName(), sessionId)

      switch (action) {
        case 'fill':
        case 'input':
          logMCP(`填充输入框: ${selector} = ${value}`, 'playwright', sessionId)
          const fillResult = await mcpManager.callPlaywright(
            'fill',
            { selector, value, strict },
            sessionId
          )
          if (!fillResult.success) {
            return { success: false, error: `填充失败: ${fillResult.error}` }
          }
          logAI(`✓ 填充成功: ${selector}`, getModelName(), sessionId)
          break

        case 'click':
          logMCP(`点击元素: ${selector}`, 'playwright', sessionId)
          const clickResult = await mcpManager.callPlaywright(
            'click',
            { selector, strict },
            sessionId
          )
          if (!clickResult.success) {
            return { success: false, error: `点击失败: ${clickResult.error}` }
          }
          logAI(`✓ 点击成功: ${selector}`, getModelName(), sessionId)
          await new Promise(resolve => setTimeout(resolve, 500))
          break

        case 'select':
          logMCP(`选择下拉框: ${selector} = ${value}`, 'playwright', sessionId)
          const selectResult = await mcpManager.callPlaywright(
            'select',
            { selector, value, strict },
            sessionId
          )
          if (!selectResult.success) {
            return { success: false, error: `选择失败: ${selectResult.error}` }
          }
          logAI(`✓ 选择成功: ${selector}`, getModelName(), sessionId)
          break

        case 'hover':
          logMCP(`悬停元素: ${selector}`, 'playwright', sessionId)
          const hoverResult = await mcpManager.callPlaywright(
            'hover',
            { selector, strict },
            sessionId
          )
          if (!hoverResult.success) {
            return { success: false, error: `悬停失败: ${hoverResult.error}` }
          }
          logAI(`✓ 悬停成功: ${selector}`, getModelName(), sessionId)
          break

        case 'wait':
          const waitTime = parseInt(value) || 1000
          logAI(`等待 ${waitTime}ms...`, getModelName(), sessionId)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          logAI(`✓ 等待完成`, getModelName(), sessionId)
          break

        case 'verify':
        case 'check':
          logMCP(`验证元素: ${selector}`, 'playwright', sessionId)
          const verifyResult = await mcpManager.callPlaywright(
            'evaluate',
            {
              script: `
                (function() {
                  const el = document.querySelector('${selector}');
                  if (!el) return { found: false };
                  return {
                    found: true,
                    visible: el.offsetParent !== null,
                    text: el.textContent?.substring(0, 100),
                    value: el.value
                  };
                })()
              `
            },
            sessionId
          )
          if (!verifyResult.success || !verifyResult.data?.found) {
            return { success: false, error: `验证失败: 元素未找到 ${selector}` }
          }
          logAI(`✓ 验证成功: ${selector}`, getModelName(), sessionId)
          break

        default:
          logAI(`⚠ 未知操作类型: ${action}`, getModelName(), sessionId)
          return { success: false, error: `未知操作类型: ${action}` }
      }

      return { success: true, result: { action, selector, value } }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 执行页面功能测试 - 改进版（递归执行测试步骤）
   * @author Jiane
   * 
   * 新流程：
   * 1. 获取页面元素和上下文
   * 2. AI分析页面功能
   * 3. 生成测试步骤
   * 4. [递归] 逐个执行每个测试步骤
   * 5. 验证每个步骤的执行结果
   * 6. 如果步骤失败，AI生成补救步骤
   * 7. 继续执行下一个步骤
   */
  static async executePageFunctionalityTest(
    context: StepExecutionContext,
    requirement: string
  ): Promise<StepResult> {
    const startTime = Date.now()
    const { sessionId } = context

    try {
      logSystem(`开始执行页面功能测试`, 'smartStepExecutor-executePageFunctionalityTest', sessionId)

      logAI(`[步骤1] MCP获取页面元素 + AI分析...`, getModelName(), sessionId)
      
      const analysisResult = await pageAnalyzer.analyzePageFunctionality(
        '',
        requirement,
        sessionId
      )

      if (!analysisResult.success) {
        throw new Error('页面功能分析失败: ' + (analysisResult.error || '未知错误'))
      }

      if (analysisResult.elements) {
        const e = analysisResult.elements
        logAI(`[元素统计] 输入框:${e.inputs.length} 下拉框:${e.selects.length} 按钮:${e.buttons.length} 表格:${e.tables.length}`, getModelName(), sessionId)
      }

      logAI(`[步骤2] AI分析完成，生成了 ${analysisResult.testSteps.length} 个测试步骤`, getModelName(), sessionId)

      let testSteps: any[] = analysisResult.testSteps || []

      const maxDepth = 3
      let currentDepth = 0

      if (testSteps.length === 0) {
        logAI(`[步骤3] 尝试从分析结果中解析测试步骤...`, getModelName(), sessionId)
        
        try {
          const jsonMatch = analysisResult.analysis.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            testSteps = parsed.testSteps || parsed.steps || []
          }
        } catch (e) {
          logAI(`解析失败，使用原始分析结果`, getModelName(), sessionId)
        }
      }

      logAI(`[步骤3] 开始递归执行 ${testSteps.length} 个测试步骤...`, getModelName(), sessionId)

      // 递归执行每个测试步骤
      const executionResults: any[] = []
      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < testSteps.length; i++) {
        const step = testSteps[i]
        logAI(`\n[执行进度] ${i + 1}/${testSteps.length}`, getModelName(), sessionId)

        const stepResult = await this.executeTestStep(step, sessionId, i, true)

        if (stepResult.success) {
          successCount++
          executionResults.push({
            index: i + 1,
            status: 'success',
            step: step.description,
            result: stepResult.result
          })
          logAI(`✓ 步骤 ${i + 1} 执行成功`, getModelName(), sessionId)
        } else {
          failureCount++
          executionResults.push({
            index: i + 1,
            status: 'failed',
            step: step.description,
            error: stepResult.error
          })
          logAI(`✗ 步骤 ${i + 1} 执行失败: ${stepResult.error}`, getModelName(), sessionId)

          if (currentDepth < maxDepth) {
            currentDepth++
            logAI(`第${i + 1}步失败，触发第${currentDepth + 1}轮聚焦分析`, getModelName(), sessionId)
            const refocusedAnalysis = await pageAnalyzer.analyzePageFunctionality(
              '',
              requirement,
              sessionId,
              currentDepth
            )

            if (refocusedAnalysis.success && (refocusedAnalysis.testSteps || []).length > 0) {
              const newSteps = refocusedAnalysis.testSteps
              // 替换后续步骤，避免继续执行已知不可靠的计划
              testSteps = [...testSteps.slice(0, i + 1), ...newSteps]

              logAI(`聚焦分析生成 ${newSteps.length} 个新步骤，替换后续计划并继续执行`, getModelName(), sessionId)
              continue
            }
          }

          // 尝试生成补救步骤
          logAI(`[补救] 尝试为失败的步骤生成补救方案...`, getModelName(), sessionId)
          
          // 获取当前页面状态
          const pageStateResult = await mcpManager.callPlaywright(
            'get_visible_html',
            {},
            sessionId
          )

          if (pageStateResult.success) {
            const aiClient = getAIClient()
            const recoveryAnalysis = await aiClient.generateRecoverySteps(
              pageStateResult.data || '',
              step.description,
              stepResult.error || '',
              sessionId
            )

            logAI(`[补救] AI建议: ${recoveryAnalysis.substring(0, 200)}...`, getModelName(), sessionId)

            // 尝试执行补救步骤
            try {
              const recoverySteps = this.parseRecoverySteps(recoveryAnalysis)
              for (const recoveryStep of recoverySteps) {
                const recoveryResult = await this.executeTestStep(recoveryStep, sessionId, i, false)
                if (recoveryResult.success) {
                  logAI(`✓ 补救步骤执行成功`, getModelName(), sessionId)
                  successCount++
                  failureCount--
                  executionResults[executionResults.length - 1].status = 'recovered'
                  break
                }
              }
            } catch (e) {
              logAI(`[补救] 补救步骤执行失败，继续下一步...`, getModelName(), sessionId)
            }
          }
        }

        // 步骤间延迟
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      logAI(`\n[执行总结] 成功: ${successCount}, 失败: ${failureCount}, 总计: ${testSteps.length}`, getModelName(), sessionId)

      return {
        success: true,
        data: {
          elements: analysisResult.elements,
          analysis: analysisResult.analysis,
          testSteps: testSteps,
          executionResults: executionResults,
          summary: {
            total: testSteps.length,
            success: successCount,
            failed: failureCount,
            successRate: testSteps.length > 0 ? ((successCount / testSteps.length) * 100).toFixed(2) + '%' : '0%'
          }
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`页面功能测试执行失败: ${errorMsg}`, error as Error, 'smartStepExecutor-executePageFunctionalityTest', sessionId)
      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 解析补救步骤
   * @author Jiane
   */
  private static parseRecoverySteps(analysis: string): any[] {
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return parsed.steps || parsed.recoverySteps || []
      }
    } catch (e) {
      // 解析失败，返回空数组
    }
    return []
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
      logSystem(`开始导航到: ${url}`, 'smartStepExecutor-executeNavigation', sessionId)

      const result = await mcpManager.callPlaywright(
        'navigate',
        { url, headless: false },
        sessionId
      )

      if (!result.success) {
        throw new Error(`导航失败: ${result.error}`)
      }

      logAI(`导航成功: ${url}`, getModelName(), sessionId)

      return {
        success: true,
        data: result.data,
        duration: Date.now() - startTime
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`导航执行失败: ${errorMsg}`, error as Error, 'smartStepExecutor-executeNavigation', sessionId)
      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 通过菜单导航到指定页面（改进版）
   * @author Jiane
   */
  static async navigateByMenu(
    context: StepExecutionContext,
    menuPath: string
  ): Promise<StepResult> {
    const startTime = Date.now()
    const { sessionId } = context

    try {
      logSystem(`开始通过菜单导航到: ${menuPath}`, 'smartStepExecutor-navigateByMenu', sessionId)

      logAI(`[菜单导航] 步骤1: 获取页面菜单结构...`, getModelName(), sessionId)
      const pageHtmlResult = await mcpManager.callPlaywright(
        'get_visible_html',
        {},
        sessionId
      )

      if (!pageHtmlResult.success) {
        throw new Error('获取页面HTML失败')
      }

      logAI(`[菜单导航] 步骤2: AI分析菜单结构...`, getModelName(), sessionId)
      
      const menuParts = menuPath.split('-').map(p => p.trim())

      const aiClient = getAIClient()
      const menuAnalysisResult = await aiClient.analyzeMenuStructure(
        pageHtmlResult.data || '',
        menuPath,
        sessionId
      )

      logAI(`[菜单导航] AI分析结果: ${menuAnalysisResult.substring(0, 300)}...`, getModelName(), sessionId)

      let menuSteps: Array<{ action: string; selector: string; description: string }> = []
      
      try {
        const jsonMatch = menuAnalysisResult.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.found && parsed.steps) {
            menuSteps = parsed.steps
          }
        }
      } catch (e) {
        logAI(`[菜单导航] 无法解析AI返回的JSON，尝试使用默认选择器`, getModelName(), sessionId)
      }

      if (menuSteps.length === 0) {
        logAI(`[菜单导航] 使用通用选择器尝试定位菜单...`, getModelName(), sessionId)
        
        for (const menuName of menuParts) {
          menuSteps.push({
            action: 'click',
            selector: `text="${menuName}"`,
            description: `点击菜单: ${menuName}`
          })
        }
      }

      logAI(`[菜单导航] 步骤3: 执行菜单点击操作...`, getModelName(), sessionId)
      
      for (let i = 0; i < menuSteps.length; i++) {
        const step = menuSteps[i]
        logAI(`[菜单导航] 执行: ${step.description} (${step.selector})`, getModelName(), sessionId)
        
        const selectorsToTry = [
          step.selector,
          `.layui-nav-item:has-text("${menuParts[i]}")`,
          `.layui-nav-child a:has-text("${menuParts[i]}")`,
          `[lay-href*="${menuParts[i]}"]`,
          `a:has-text("${menuParts[i]}")`,
          `span:has-text("${menuParts[i]}")`,
          `.menu-item:has-text("${menuParts[i]}")`,
          `.nav-item:has-text("${menuParts[i]}")`,
          `text="${menuParts[i]}"`
        ]

        let clickSuccess = false
        for (const selector of selectorsToTry) {
          try {
            const clickResult = await mcpManager.callPlaywright(
              'click',
              { selector },
              sessionId
            )
            
            if (clickResult.success) {
              logAI(`[菜单导航] 成功点击: ${selector}`, getModelName(), sessionId)
              clickSuccess = true
              await new Promise(resolve => setTimeout(resolve, 1000))
              break
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }

        if (!clickSuccess) {
          logAI(`[菜单导航] 尝试使用JavaScript点击菜单: ${menuParts[i]}`, getModelName(), sessionId)
          const jsClickResult = await mcpManager.callPlaywright(
            'evaluate',
            {
              script: `
                (function() {
                  const menuName = "${menuParts[i]}";
                  const allElements = document.querySelectorAll('a, span, div, li');
                  for (let el of allElements) {
                    if (el.textContent && el.textContent.trim() === menuName) {
                      el.click();
                      return { success: true, element: el.tagName };
                    }
                  }
                  for (let el of allElements) {
                    if (el.textContent && el.textContent.includes(menuName)) {
                      el.click();
                      return { success: true, element: el.tagName, partial: true };
                    }
                  }
                  return { success: false };
                })()
              `
            },
            sessionId
          )

          if (jsClickResult.success && jsClickResult.data?.success) {
            logAI(`[菜单导航] JavaScript点击成功: ${menuParts[i]}`, getModelName(), sessionId)
            await new Promise(resolve => setTimeout(resolve, 1000))
          } else {
            logAI(`[菜单导航] 警告: 无法点击菜单项 "${menuParts[i]}"，继续尝试...`, getModelName(), sessionId)
          }
        }
      }

      logAI(`[菜单导航] 步骤4: 验证导航结果...`, getModelName(), sessionId)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const verifyResult = await mcpManager.callPlaywright(
        'evaluate',
        {
          script: `
            (function() {
              return {
                url: window.location.href,
                title: document.title,
                hasContent: document.body.innerText.length > 100
              };
            })()
          `
        },
        sessionId
      )

      if (verifyResult.success && verifyResult.data) {
        logAI(`[菜单导航] 当前URL: ${verifyResult.data.url}`, getModelName(), sessionId)
        logAI(`[菜单导航] 页面标题: ${verifyResult.data.title}`, getModelName(), sessionId)
      }

      return {
        success: true,
        data: {
          menuPath,
          steps: menuSteps.length,
          verification: verifyResult.data
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`菜单导航执行失败: ${errorMsg}`, error as Error, 'smartStepExecutor-navigateByMenu', sessionId)
      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime
      }
    }
  }
}

export const smartStepExecutor = new SmartStepExecutor()
