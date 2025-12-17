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
      logSystem(`开始执行登录流程`, 'smartStepExecutor-executeLoginFlow', sessionId)

      // 步骤1：获取登录页面HTML
      logAI(`[步骤1] 获取登录页面HTML...`, 'qwen-vl-max', sessionId)
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
      logAI(`[步骤2] AI分析页面结构...`, 'qwen-vl-max', sessionId)
      const analysisResult = await pageAnalyzer.analyzePageForLogin(
        pageHtml,
        sessionId
      )

      if (!analysisResult.success) {
        throw new Error('页面分析失败')
      }

      logAI(`页面分析结果: ${analysisResult.analysis}`, 'qwen-vl-max', sessionId)

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
        logAI(`无法从AI分析结果解析JSON，使用默认选择器`, 'qwen-vl-max', sessionId)
      }

      logAI(
        `确定的选择器 - 用户名: ${usernameSelector}, 密码: ${passwordSelector}, 登录按钮: ${loginButtonSelector}`,
        'qwen-vl-max', sessionId
      )

      // 步骤3：填充用户名
      logAI(`[步骤3] 填充用户名: ${config.username}`, 'qwen-vl-max', sessionId)
      const fillUsernameResult = await mcpManager.callPlaywright(
        'fill',
        {
          selector: usernameSelector,
          value: config.username
        },
        sessionId
      )

      if (!fillUsernameResult.success) {
        logAI(`用户名填充失败，尝试替代选择器...`, 'qwen-vl-max', sessionId)
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
      logAI(`[步骤4] 填充密码`, 'qwen-vl-max', sessionId)
      const fillPasswordResult = await mcpManager.callPlaywright(
        'fill',
        {
          selector: passwordSelector,
          value: config.password
        },
        sessionId
      )

      if (!fillPasswordResult.success) {
        logAI(`密码填充失败，尝试替代选择器...`, 'qwen-vl-max', sessionId)
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
      logAI(`[步骤5] 点击登录按钮`, 'qwen-vl-max', sessionId)
      
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
        
        logAI(`尝试点击按钮: ${selector}`, 'qwen-vl-max', sessionId)
        const clickResult = await mcpManager.callPlaywright(
          'click',
          { selector },
          sessionId
        )
        
        if (clickResult.success) {
          logAI(`成功点击按钮: ${selector}`, 'qwen-vl-max', sessionId)
          clickSuccess = true
          break
        }
      }

      if (!clickSuccess) {
        // 最后尝试：使用JavaScript直接触发点击
        logAI(`尝试使用JavaScript触发点击事件...`, 'qwen-vl-max', sessionId)
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
      logAI(`[步骤6] 检测是否有滑块验证码...`, 'qwen-vl-max', sessionId)
      
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
        logAI(`[警告] 检测到滑块验证码 (${sliderCheckResult.data.type})，需要手动完成验证`, 'qwen-vl-max', sessionId)
        logSystem(`检测到滑块验证码，等待用户手动完成...`, 'smartStepExecutor-executeLoginFlow', sessionId)
        // 等待更长时间让用户完成滑块验证
        await new Promise(resolve => setTimeout(resolve, 10000))
      } else {
        logAI(`[步骤6] 未检测到滑块验证码，等待页面跳转...`, 'qwen-vl-max', sessionId)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // 步骤7：检测登录状态（通过 URL 或页面内容变化）
      logAI(`[步骤7] 检测登录状态...`, 'qwen-vl-max', sessionId)
      
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
      
      // 安全检查：确保返回结果有效
      if (loginStatusResult.success && loginStatusResult.data) {
        const status = loginStatusResult.data
        logAI(`[登录状态检测] URL: ${status.url || '未知'}`, 'qwen-vl-max', sessionId)
        logAI(`[登录状态检测] 是否在登录页: ${status.isLoginPage}`, 'qwen-vl-max', sessionId)
        logAI(`[登录状态检测] 是否有用户信息: ${status.hasUserInfo}`, 'qwen-vl-max', sessionId)
        logAI(`[登录状态检测] 是否有菜单: ${status.hasMenu}`, 'qwen-vl-max', sessionId)
        logAI(`[登录状态检测] 页面标题: ${status.pageTitle || '未知'}`, 'qwen-vl-max', sessionId)
        
        if (status.isLoginPage && !status.hasUserInfo && !status.hasMenu) {
          logAI(`[警告] 仍在登录页面，登录可能未成功`, 'qwen-vl-max', sessionId)
        }
      } else {
        logAI(`[警告] 登录状态检测返回无效结果，继续执行...`, 'qwen-vl-max', sessionId)
      }

      // 步骤8：获取登录后的页面并验证
      logAI(`[步骤8] 验证登录成功...`, 'qwen-vl-max', sessionId)
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

      logAI(`登录验证完成: ${loginVerification.data.analysis.substring(0, 200)}...`, 'qwen-vl-max', sessionId)

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
   * 执行页面功能测试
   */
  static async executePageFunctionalityTest(
    context: StepExecutionContext,
    requirement: string
  ): Promise<StepResult> {
    const startTime = Date.now()
    const { sessionId } = context

    try {
      logSystem(`开始执行页面功能测试`, 'smartStepExecutor-executePageFunctionalityTest', sessionId)

      // 步骤1：获取页面HTML
      logAI(`[步骤1] 获取页面HTML...`, 'qwen-vl-max', sessionId)
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
      logAI(`[步骤2] AI分析页面功能...`, 'qwen-vl-max', sessionId)
      const analysisResult = await pageAnalyzer.analyzePageFunctionality(
        pageHtml,
        requirement,
        sessionId
      )

      if (!analysisResult.success) {
        throw new Error('页面功能分析失败')
      }

      logAI(`功能分析完成: ${analysisResult.analysis.substring(0, 300)}...`, 'qwen-vl-max', sessionId)

      // 步骤3：根据分析结果生成测试步骤
      logAI(`[步骤3] 生成测试步骤...`, 'qwen-vl-max', sessionId)
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

      logAI(`测试步骤生成完成`, 'qwen-vl-max', sessionId)

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
      logError(`页面功能测试执行失败: ${errorMsg}`, error as Error, 'smartStepExecutor-executePageFunctionalityTest', sessionId)
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
      logSystem(`开始导航到: ${url}`, 'smartStepExecutor-executeNavigation', sessionId)

      const result = await mcpManager.callPlaywright(
        'navigate',
        { url, headless: false },
        sessionId
      )

      if (!result.success) {
        throw new Error(`导航失败: ${result.error}`)
      }

      logAI(`导航成功: ${url}`, 'qwen-vl-max', sessionId)

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
   * 不再直接拼接URL，而是通过AI分析页面菜单结构，模拟点击菜单
   */
  static async navigateByMenu(
    context: StepExecutionContext,
    menuPath: string
  ): Promise<StepResult> {
    const startTime = Date.now()
    const { sessionId } = context

    try {
      logSystem(`开始通过菜单导航到: ${menuPath}`, 'smartStepExecutor-navigateByMenu', sessionId)

      // 步骤1：获取当前页面HTML，分析菜单结构
      logAI(`[菜单导航] 步骤1: 获取页面菜单结构...`, 'qwen-vl-max', sessionId)
      const pageHtmlResult = await mcpManager.callPlaywright(
        'get_visible_html',
        {},
        sessionId
      )

      if (!pageHtmlResult.success) {
        throw new Error('获取页面HTML失败')
      }

      // 步骤2：AI分析菜单结构，找到目标菜单的选择器
      logAI(`[菜单导航] 步骤2: AI分析菜单结构...`, 'qwen-vl-max', sessionId)
      
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

      const menuAnalysisResult = await qwenClient.chatCompletion(
        {
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的Web页面分析专家，擅长分析页面菜单结构并提供准确的CSS选择器。'
            },
            {
              role: 'user',
              content: `${menuAnalysisPrompt}\n\n页面HTML片段（菜单相关部分）：\n${pageHtmlResult.data?.substring(0, 15000) || ''}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        },
        sessionId
      )

      logAI(`[菜单导航] AI分析结果: ${menuAnalysisResult.substring(0, 300)}...`, 'qwen-vl-max', sessionId)

      // 解析AI返回的菜单操作步骤
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
        logAI(`[菜单导航] 无法解析AI返回的JSON，尝试使用默认选择器`, 'qwen-vl-max', sessionId)
      }

      // 如果AI没有找到，尝试使用通用选择器
      if (menuSteps.length === 0) {
        logAI(`[菜单导航] 使用通用选择器尝试定位菜单...`, 'qwen-vl-max', sessionId)
        
        // 构建通用选择器列表
        for (const menuName of menuParts) {
          menuSteps.push({
            action: 'click',
            selector: `text="${menuName}"`,
            description: `点击菜单: ${menuName}`
          })
        }
      }

      // 步骤3：依次点击菜单项
      logAI(`[菜单导航] 步骤3: 执行菜单点击操作...`, 'qwen-vl-max', sessionId)
      
      for (let i = 0; i < menuSteps.length; i++) {
        const step = menuSteps[i]
        logAI(`[菜单导航] 执行: ${step.description} (${step.selector})`, 'qwen-vl-max', sessionId)
        
        // 尝试多种选择器
        const selectorsToTry = [
          step.selector,
          // layui 框架选择器
          `.layui-nav-item:has-text("${menuParts[i]}")`,
          `.layui-nav-child a:has-text("${menuParts[i]}")`,
          `[lay-href*="${menuParts[i]}"]`,
          // 通用选择器
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
              logAI(`[菜单导航] 成功点击: ${selector}`, 'qwen-vl-max', sessionId)
              clickSuccess = true
              // 等待页面响应
              await new Promise(resolve => setTimeout(resolve, 1000))
              break
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }

        if (!clickSuccess) {
          // 尝试使用JavaScript点击
          logAI(`[菜单导航] 尝试使用JavaScript点击菜单: ${menuParts[i]}`, 'qwen-vl-max', sessionId)
          const jsClickResult = await mcpManager.callPlaywright(
            'evaluate',
            {
              script: `
                (function() {
                  const menuName = "${menuParts[i]}";
                  
                  // 查找包含菜单文本的所有元素
                  const allElements = document.querySelectorAll('a, span, div, li');
                  for (let el of allElements) {
                    if (el.textContent && el.textContent.trim() === menuName) {
                      el.click();
                      return { success: true, element: el.tagName };
                    }
                  }
                  
                  // 查找包含菜单文本的元素（部分匹配）
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
            logAI(`[菜单导航] JavaScript点击成功: ${menuParts[i]}`, 'qwen-vl-max', sessionId)
            await new Promise(resolve => setTimeout(resolve, 1000))
          } else {
            logAI(`[菜单导航] 警告: 无法点击菜单项 "${menuParts[i]}"，继续尝试...`, 'qwen-vl-max', sessionId)
          }
        }
      }

      // 步骤4：验证导航结果
      logAI(`[菜单导航] 步骤4: 验证导航结果...`, 'qwen-vl-max', sessionId)
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
        logAI(`[菜单导航] 当前URL: ${verifyResult.data.url}`, 'qwen-vl-max', sessionId)
        logAI(`[菜单导航] 页面标题: ${verifyResult.data.title}`, 'qwen-vl-max', sessionId)
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
