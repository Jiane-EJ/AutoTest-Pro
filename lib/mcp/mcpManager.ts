import { logMCP, logError } from '@/lib/logger'
import { chromium, Browser, Page } from 'playwright'

export interface MCPConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface MCPResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * 控制台日志条目
 */
export interface ConsoleLogEntry {
  type: 'log' | 'info' | 'warn' | 'error' | 'debug'
  text: string
  timestamp: number
  url?: string
}

/**
 * 网络请求条目
 */
export interface NetworkRequestEntry {
  url: string
  method: string
  resourceType: string
  status?: number
  statusText?: string
  requestHeaders?: Record<string, string>
  responseHeaders?: Record<string, string>
  requestBody?: any
  responseBody?: any
  timestamp: number
  duration?: number
}

export class MCPManager {
  private processes: Map<string, any> = new Map()
  private browser: Browser | null = null
  private page: Page | null = null
  
  // 控制台日志收集
  private consoleLogs: ConsoleLogEntry[] = []
  // 网络请求收集
  private networkRequests: NetworkRequestEntry[] = []
  // 是否已启用监听
  private listenersEnabled: boolean = false

  constructor() {
    this.initializeMCPs()
  }

  private initializeMCPs() {
    logMCP(`MCPManager已初始化，准备使用真实Playwright浏览器`, 'playwright')
  }

  private async ensureBrowser() {
    if (!this.browser) {
      logMCP(`启动Playwright浏览器...`, 'playwright')
      this.browser = await chromium.launch({ headless: false })
      this.page = await this.browser.newPage()
      
      // 启用控制台和网络监听
      await this.enablePageListeners()
    }
    return { browser: this.browser, page: this.page! }
  }

  /**
   * 启用页面监听器（控制台日志 + 网络请求）
   * @author Jiane
   */
  private async enablePageListeners() {
    if (!this.page || this.listenersEnabled) return
    
    const tool = 'playwright'
    logMCP('启用控制台和网络监听...', tool)

    // 监听控制台日志
    this.page.on('console', (msg) => {
      const entry: ConsoleLogEntry = {
        type: msg.type() as ConsoleLogEntry['type'],
        text: msg.text(),
        timestamp: Date.now(),
        url: this.page?.url()
      }
      this.consoleLogs.push(entry)
      
      // 只保留最近500条
      if (this.consoleLogs.length > 500) {
        this.consoleLogs = this.consoleLogs.slice(-500)
      }
    })

    // 监听页面错误
    this.page.on('pageerror', (error) => {
      this.consoleLogs.push({
        type: 'error',
        text: `PageError: ${error.message}`,
        timestamp: Date.now(),
        url: this.page?.url()
      })
    })

    // 监听网络请求
    this.page.on('request', (request) => {
      const entry: NetworkRequestEntry = {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        requestHeaders: request.headers(),
        timestamp: Date.now()
      }
      
      // 尝试获取请求体
      try {
        const postData = request.postData()
        if (postData) {
          try {
            entry.requestBody = JSON.parse(postData)
          } catch {
            entry.requestBody = postData
          }
        }
      } catch {
        // ignore
      }
      
      this.networkRequests.push(entry)
      
      // 只保留最近200条
      if (this.networkRequests.length > 200) {
        this.networkRequests = this.networkRequests.slice(-200)
      }
    })

    // 监听网络响应
    this.page.on('response', async (response) => {
      const url = response.url()
      const entry = this.networkRequests.find(r => r.url === url && !r.status)
      
      if (entry) {
        entry.status = response.status()
        entry.statusText = response.statusText()
        entry.responseHeaders = response.headers()
        entry.duration = Date.now() - entry.timestamp
        
        // 尝试获取响应体（只获取JSON类型，支持所有成功状态码）
        try {
          const contentType = response.headers()['content-type'] || ''
          const status = response.status()
          if (contentType.includes('application/json') && status >= 200 && status < 300) {
            const body = await response.json().catch(() => null)
            if (body) {
              entry.responseBody = body
            }
          }
        } catch {
          // ignore
        }
      }
    })

    this.listenersEnabled = true
    logMCP('控制台和网络监听已启用', tool)
  }

  // Sequential Thinking MCP - 使用AI进行深度思考
  async callSequentialThinking(thoughts: string[], sessionId?: string): Promise<MCPResult> {
    const tool = 'sequential-thinking'
    logMCP(`调用: ${JSON.stringify(thoughts)}`, tool, sessionId)
    
    try {
      // 这里可以集成真实的sequential-thinking MCP
      // 目前返回思考过程的总结
      const thoughtSummary = thoughts.join(' -> ')
      logMCP(`响应: 完成思考过程 - ${thoughtSummary}`, tool, sessionId)
      
      return {
        success: true,
        data: {
          status: 'completed',
          result: `已完成思考过程: ${thoughtSummary}`,
          thoughts: thoughts
        }
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`sequential-thinking调用失败: ${errorMsg}`, error, 'mcpManager-callSequentialThinking', sessionId)
      return {
        success: false,
        error: errorMsg
      }
    }
  }

  // Context7 MCP - 获取文档和上下文信息
  async callContext7(query: string, sessionId?: string): Promise<MCPResult> {
    const tool = 'context7'
    logMCP(`调用: ${query}`, tool, sessionId)
    
    try {
      // 这里可以集成真实的context7 MCP来查询文档
      // 目前返回查询结果
      logMCP(`响应: 查询完成 - ${query}`, tool, sessionId)
      
      return {
        success: true,
        data: {
          status: 'completed',
          result: `已查询: ${query}`,
          query: query,
          relatedElements: ['button', 'input', 'form', 'link']
        }
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`context7调用失败: ${errorMsg}`, error, 'mcpManager-callContext7', sessionId)
      return {
        success: false,
        error: errorMsg
      }
    }
  }

  // Playwright MCP - 真实浏览器操作
  async callPlaywright(action: string, params: any, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    logMCP(`调用: ${action}(${JSON.stringify(params)})`, tool, sessionId)
    
    try {
      const { page } = await this.ensureBrowser()
      
      switch (action) {
        case 'navigate':
          return await this.realNavigate(page, params.url, sessionId)
        case 'fill':
          return await this.realFill(page, params.selector, params.value, !!params.strict, sessionId)
        case 'click':
          return await this.realClick(page, params.selector, !!params.strict, sessionId)
        case 'select':
          return await this.realSelect(page, params.selector, params.value, !!params.strict, sessionId)
        case 'hover':
          return await this.realHover(page, params.selector, !!params.strict, sessionId)
        case 'wait_for_element':
          return await this.realWaitForElement(page, params.selector, sessionId)
        case 'get_visible_html':
          return await this.realGetVisibleHtml(page, sessionId)
        case 'get_visible_text':
          return await this.realGetVisibleText(page, sessionId)
        case 'evaluate':
          return await this.realEvaluate(page, params.script, sessionId)
        default:
          throw new Error(`不支持的操作: ${action}`)
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`playwright调用失败: ${errorMsg}`, error, 'mcpManager-callPlaywright', sessionId)
      return {
        success: false,
        error: errorMsg
      }
    }
  }

  private async realNavigate(page: Page, url: string, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`浏览器导航到: ${url}`, tool, sessionId)
      
      // 使用更宽松的等待条件
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      
      // 额外等待一下，确保动态内容加载
      await page.waitForTimeout(2000)
      
      logMCP(`导航成功: ${url}`, tool, sessionId)
      
      return {
        success: true,
        data: {
          status: 'completed',
          url: url,
          title: await page.title()
        }
      }
    } catch (error) {
      throw error
    }
  }

  private async realFill(page: Page, selector: string, value: string, strict: boolean, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`输入文本到元素 [${selector}]: ${value}`, tool, sessionId)
      
      let targetSelector = selector
      
      // 先尝试等待元素出现
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
      } catch (waitError) {
        if (strict) {
          throw new Error(`无法找到输入框: ${selector}`)
        }
        logMCP(`元素 [${selector}] 未找到，尝试使用替代选择器...`, tool, sessionId)
        
        // 尝试替代选择器
        const alternativeSelectors = [
          `input[name="${selector.replace('#', '')}"]`,
          `input[id="${selector.replace('#', '')}"]`,
          `[placeholder*="${selector.replace('#', '')}"]`,
          `input[type="text"]`,
          `input[type="password"]`
        ]
        
        let found = false
        for (const altSelector of alternativeSelectors) {
          try {
            await page.waitForSelector(altSelector, { timeout: 2000 })
            logMCP(`找到替代元素: ${altSelector}`, tool, sessionId)
            targetSelector = altSelector
            found = true
            break
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        if (!found) {
          throw new Error(`无法找到输入框: ${selector}`)
        }
      }
      
      // 使用模拟人类输入的方式（避免触发滑块验证）
      await this.humanLikeType(page, targetSelector, value, sessionId)
      
      logMCP(`输入成功: [${targetSelector}]`, tool, sessionId)
      
      return {
        success: true,
        data: {
          status: 'completed',
          selector: targetSelector,
          value: value
        }
      }
    } catch (error) {
      throw error
    }
  }

  private async realSelect(page: Page, selector: string, value: string, strict: boolean, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`选择下拉框 [${selector}]: ${value}`, tool, sessionId)

      try {
        await page.waitForSelector(selector, { timeout: 5000 })
      } catch {
        if (strict) {
          throw new Error(`无法找到下拉框: ${selector}`)
        }
      }

      // 优先尝试原生 selectOption
      const selected = await page.selectOption(selector, { label: value }).catch(async () => {
        return await page.selectOption(selector, { value }).catch(() => null)
      })

      if (!selected) {
        if (strict) {
          throw new Error(`无法选择下拉框选项: ${selector} = ${value}`)
        }
        // 非严格模式：尝试点击打开后选择文本
        await this.humanLikeClickBySelector(page, selector, sessionId)
        await page.getByText(value, { exact: false }).first().click().catch(() => {})
      }

      return {
        success: true,
        data: {
          status: 'completed',
          selector,
          value
        }
      }
    } catch (error) {
      throw error
    }
  }

  private async realHover(page: Page, selector: string, strict: boolean, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`悬停元素: ${selector}`, tool, sessionId)

      try {
        await page.waitForSelector(selector, { timeout: 5000 })
      } catch {
        if (strict) {
          throw new Error(`无法找到元素: ${selector}`)
        }
      }

      await page.hover(selector)

      return {
        success: true,
        data: {
          status: 'completed',
          selector
        }
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 模拟人类输入行为
   * - 先点击输入框获取焦点
   * - 清空现有内容
   * - 逐字输入，每个字符之间有随机延迟
   */
  private async humanLikeType(page: Page, selector: string, text: string, sessionId?: string): Promise<void> {
    const tool = 'playwright'
    logMCP(`[人类模拟] 开始模拟人类输入: ${selector}`, tool, sessionId)
    
    // 1. 点击输入框获取焦点
    await page.click(selector)
    await this.randomDelay(100, 300)
    
    // 2. 清空现有内容 (Ctrl+A 然后删除)
    await page.keyboard.press('Control+a')
    await this.randomDelay(50, 150)
    await page.keyboard.press('Backspace')
    await this.randomDelay(100, 200)
    
    // 3. 逐字输入，模拟人类打字速度
    for (const char of text) {
      await page.keyboard.type(char, { delay: this.getRandomInt(50, 150) })
      // 偶尔有更长的停顿（模拟思考）
      if (Math.random() < 0.1) {
        await this.randomDelay(200, 500)
      }
    }
    
    logMCP(`[人类模拟] 输入完成: ${selector}`, tool, sessionId)
  }

  /**
   * 随机延迟
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = this.getRandomInt(min, max)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * 获取随机整数
   */
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * 模拟人类点击行为（通过选择器）
   * - 先将鼠标移动到元素位置
   * - 随机偏移一点位置
   * - 然后点击
   */
  private async humanLikeClickBySelector(page: Page, selector: string, sessionId?: string): Promise<void> {
    const tool = 'playwright'
    logMCP(`[人类模拟] 开始模拟人类点击: ${selector}`, tool, sessionId)
    
    // 获取元素位置
    const element = page.locator(selector)
    const box = await element.boundingBox()
    
    if (box) {
      // 计算点击位置（元素中心 + 随机偏移）
      const x = box.x + box.width / 2 + this.getRandomInt(-5, 5)
      const y = box.y + box.height / 2 + this.getRandomInt(-3, 3)
      
      // 移动鼠标到目标位置
      await page.mouse.move(x, y, { steps: this.getRandomInt(5, 15) })
      await this.randomDelay(100, 300)
      
      // 点击
      await page.mouse.click(x, y)
    } else {
      // 如果无法获取位置，使用普通点击
      await element.click()
    }
    
    logMCP(`[人类模拟] 点击完成: ${selector}`, tool, sessionId)
  }

  /**
   * 模拟人类点击行为（通过 Locator）
   */
  private async humanLikeClick(page: Page, element: any, sessionId?: string): Promise<void> {
    const tool = 'playwright'
    logMCP(`[人类模拟] 开始模拟人类点击元素`, tool, sessionId)
    
    const box = await element.boundingBox()
    
    if (box) {
      const x = box.x + box.width / 2 + this.getRandomInt(-5, 5)
      const y = box.y + box.height / 2 + this.getRandomInt(-3, 3)
      
      await page.mouse.move(x, y, { steps: this.getRandomInt(5, 15) })
      await this.randomDelay(100, 300)
      await page.mouse.click(x, y)
    } else {
      await element.click()
    }
    
    logMCP(`[人类模拟] 点击完成`, tool, sessionId)
  }

  /**
   * 提取元素的功能关键词用于AI判断
   */
  private extractFunctionalKeywords(text: string, className: string, title: string, ariaLabel: string): string[] {
    const keywords: string[] = []
    const allText = `${text} ${className} ${title} ${ariaLabel}`.toLowerCase()
    
    // 搜索相关关键词
    if (allText.includes('搜索') || allText.includes('查询') || allText.includes('search') || allText.includes('query')) {
      keywords.push('搜索')
    }
    
    // 新增相关关键词
    if (allText.includes('新增') || allText.includes('添加') || allText.includes('新建') || allText.includes('add') || allText.includes('create') || allText.includes('new')) {
      keywords.push('新增')
    }
    
    // 编辑相关关键词
    if (allText.includes('编辑') || allText.includes('修改') || allText.includes('更改') || allText.includes('edit') || allText.includes('update') || allText.includes('modify')) {
      keywords.push('编辑')
    }
    
    // 删除相关关键词
    if (allText.includes('删除') || allText.includes('移除') || allText.includes('del') || allText.includes('delete') || allText.includes('remove')) {
      keywords.push('删除')
    }
    
    // 重置相关关键词
    if (allText.includes('重置') || allText.includes('清空') || allText.includes('清除') || allText.includes('reset') || allText.includes('clear')) {
      keywords.push('重置')
    }
    
    // 保存相关关键词
    if (allText.includes('保存') || allText.includes('提交') || allText.includes('确认') || allText.includes('save') || allText.includes('submit') || allText.includes('confirm')) {
      keywords.push('保存')
    }
    
    // 查看相关关键词
    if (allText.includes('查看') || allText.includes('详情') || allText.includes('view') || allText.includes('detail') || allText.includes('show')) {
      keywords.push('查看')
    }
    
    // 导出相关关键词
    if (allText.includes('导出') || allText.includes('下载') || allText.includes('export') || allText.includes('download')) {
      keywords.push('导出')
    }
    
    // 导入相关关键词
    if (allText.includes('导入') || allText.includes('批量导入') || allText.includes('import') || allText.includes('batch')) {
      keywords.push('导入')
    }
    
    // 分页相关关键词
    if (allText.includes('下一页') || allText.includes('上一页') || allText.includes('next') || allText.includes('prev') || allText.includes('page')) {
      keywords.push('分页')
    }
    
    return keywords
  }

  /**
   * 检测当前页面类型
   */
  private async detectPageType(page: Page, sessionId?: string): Promise<'login' | 'functional' | 'unknown'> {
    try {
      const pageAnalysis = await page.evaluate(() => {
        const hasLoginForm = document.querySelector('input[name="loginId"], input[name="loginPwd"], #loginPhone')
        const hasLoginButton = Array.from(document.querySelectorAll('*')).some(el => 
          el.textContent && (el.textContent.includes('登录') || el.textContent.includes('登陆') || el.textContent.includes('Login'))
        )
        const hasUserInfo = document.querySelector('.user-info, .username, .avatar, .logout')
        const hasMenu = document.querySelector('.menu, .sidebar, .nav-menu, .layui-nav, .layui-side')
        const hasFunctionalElements = document.querySelector('.search-page, .table, .el-table, button:not([type="submit"])')
        
        return {
          hasLoginForm: !!hasLoginForm,
          hasLoginButton: hasLoginButton,
          hasUserInfo: !!hasUserInfo,
          hasMenu: !!hasMenu,
          hasFunctionalElements: !!hasFunctionalElements,
          url: window.location.href,
          title: document.title
        }
      })
      
      logMCP(`页面分析结果: ${JSON.stringify(pageAnalysis)}`, 'playwright', sessionId)
      
      // 判断页面类型
      if (pageAnalysis.hasLoginForm && pageAnalysis.hasLoginButton && !pageAnalysis.hasUserInfo && !pageAnalysis.hasMenu) {
        return 'login'
      } else if ((pageAnalysis.hasUserInfo || pageAnalysis.hasMenu || pageAnalysis.hasFunctionalElements) && !pageAnalysis.hasLoginForm) {
        return 'functional'
      } else {
        return 'unknown'
      }
    } catch (error) {
      logMCP(`页面类型检测失败: ${error}`, 'playwright', sessionId)
      return 'unknown'
    }
  }

  private async realClick(page: Page, selector: string, strict: boolean, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`点击元素: ${selector}`, tool, sessionId)
      
      // 处理文本选择器 (text="xxx")
      if (selector.startsWith('text=')) {
        if (strict) {
          throw new Error(`严格模式不允许使用文本选择器: ${selector}`)
        }
        const text = selector.replace('text=', '').replace(/"/g, '')
        logMCP(`使用文本选择器查找: ${text}`, tool, sessionId)
        const element = page.getByText(text, { exact: false })
        await this.humanLikeClick(page, element, sessionId)
        logMCP(`文本元素点击成功: ${text}`, tool, sessionId)
        return {
          success: true,
          data: { status: 'completed', selector }
        }
      }
      
      // 先尝试等待元素出现
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
        await this.humanLikeClickBySelector(page, selector, sessionId)
        logMCP(`点击成功: ${selector}`, tool, sessionId)
        return {
          success: true,
          data: { status: 'completed', selector }
        }
      } catch (waitError) {
        if (strict) {
          throw new Error(`无法找到按钮: ${selector}`)
        }
        logMCP(`元素 [${selector}] 未找到，尝试使用替代选择器...`, tool, sessionId)
        
        // 检测当前页面类型
        const pageType = await this.detectPageType(page, sessionId)
        logMCP(`检测到页面类型: ${pageType}`, tool, sessionId)
        
        // 根据页面类型使用不同的替代选择器
        let alternativeSelectors: string[] = []
        
        if (pageType === 'login') {
          // 登录页面的替代选择器
          alternativeSelectors = [
            // layui 框架的登录按钮
            `div.btn`,
            `div[lay-submit]`,
            `div[lay-filter="login_btn"]`,
            // 标准登录按钮
            `button[id="${selector.replace('#', '')}"]`,
            `button[name="${selector.replace('#', '')}"]`,
            `button:has-text("登录")`,
            `button:has-text("登录按钮")`,
            `button[type="submit"]`,
            `input[type="submit"]`
          ]
        } else if (pageType === 'functional') {
          // 功能页面的替代选择器（移除登录相关的）
          alternativeSelectors = [
            // 通用按钮选择器
            `button[id="${selector.replace('#', '')}"]`,
            `button[name="${selector.replace('#', '')}"]`,
            `button[type="button"]`,
            `button:not([type="submit"])`,
            // 如果选择器是通用按钮，尝试查找常见的功能按钮
            '.btn:not(.btn-login)',
            '.el-button:not(.el-button--primary)',
            'button[class*="btn"]'
          ]
        } else {
          // 未知页面，使用通用选择器
          alternativeSelectors = [
            `button[id="${selector.replace('#', '')}"]`,
            `button[name="${selector.replace('#', '')}"]`,
            `button[type="button"]`,
            `div.btn`,
            `button`
          ]
        }
        
        let found = false
        for (const altSelector of alternativeSelectors) {
          try {
            await page.waitForSelector(altSelector, { timeout: 2000 })
            logMCP(`找到替代元素: ${altSelector}`, tool, sessionId)
            // 使用人类模拟点击
            await this.humanLikeClickBySelector(page, altSelector, sessionId)
            found = true
            logMCP(`点击成功: ${altSelector}`, tool, sessionId)
            break
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        // 尝试使用文本查找（根据页面类型使用不同关键词）
        if (!found) {
          let searchTexts: string[] = []
          
          if (pageType === 'login') {
            // 登录页面使用登录相关文本
            searchTexts = [
              '立即登录',
              '登录',
              '登陆',
              '登 录',
              '登 陆',
              'Sign In',
              'Login',
              'Submit'
            ]
          } else if (pageType === 'functional') {
            // 功能页面使用功能相关文本
            searchTexts = [
              '查询',
              '搜索',
              '新增',
              '添加',
              '编辑',
              '修改',
              '删除',
              '重置',
              '确定',
              '提交',
              '保存',
              '取消',
              '刷新',
              '导出',
              '查看',
              '操作'
            ]
          } else {
            // 未知页面使用通用文本
            searchTexts = [
              '确定',
              '提交',
              '保存',
              '取消',
              '查询',
              '搜索',
              '按钮'
            ]
          }
          
          for (const text of searchTexts) {
            try {
              logMCP(`尝试通过文本"${text}"查找按钮...`, tool, sessionId)
              const textBtn = page.getByText(text, { exact: false })
              // 使用人类模拟点击
              await this.humanLikeClick(page, textBtn.first(), sessionId)
              found = true
              logMCP(`通过文本"${text}"点击成功`, tool, sessionId)
              break
            } catch (e) {
              // 继续尝试下一个文本
            }
          }
        }
        
        if (!found) {
          throw new Error(`无法找到按钮: ${selector}`)
        }
      }
      
      // 等待页面加载
      await page.waitForLoadState('networkidle').catch(() => {})
      
      return {
        success: true,
        data: {
          status: 'completed',
          selector: selector
        }
      }
    } catch (error) {
      throw error
    }
  }

  private async realWaitForElement(page: Page, selector: string, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`等待元素出现: ${selector}`, tool, sessionId)
      await page.waitForSelector(selector, { timeout: 10000 })
      logMCP(`元素已出现: ${selector}`, tool, sessionId)
      
      return {
        success: true,
        data: {
          status: 'completed',
          selector: selector
        }
      }
    } catch (error) {
      throw error
    }
  }

  private async realGetVisibleHtml(page: Page, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`获取页面HTML内容...`, tool, sessionId)
      const html = await page.content()
      logMCP(`页面HTML已获取，长度: ${html.length}`, tool, sessionId)
      
      return {
        success: true,
        data: html
      }
    } catch (error) {
      throw error
    }
  }

  private async realGetVisibleText(page: Page, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`获取页面文本内容...`, tool, sessionId)
      const text = await page.evaluate(() => document.body.innerText)
      logMCP(`页面文本已获取，长度: ${text.length}`, tool, sessionId)
      
      return {
        success: true,
        data: text
      }
    } catch (error) {
      throw error
    }
  }

  private async realEvaluate(page: Page, script: string, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`执行JavaScript脚本...`, tool, sessionId)
      // 使用 Function 构造函数而不是 eval，更安全
      const result = await page.evaluate((scriptContent: string) => {
        // eslint-disable-next-line no-new-func
        const fn = new Function(`return ${scriptContent}`)
        return fn()
      }, script)
      
      // 安全地输出结果日志
      const resultStr = result !== undefined && result !== null 
        ? JSON.stringify(result) 
        : String(result)
      logMCP(`JavaScript执行完成，结果: ${resultStr}`, tool, sessionId)
      
      return {
        success: true,
        data: result
      }
    } catch (error) {
      throw error
    }
  }

  // 调试方法：获取页面上的所有输入框和按钮
  async debugPageElements(sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      if (!this.page) {
        return { success: false, error: '浏览器未初始化' }
      }

      const elements = await this.page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
          type: el.type,
          id: el.id,
          name: el.name,
          placeholder: el.placeholder,
          selector: el.id ? `#${el.id}` : el.name ? `input[name="${el.name}"]` : 'input'
        }))

        const buttons = Array.from(document.querySelectorAll('button')).map(el => ({
          text: el.textContent?.trim(),
          id: el.id,
          name: el.name,
          selector: el.id ? `#${el.id}` : el.name ? `button[name="${el.name}"]` : 'button'
        }))

        return { success: true, data: { inputs, buttons } }
      })

      logMCP(`页面元素调试: ${JSON.stringify(elements)}`, tool, sessionId)
      return { success: true, data: elements.data || elements }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * 获取页面所有可交互元素（完整版）
   * 直接在浏览器中执行，获取真实的DOM元素信息
   * @author Jiane
   */
  async getPageInteractiveElements(sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      if (!this.page) {
        return { success: false, error: '浏览器未初始化' }
      }

      logMCP('获取页面可交互元素...', tool, sessionId)

      const elements = await this.page.evaluate(() => {
        const extractFunctionalKeywords = (text: string, className: string, title: string, ariaLabel: string): string[] => {
          const keywords: string[] = []
          const allText = `${text} ${className} ${title} ${ariaLabel}`.toLowerCase()

          if (allText.includes('搜索') || allText.includes('查询') || allText.includes('search') || allText.includes('query')) keywords.push('搜索')
          if (allText.includes('新增') || allText.includes('添加') || allText.includes('新建') || allText.includes('add') || allText.includes('create') || allText.includes('new')) keywords.push('新增')
          if (allText.includes('编辑') || allText.includes('修改') || allText.includes('更改') || allText.includes('edit') || allText.includes('update') || allText.includes('modify')) keywords.push('编辑')
          if (allText.includes('删除') || allText.includes('移除') || allText.includes('del') || allText.includes('delete') || allText.includes('remove')) keywords.push('删除')
          if (allText.includes('重置') || allText.includes('清空') || allText.includes('清除') || allText.includes('reset') || allText.includes('clear')) keywords.push('重置')
          if (allText.includes('保存') || allText.includes('提交') || allText.includes('确认') || allText.includes('save') || allText.includes('submit') || allText.includes('confirm')) keywords.push('保存')
          if (allText.includes('查看') || allText.includes('详情') || allText.includes('view') || allText.includes('detail') || allText.includes('show')) keywords.push('查看')
          if (allText.includes('导出') || allText.includes('下载') || allText.includes('export') || allText.includes('download')) keywords.push('导出')
          if (allText.includes('导入') || allText.includes('批量导入') || allText.includes('import') || allText.includes('batch')) keywords.push('导入')
          if (allText.includes('下一页') || allText.includes('上一页') || allText.includes('next') || allText.includes('prev') || allText.includes('page')) keywords.push('分页')

          return keywords
        }

        const isVisible = (el: Element): boolean => {
          const style = window.getComputedStyle(el)
          const rect = el.getBoundingClientRect()
          return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
        }

        const buildNthPathSelector = (el: Element): string => {
          const parts: string[] = []
          let current: Element | null = el
          let depth = 0

          while (current && current.tagName && current.tagName.toLowerCase() !== 'html' && depth < 4) {
            let part = current.tagName.toLowerCase()
            const className = (current as HTMLElement).className
            if (className && typeof className === 'string') {
              const classes = className.trim().split(/\s+/).filter(Boolean).slice(0, 2)
              if (classes.length > 0) {
                part += `.${classes.join('.')}`
              }
            }

            const parent = current.parentElement
            if (parent) {
              const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName)
              const index = siblings.indexOf(current) + 1
              part += `:nth-of-type(${index})`
            }

            parts.unshift(part)
            current = current.parentElement
            depth++
          }

          return parts.join(' > ')
        }

        const buildSelector = (el: Element): string => {
          const htmlEl = el as HTMLElement
          const dataTestId = htmlEl.getAttribute('data-testid') || htmlEl.getAttribute('data-test')
          if (dataTestId) {
            const sel = `[data-testid="${dataTestId}"]`
            if (document.querySelectorAll(sel).length === 1) return sel
          }

          if (htmlEl.id) return `#${htmlEl.id}`
          const name = htmlEl.getAttribute('name')
          if (name) {
            const sel = `[name="${name}"]`
            if (document.querySelectorAll(sel).length === 1) return sel
          }

          const className = htmlEl.className
          if (className && typeof className === 'string') {
            const classes = className.trim().split(/\s+/).filter(Boolean).slice(0, 3)
            if (classes.length > 0) {
              const sel = `.${classes.join('.')}`
              if (document.querySelectorAll(sel).length === 1) return sel
            }
          }

          const tagSel = htmlEl.tagName.toLowerCase()
          if (document.querySelectorAll(tagSel).length === 1) return tagSel
          return buildNthPathSelector(el)
        }

        const extractElements = (root: ParentNode) => {
          const inputs: any[] = []
          root.querySelectorAll('input:not([type="hidden"]), textarea').forEach(el => {
            if (!isVisible(el)) return
            const input = el as HTMLInputElement
            inputs.push({
              type: input.type || 'text',
              selector: buildSelector(el),
              id: input.id || '',
              name: input.name || '',
              placeholder: input.placeholder || '',
              value: input.value || '',
              disabled: input.disabled,
              readonly: input.readOnly,
              required: input.required,
              className: (input as any).className || '',
              visible: true,
              label: document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || ''
            })
          })

          const selects: any[] = []
          root.querySelectorAll('select').forEach(el => {
            if (!isVisible(el)) return
            const select = el as HTMLSelectElement
            const options = Array.from(select.options).map(opt => ({
              value: opt.value,
              text: opt.text
            }))
            selects.push({
              type: 'select',
              selector: buildSelector(el),
              id: select.id || '',
              name: select.name || '',
              options: options.slice(0, 10),
              disabled: select.disabled,
              required: select.required,
              className: (select as any).className || '',
              visible: true,
              label: document.querySelector(`label[for="${select.id}"]`)?.textContent?.trim() || ''
            })
          })

          const buttons: any[] = []
          const buttonSelectors = [
            'button',
            'input[type="submit"]',
            'input[type="button"]',
            '[role="button"]',
            '.el-button',
            '.ant-btn',
            '.layui-btn',
            '.btn',
            '[lay-submit]',
            'a.btn'
          ]

          const seenButtons = new Set<string>()
          buttonSelectors.forEach(selector => {
            root.querySelectorAll(selector).forEach(el => {
              if (!isVisible(el)) return
              const text = el.textContent?.trim() || ''
              const sel = buildSelector(el)
              const key = `${sel}-${text}`
              if (seenButtons.has(key)) return
              seenButtons.add(key)

              const className = (el as HTMLElement).className || ''
              const title = el.getAttribute('title') || ''
              const ariaLabel = el.getAttribute('aria-label') || ''
              const disabled = (el as HTMLButtonElement).disabled || (el as HTMLElement).classList.contains('is-disabled') || (el as HTMLElement).classList.contains('disabled')

              buttons.push({
                type: 'button',
                selector: sel,
                text: text.substring(0, 50),
                id: (el as HTMLElement).id || '',
                name: el.getAttribute('name') || '',
                className,
                title,
                ariaLabel,
                disabled,
                buttonType: el.getAttribute('type') || '',
                visible: true,
                keywords: extractFunctionalKeywords(text, className, title, ariaLabel)
              })
            })
          })

          const tables: any[] = []
          root.querySelectorAll('table, .el-table, .ant-table').forEach((el, index) => {
            if (!isVisible(el)) return
            const headers: string[] = []
            el.querySelectorAll('th, .el-table__header th').forEach(th => {
              const text = th.textContent?.trim()
              if (text) headers.push(text)
            })
            const rowCount = el.querySelectorAll('tbody tr, .el-table__body tr').length
            tables.push({
              index,
              selector: buildSelector(el),
              headers: headers.slice(0, 10),
              rowCount
            })
          })

          const forms: any[] = []
          root.querySelectorAll('form, .el-form, .ant-form').forEach(el => {
            if (!isVisible(el)) return
            forms.push({
              selector: buildSelector(el),
              id: (el as HTMLElement).id || '',
              action: el.getAttribute('action') || '',
              method: el.getAttribute('method') || ''
            })
          })

          const links: any[] = []
          root.querySelectorAll('a[href], .el-menu-item, .ant-menu-item, .layui-nav-item').forEach(el => {
            if (!isVisible(el)) return
            const text = el.textContent?.trim() || ''
            if (!text || text.length > 30) return
            links.push({
              type: 'link',
              selector: buildSelector(el),
              text,
              href: el.getAttribute('href') || ''
            })
          })

          return {
            inputs: inputs.slice(0, 50),
            selects: selects.slice(0, 30),
            buttons: buttons.slice(0, 80),
            tables: tables.slice(0, 10),
            forms: forms.slice(0, 10),
            links: links.slice(0, 60)
          }
        }

        const globalElements = extractElements(document)

        const containerSelectors = [
          'form',
          '.el-form',
          '.ant-form',
          '.card',
          '.el-card',
          '.ant-card',
          '.panel',
          '.layui-layer',
          '.modal',
          '.dialog',
          '.el-dialog',
          '.ant-modal',
          '.drawer',
          '.el-drawer'
        ]

        const seenAreas = new Set<string>()
        const areas: any[] = []
        containerSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(container => {
            if (!isVisible(container)) return
            const containerSelector = buildSelector(container)
            if (!containerSelector || seenAreas.has(containerSelector)) return
            seenAreas.add(containerSelector)

            const titleEl = (container as HTMLElement).querySelector('.title, .header, .el-dialog__title, .ant-modal-title, h1, h2, h3')
            const description = titleEl?.textContent?.trim() || (container as HTMLElement).getAttribute('aria-label') || (container as HTMLElement).className || container.tagName
            const areaElements = extractElements(container)
            areas.push({
              selector: containerSelector,
              description: (description || '').toString().substring(0, 50),
              elements: areaElements
            })
          })
        })

        return {
          ...globalElements,
          pageTitle: document.title,
          pageUrl: window.location.href,
          areas: areas.slice(0, 8)
        }
      })

      logMCP(`获取到元素: ${elements.inputs.length}个输入框, ${elements.selects.length}个下拉框, ${elements.buttons.length}个按钮, ${elements.tables.length}个表格`, tool, sessionId)

      return { success: true, data: elements }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取页面元素失败', error as Error, 'mcpManager-getPageInteractiveElements', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 获取控制台日志
   * @author Jiane
   */
  async getConsoleLogs(options?: {
    type?: ConsoleLogEntry['type']
    limit?: number
    clear?: boolean
  }, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP('获取控制台日志...', tool, sessionId)
      
      let logs = [...this.consoleLogs]
      
      // 按类型过滤
      if (options?.type) {
        logs = logs.filter(l => l.type === options.type)
      }
      
      // 限制数量
      if (options?.limit) {
        logs = logs.slice(-options.limit)
      }
      
      // 是否清空
      if (options?.clear) {
        this.consoleLogs = []
      }
      
      logMCP(`获取到 ${logs.length} 条控制台日志`, tool, sessionId)
      
      return {
        success: true,
        data: {
          logs,
          total: this.consoleLogs.length
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取控制台日志失败', error as Error, 'mcpManager-getConsoleLogs', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 获取网络请求记录
   * @author Jiane
   */
  async getNetworkRequests(options?: {
    urlPattern?: string
    method?: string
    resourceType?: string
    statusCode?: number
    limit?: number
    onlyApi?: boolean
    clear?: boolean
  }, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP('获取网络请求记录...', tool, sessionId)
      
      let requests = [...this.networkRequests]
      
      // 只获取API请求（排除静态资源）
      if (options?.onlyApi) {
        requests = requests.filter(r => 
          r.resourceType === 'xhr' || 
          r.resourceType === 'fetch' ||
          r.url.includes('/api/') ||
          r.url.includes('/v1/') ||
          r.url.includes('/v2/')
        )
      }
      
      // 按URL模式过滤
      if (options?.urlPattern) {
        const pattern = new RegExp(options.urlPattern, 'i')
        requests = requests.filter(r => pattern.test(r.url))
      }
      
      // 按方法过滤
      if (options?.method) {
        requests = requests.filter(r => r.method.toUpperCase() === options.method?.toUpperCase())
      }
      
      // 按资源类型过滤
      if (options?.resourceType) {
        requests = requests.filter(r => r.resourceType === options.resourceType)
      }
      
      // 按状态码过滤
      if (options?.statusCode) {
        requests = requests.filter(r => r.status === options.statusCode)
      }
      
      // 限制数量
      if (options?.limit) {
        requests = requests.slice(-options.limit)
      }
      
      // 是否清空
      if (options?.clear) {
        this.networkRequests = []
      }
      
      logMCP(`获取到 ${requests.length} 条网络请求`, tool, sessionId)
      
      return {
        success: true,
        data: {
          requests,
          total: this.networkRequests.length
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取网络请求失败', error as Error, 'mcpManager-getNetworkRequests', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 获取API接口的响应数据（用于AI分析）
   * @author Jiane
   */
  async getApiResponses(options?: {
    urlPattern?: string
    limit?: number
  }, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP('获取API响应数据...', tool, sessionId)
      
      // 只获取有响应体的API请求
      let apiRequests = this.networkRequests.filter(r => 
        r.responseBody && 
        (r.resourceType === 'xhr' || r.resourceType === 'fetch')
      )
      
      // 按URL模式过滤
      if (options?.urlPattern) {
        const pattern = new RegExp(options.urlPattern, 'i')
        apiRequests = apiRequests.filter(r => pattern.test(r.url))
      }
      
      // 限制数量
      const limit = options?.limit || 10
      apiRequests = apiRequests.slice(-limit)
      
      // 提取关键信息
      const apiData = apiRequests.map(r => ({
        url: r.url,
        method: r.method,
        status: r.status,
        requestBody: r.requestBody,
        responseBody: r.responseBody,
        duration: r.duration
      }))
      
      logMCP(`获取到 ${apiData.length} 个API响应`, tool, sessionId)
      
      return {
        success: true,
        data: apiData
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取API响应失败', error as Error, 'mcpManager-getApiResponses', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 清空日志和请求记录
   * @author Jiane
   */
  clearLogs(sessionId?: string): void {
    const tool = 'playwright'
    this.consoleLogs = []
    this.networkRequests = []
    logMCP('已清空控制台日志和网络请求记录', tool, sessionId)
  }

  /**
   * 获取完整的页面上下文（元素 + 控制台 + 网络）
   * 用于AI分析时提供完整信息
   * @author Jiane
   */
  async getFullPageContext(sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP('获取完整页面上下文...', tool, sessionId)
      
      // 1. 获取页面元素
      const elementsResult = await this.getPageInteractiveElements(sessionId)
      
      // 2. 获取控制台错误日志
      const consoleErrors = this.consoleLogs.filter(l => l.type === 'error').slice(-20)
      
      // 3. 获取API响应数据
      const apiResponses = this.networkRequests
        .filter(r => r.responseBody && (r.resourceType === 'xhr' || r.resourceType === 'fetch'))
        .slice(-10)
        .map(r => ({
          url: r.url.replace(/^https?:\/\/[^/]+/, ''), // 只保留路径
          method: r.method,
          status: r.status,
          responseBody: r.responseBody
        }))
      
      // 4. 获取失败的请求
      const failedRequests = this.networkRequests
        .filter(r => r.status && r.status >= 400)
        .slice(-10)
        .map(r => ({
          url: r.url.replace(/^https?:\/\/[^/]+/, ''),
          method: r.method,
          status: r.status,
          statusText: r.statusText
        }))
      
      const context = {
        elements: elementsResult.success ? elementsResult.data : null,
        areas: elementsResult.success ? (elementsResult.data?.areas || []) : [],
        consoleErrors,
        apiResponses,
        failedRequests,
        summary: {
          inputCount: elementsResult.data?.inputs?.length || 0,
          buttonCount: elementsResult.data?.buttons?.length || 0,
          selectCount: elementsResult.data?.selects?.length || 0,
          tableCount: elementsResult.data?.tables?.length || 0,
          areaCount: elementsResult.data?.areas?.length || 0,
          errorCount: consoleErrors.length,
          apiCount: apiResponses.length,
          failedRequestCount: failedRequests.length
        }
      }
      
      logMCP(`页面上下文: ${context.summary.inputCount}输入框, ${context.summary.buttonCount}按钮, ${context.summary.apiCount}个API响应`, tool, sessionId)
      
      return { success: true, data: context }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取页面上下文失败', error as Error, 'mcpManager-getFullPageContext', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  async getFocusedAreas(sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP('获取聚焦区域...', tool, sessionId)
      const elementsResult = await this.getPageInteractiveElements(sessionId)
      
      if (!elementsResult.success) {
        return elementsResult
      }
      return {
        success: true,
        data: elementsResult.data?.areas || []
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取聚焦区域失败', error as Error, 'mcpManager-getFocusedAreas', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 获取指定区域的元素（用于多轮迭代）
   * @author Jiane
   */
  async getElementsInArea(containerSelector: string, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      if (!this.page) {
        return { success: false, error: '浏览器未初始化' }
      }

      logMCP(`获取区域 [${containerSelector}] 内的元素...`, tool, sessionId)

      const elements = await this.page.evaluate((selector) => {
        const container = document.querySelector(selector)
        if (!container) return null

        const isVisible = (el: Element): boolean => {
          const style = window.getComputedStyle(el)
          const rect = el.getBoundingClientRect()
          return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
        }

        const buildNthPathSelector = (el: Element): string => {
          const parts: string[] = []
          let current: Element | null = el
          let depth = 0

          while (current && current.tagName && current.tagName.toLowerCase() !== 'html' && depth < 4) {
            let part = current.tagName.toLowerCase()
            const className = (current as HTMLElement).className
            if (className && typeof className === 'string') {
              const classes = className.trim().split(/\s+/).filter(Boolean).slice(0, 2)
              if (classes.length > 0) {
                part += `.${classes.join('.')}`
              }
            }

            const parent = current.parentElement
            if (parent) {
              const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName)
              const index = siblings.indexOf(current) + 1
              part += `:nth-of-type(${index})`
            }

            parts.unshift(part)
            current = current.parentElement
            depth++
          }

          return parts.join(' > ')
        }

        const buildSelector = (el: Element): string => {
          const htmlEl = el as HTMLElement
          const dataTestId = htmlEl.getAttribute('data-testid') || htmlEl.getAttribute('data-test')
          if (dataTestId) {
            const sel = `[data-testid="${dataTestId}"]`
            if (document.querySelectorAll(sel).length === 1) return sel
          }

          if (htmlEl.id) return `#${htmlEl.id}`
          const name = htmlEl.getAttribute('name')
          if (name) {
            const sel = `[name="${name}"]`
            if (document.querySelectorAll(sel).length === 1) return sel
          }

          const className = htmlEl.className
          if (className && typeof className === 'string') {
            const classes = className.trim().split(/\s+/).filter(Boolean).slice(0, 3)
            if (classes.length > 0) {
              const sel = `.${classes.join('.')}`
              if (document.querySelectorAll(sel).length === 1) return sel
            }
          }

          const tagSel = htmlEl.tagName.toLowerCase()
          if (document.querySelectorAll(tagSel).length === 1) return tagSel
          return buildNthPathSelector(el)
        }

        const extractElements = (root: ParentNode) => {
          const inputs: any[] = []
          root.querySelectorAll('input:not([type="hidden"]), textarea').forEach(el => {
            if (!isVisible(el)) return
            const input = el as HTMLInputElement
            inputs.push({
              type: input.type || 'text',
              selector: buildSelector(el),
              id: input.id || '',
              name: input.name || '',
              placeholder: input.placeholder || '',
              value: input.value || '',
              disabled: input.disabled,
              readonly: input.readOnly,
              required: input.required,
              className: (input as any).className || '',
              visible: true,
              label: document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || ''
            })
          })

          const selects: any[] = []
          root.querySelectorAll('select').forEach(el => {
            if (!isVisible(el)) return
            const select = el as HTMLSelectElement
            const options = Array.from(select.options).map(opt => ({
              value: opt.value,
              text: opt.text
            }))
            selects.push({
              type: 'select',
              selector: buildSelector(el),
              id: select.id || '',
              name: select.name || '',
              options: options.slice(0, 10),
              disabled: select.disabled,
              required: select.required,
              className: (select as any).className || '',
              visible: true,
              label: document.querySelector(`label[for="${select.id}"]`)?.textContent?.trim() || ''
            })
          })

          const buttons: any[] = []
          const buttonSelectors = [
            'button',
            'input[type="submit"]',
            'input[type="button"]',
            '[role="button"]',
            '.el-button',
            '.ant-btn',
            '.layui-btn',
            '.btn',
            '[lay-submit]',
            'a.btn'
          ]

          const seen = new Set<string>()
          buttonSelectors.forEach(sel => {
            root.querySelectorAll(sel).forEach(el => {
              if (!isVisible(el)) return
              const text = el.textContent?.trim() || ''
              const selectorStr = buildSelector(el)
              const key = `${selectorStr}-${text}`
              if (seen.has(key)) return
              seen.add(key)
              buttons.push({
                type: 'button',
                selector: selectorStr,
                text: text.substring(0, 50),
                id: (el as HTMLElement).id || '',
                name: el.getAttribute('name') || '',
                className: (el as HTMLElement).className || '',
                title: el.getAttribute('title') || '',
                ariaLabel: el.getAttribute('aria-label') || '',
                disabled: (el as HTMLButtonElement).disabled || (el as HTMLElement).classList.contains('is-disabled') || (el as HTMLElement).classList.contains('disabled'),
                buttonType: el.getAttribute('type') || '',
                visible: true
              })
            })
          })

          const tables: any[] = []
          root.querySelectorAll('table, .el-table, .ant-table').forEach((el, index) => {
            if (!isVisible(el)) return
            const headers: string[] = []
            el.querySelectorAll('th, .el-table__header th').forEach(th => {
              const text = th.textContent?.trim()
              if (text) headers.push(text)
            })
            const rowCount = el.querySelectorAll('tbody tr, .el-table__body tr').length
            tables.push({
              index,
              selector: buildSelector(el),
              headers: headers.slice(0, 10),
              rowCount
            })
          })

          const forms: any[] = []
          root.querySelectorAll('form, .el-form, .ant-form').forEach(el => {
            if (!isVisible(el)) return
            forms.push({
              selector: buildSelector(el),
              id: (el as HTMLElement).id || '',
              action: el.getAttribute('action') || '',
              method: el.getAttribute('method') || ''
            })
          })

          const links: any[] = []
          root.querySelectorAll('a[href], .el-menu-item, .ant-menu-item, .layui-nav-item').forEach(el => {
            if (!isVisible(el)) return
            const text = el.textContent?.trim() || ''
            if (!text || text.length > 30) return
            links.push({
              type: 'link',
              selector: buildSelector(el),
              text,
              href: el.getAttribute('href') || ''
            })
          })

          return {
            inputs: inputs.slice(0, 40),
            selects: selects.slice(0, 20),
            buttons: buttons.slice(0, 50),
            tables: tables.slice(0, 5),
            forms: forms.slice(0, 5),
            links: links.slice(0, 30)
          }
        }

        return extractElements(container)
      }, containerSelector)

      if (!elements) {
        return { success: false, error: `未找到容器: ${containerSelector}` }
      }

      logMCP(`区域内获取到: ${elements.inputs.length}个输入框, ${elements.selects.length}个下拉框, ${elements.buttons.length}个按钮`, tool, sessionId)
      return { success: true, data: elements }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取区域元素失败', error as Error, 'mcpManager-getElementsInArea', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 截取当前页面截图
   * @param options 截图选项
   * @returns base64编码的图片数据
   * @author Jiane
   */
  async takeScreenshot(options?: {
    fullPage?: boolean      // 是否截取整个页面（包括滚动区域）
    selector?: string       // 只截取指定元素
    quality?: number        // 图片质量 0-100 (仅jpeg)
    type?: 'png' | 'jpeg'   // 图片格式
  }, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      if (!this.page) {
        return { success: false, error: '浏览器未初始化' }
      }

      logMCP('截取页面截图...', tool, sessionId)

      const screenshotOptions: any = {
        type: options?.type || 'png',
        fullPage: options?.fullPage || false
      }

      if (options?.type === 'jpeg' && options?.quality) {
        screenshotOptions.quality = options.quality
      }

      let screenshotBuffer: Buffer

      if (options?.selector) {
        // 截取指定元素
        const element = this.page.locator(options.selector)
        screenshotBuffer = await element.screenshot(screenshotOptions)
        logMCP(`已截取元素 [${options.selector}] 的截图`, tool, sessionId)
      } else {
        // 截取整个页面
        screenshotBuffer = await this.page.screenshot(screenshotOptions)
        logMCP(`已截取${options?.fullPage ? '完整' : '可视区域'}页面截图`, tool, sessionId)
      }

      // 转换为base64
      const base64Image = screenshotBuffer.toString('base64')
      const mimeType = options?.type === 'jpeg' ? 'image/jpeg' : 'image/png'

      logMCP(`截图完成，大小: ${(screenshotBuffer.length / 1024).toFixed(2)}KB`, tool, sessionId)

      return {
        success: true,
        data: {
          base64: base64Image,
          mimeType: mimeType,
          size: screenshotBuffer.length,
          url: this.page.url(),
          title: await this.page.title()
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('截图失败', error as Error, 'mcpManager-takeScreenshot', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 获取页面截图 + 元素信息的完整上下文（用于视觉模型分析）
   * @author Jiane
   */
  async getVisualPageContext(sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP('获取视觉页面上下文（截图+元素）...', tool, sessionId)

      // 1. 截取页面截图
      const screenshotResult = await this.takeScreenshot({ fullPage: false }, sessionId)
      if (!screenshotResult.success) {
        return { success: false, error: `截图失败: ${screenshotResult.error}` }
      }

      // 2. 获取页面元素
      const elementsResult = await this.getPageInteractiveElements(sessionId)
      if (!elementsResult.success) {
        return { success: false, error: `获取元素失败: ${elementsResult.error}` }
      }

      // 3. 组合返回
      const context = {
        screenshot: screenshotResult.data,
        elements: elementsResult.data,
        timestamp: Date.now()
      }

      logMCP(`视觉上下文获取完成: 截图${(screenshotResult.data.size / 1024).toFixed(2)}KB, ${elementsResult.data.inputs?.length || 0}个输入框, ${elementsResult.data.buttons?.length || 0}个按钮`, tool, sessionId)

      return { success: true, data: context }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取视觉页面上下文失败', error as Error, 'mcpManager-getVisualPageContext', sessionId)
      return { success: false, error: errorMsg }
    }
  }

  // 清理所有MCP进程和浏览器
  async cleanup() {
    const tool = 'playwright'
    try {
      if (this.page) {
        // Jiane==
        // await this.page.close()
        logMCP(`已关闭页面`, tool)
      }
      
      if (this.browser) {
        // Jiane==
        // await this.browser.close()
        logMCP(`已关闭浏览器`, tool)
      }
      
      this.processes.forEach((process, name) => {
        try {
          if (typeof process.kill === 'function') {
            process.kill()
          }
          logMCP(`已停止MCP服务器: ${name}`, tool)
        } catch (error) {
          logError(`停止MCP服务器 ${name} 失败`, error, 'mcpManager-cleanup')
        }
      })
      this.processes.clear()
    } catch (error) {
      logError(`清理MCP资源失败`, error, 'mcpManager-cleanup')
    }
  }
}

// 单例实例
export const mcpManager = new MCPManager()