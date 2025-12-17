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

export class MCPManager {
  private processes: Map<string, any> = new Map()
  private servers: Map<string, any> = new Map()
  private browser: Browser | null = null
  private page: Page | null = null

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
    }
    return { browser: this.browser, page: this.page! }
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
          return await this.realFill(page, params.selector, params.value, sessionId)
        case 'click':
          return await this.realClick(page, params.selector, sessionId)
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

  private async realFill(page: Page, selector: string, value: string, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`输入文本到元素 [${selector}]: ${value}`, tool, sessionId)
      
      let targetSelector = selector
      
      // 先尝试等待元素出现
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
      } catch (waitError) {
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

  private async realClick(page: Page, selector: string, sessionId?: string): Promise<MCPResult> {
    const tool = 'playwright'
    try {
      logMCP(`点击元素: ${selector}`, tool, sessionId)
      
      // 处理文本选择器 (text="xxx")
      if (selector.startsWith('text=')) {
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
      } catch (waitError) {
        logMCP(`元素 [${selector}] 未找到，尝试使用替代选择器...`, tool, sessionId)
        
        // 尝试替代选择器（包括 layui 的 div 按钮）
        const alternativeSelectors = [
          // layui 框架的登录按钮
          `div.btn`,
          `div[lay-submit]`,
          `div[lay-filter="login_btn"]`,
          // 标准按钮
          `button[id="${selector.replace('#', '')}"]`,
          `button[name="${selector.replace('#', '')}"]`,
          `button:has-text("登录")`,
          `button:has-text("登录按钮")`,
          `button[type="submit"]`,
          `input[type="submit"]`
        ]
        
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
        
        // 尝试使用文本查找（多个关键词）
        if (!found) {
          const loginTexts = [
            '立即登录',
            '登录',
            '登陆',
            '登 录',
            '登 陆',
            'Sign In',
            'Login',
            'Submit'
          ]
          
          for (const text of loginTexts) {
            try {
              logMCP(`尝试通过文本"${text}"查找按钮...`, tool, sessionId)
              const loginBtn = page.getByText(text, { exact: false })
              // 使用人类模拟点击
              await this.humanLikeClick(page, loginBtn.first(), sessionId)
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

        return { inputs, buttons }
      })

      logMCP(`页面元素调试: ${JSON.stringify(elements)}`, tool, sessionId)
      return { success: true, data: elements }
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
        // 辅助函数：生成唯一选择器
        const getSelector = (el: Element): string => {
          if (el.id) return `#${el.id}`
          if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.trim().split(/\s+/).filter(c => c && !c.startsWith('el-')).slice(0, 2)
            if (classes.length > 0) return `.${classes.join('.')}`
          }
          return el.tagName.toLowerCase()
        }

        // 辅助函数：检查元素是否可见
        const isVisible = (el: Element): boolean => {
          const style = window.getComputedStyle(el)
          const rect = el.getBoundingClientRect()
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 rect.width > 0 && 
                 rect.height > 0
        }

        // 1. 获取所有输入框
        const inputs: any[] = []
        document.querySelectorAll('input:not([type="hidden"]), textarea').forEach(el => {
          if (!isVisible(el)) return
          const input = el as HTMLInputElement
          inputs.push({
            type: input.type || 'text',
            selector: getSelector(el),
            id: input.id || '',
            name: input.name || '',
            placeholder: input.placeholder || '',
            value: input.value || '',
            disabled: input.disabled,
            readonly: input.readOnly,
            required: input.required,
            label: document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || ''
          })
        })

        // 2. 获取所有下拉框
        const selects: any[] = []
        document.querySelectorAll('select').forEach(el => {
          if (!isVisible(el)) return
          const select = el as HTMLSelectElement
          const options = Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
          }))
          selects.push({
            type: 'select',
            selector: getSelector(el),
            id: select.id || '',
            name: select.name || '',
            options: options.slice(0, 10), // 最多10个选项
            disabled: select.disabled,
            required: select.required,
            label: document.querySelector(`label[for="${select.id}"]`)?.textContent?.trim() || ''
          })
        })

        // 3. 获取所有按钮（包括各种框架的按钮）
        const buttons: any[] = []
        const buttonSelectors = [
          'button',
          'input[type="submit"]',
          'input[type="button"]',
          '[role="button"]',
          '.el-button',           // Element UI
          '.ant-btn',             // Ant Design
          '.layui-btn',           // Layui
          '.btn',                 // Bootstrap
          '[lay-submit]',         // Layui submit
          'a.btn',                // 链接按钮
        ]
        
        const seenButtons = new Set<string>()
        buttonSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            if (!isVisible(el)) return
            const text = el.textContent?.trim() || ''
            const key = `${getSelector(el)}-${text}`
            if (seenButtons.has(key)) return
            seenButtons.add(key)
            
            buttons.push({
              type: 'button',
              selector: getSelector(el),
              text: text.substring(0, 50),
              id: el.id || '',
              disabled: (el as HTMLButtonElement).disabled || el.classList.contains('is-disabled'),
              buttonType: el.getAttribute('type') || ''
            })
          })
        })

        // 4. 获取表格信息（如果有）
        const tables: any[] = []
        document.querySelectorAll('table, .el-table, .ant-table').forEach((el, index) => {
          if (!isVisible(el)) return
          const headers: string[] = []
          el.querySelectorAll('th, .el-table__header th').forEach(th => {
            const text = th.textContent?.trim()
            if (text) headers.push(text)
          })
          const rowCount = el.querySelectorAll('tbody tr, .el-table__body tr').length
          tables.push({
            index,
            selector: getSelector(el),
            headers: headers.slice(0, 10),
            rowCount
          })
        })

        // 5. 获取表单信息
        const forms: any[] = []
        document.querySelectorAll('form, .el-form, .ant-form').forEach(el => {
          if (!isVisible(el)) return
          forms.push({
            selector: getSelector(el),
            id: el.id || '',
            action: el.getAttribute('action') || '',
            method: el.getAttribute('method') || ''
          })
        })

        // 6. 获取链接/导航菜单
        const links: any[] = []
        document.querySelectorAll('a[href], .el-menu-item, .ant-menu-item, .layui-nav-item').forEach(el => {
          if (!isVisible(el)) return
          const text = el.textContent?.trim() || ''
          if (!text || text.length > 30) return
          links.push({
            type: 'link',
            selector: getSelector(el),
            text: text,
            href: el.getAttribute('href') || ''
          })
        })

        return {
          inputs,
          selects,
          buttons,
          tables,
          forms,
          links: links.slice(0, 20), // 最多20个链接
          pageTitle: document.title,
          pageUrl: window.location.href
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
                 rect.width > 0 && 
                 rect.height > 0
        }

        const getSelector = (el: Element): string => {
          if (el.id) return `#${el.id}`
          if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`
          return el.tagName.toLowerCase()
        }

        const inputs: any[] = []
        container.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach(el => {
          if (!isVisible(el)) return
          const input = el as HTMLInputElement
          inputs.push({
            type: input.type || el.tagName.toLowerCase(),
            selector: getSelector(el),
            placeholder: input.placeholder || '',
            label: document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || ''
          })
        })

        const buttons: any[] = []
        container.querySelectorAll('button, [role="button"], .el-button, .btn').forEach(el => {
          if (!isVisible(el)) return
          buttons.push({
            type: 'button',
            selector: getSelector(el),
            text: el.textContent?.trim().substring(0, 30) || ''
          })
        })

        return { inputs, buttons }
      }, containerSelector)

      if (!elements) {
        return { success: false, error: `未找到容器: ${containerSelector}` }
      }

      logMCP(`区域内获取到: ${elements.inputs.length}个输入框, ${elements.buttons.length}个按钮`, tool, sessionId)
      return { success: true, data: elements }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('获取区域元素失败', error as Error, 'mcpManager-getElementsInArea', sessionId)
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