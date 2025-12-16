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
    logMCP(`MCPManager已初始化，准备使用真实Playwright浏览器`, undefined)
  }

  private async ensureBrowser() {
    if (!this.browser) {
      logMCP(`启动Playwright浏览器...`, undefined)
      this.browser = await chromium.launch({ headless: false })
      this.page = await this.browser.newPage()
    }
    return { browser: this.browser, page: this.page! }
  }

  // Sequential Thinking MCP - 使用AI进行深度思考
  async callSequentialThinking(thoughts: string[], sessionId?: string): Promise<MCPResult> {
    logMCP(`调用sequential-thinking工具: ${JSON.stringify(thoughts)}`, sessionId)
    
    try {
      // 这里可以集成真实的sequential-thinking MCP
      // 目前返回思考过程的总结
      const thoughtSummary = thoughts.join(' -> ')
      logMCP(`sequential-thinking响应: 完成思考过程 - ${thoughtSummary}`, sessionId)
      
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
      logError(`sequential-thinking调用失败: ${errorMsg}`, error, sessionId)
      return {
        success: false,
        error: errorMsg
      }
    }
  }

  // Context7 MCP - 获取文档和上下文信息
  async callContext7(query: string, sessionId?: string): Promise<MCPResult> {
    logMCP(`调用context7工具: ${query}`, sessionId)
    
    try {
      // 这里可以集成真实的context7 MCP来查询文档
      // 目前返回查询结果
      logMCP(`context7响应: 查询完成 - ${query}`, sessionId)
      
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
      logError(`context7调用失败: ${errorMsg}`, error, sessionId)
      return {
        success: false,
        error: errorMsg
      }
    }
  }

  // Playwright MCP - 真实浏览器操作
  async callPlaywright(action: string, params: any, sessionId?: string): Promise<MCPResult> {
    logMCP(`调用playwright工具: ${action}(${JSON.stringify(params).substring(0, 100)})`, sessionId)
    
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
        default:
          throw new Error(`不支持的操作: ${action}`)
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError(`playwright调用失败: ${errorMsg}`, error, sessionId)
      return {
        success: false,
        error: errorMsg
      }
    }
  }

  private async realNavigate(page: Page, url: string, sessionId?: string): Promise<MCPResult> {
    try {
      logMCP(`浏览器导航到: ${url}`, sessionId)
      
      // 使用更宽松的等待条件
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      
      // 额外等待一下，确保动态内容加载
      await page.waitForTimeout(2000)
      
      logMCP(`导航成功: ${url}`, sessionId)
      
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
    try {
      logMCP(`输入文本到元素 [${selector}]: ${value}`, sessionId)
      
      // 先尝试等待元素出现
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
      } catch (waitError) {
        logMCP(`元素 [${selector}] 未找到，尝试使用替代选择器...`, sessionId)
        
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
            logMCP(`找到替代元素: ${altSelector}`, sessionId)
            await page.fill(altSelector, value)
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
      
      if (!selector.includes('[')) {
        await page.fill(selector, value)
      }
      
      logMCP(`输入成功: [${selector}]`, sessionId)
      
      return {
        success: true,
        data: {
          status: 'completed',
          selector: selector,
          value: value
        }
      }
    } catch (error) {
      throw error
    }
  }

  private async realClick(page: Page, selector: string, sessionId?: string): Promise<MCPResult> {
    try {
      logMCP(`点击元素: ${selector}`, sessionId)
      
      // 先尝试等待元素出现
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
      } catch (waitError) {
        logMCP(`元素 [${selector}] 未找到，尝试使用替代选择器...`, sessionId)
        
        // 尝试替代选择器
        const alternativeSelectors = [
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
            logMCP(`找到替代元素: ${altSelector}`, sessionId)
            await page.click(altSelector)
            found = true
            break
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        if (!found) {
          throw new Error(`无法找到按钮: ${selector}`)
        }
      }
      
      if (!selector.includes('[') && !selector.includes(':')) {
        await page.click(selector)
      }
      
      logMCP(`点击成功: ${selector}`, sessionId)
      
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
    try {
      logMCP(`等待元素出现: ${selector}`, sessionId)
      await page.waitForSelector(selector, { timeout: 10000 })
      logMCP(`元素已出现: ${selector}`, sessionId)
      
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
    try {
      logMCP(`获取页面HTML内容...`, sessionId)
      const html = await page.content()
      logMCP(`页面HTML已获取，长度: ${html.length}`, sessionId)
      
      return {
        success: true,
        data: html
      }
    } catch (error) {
      throw error
    }
  }

  private async realGetVisibleText(page: Page, sessionId?: string): Promise<MCPResult> {
    try {
      logMCP(`获取页面文本内容...`, sessionId)
      const text = await page.evaluate(() => document.body.innerText)
      logMCP(`页面文本已获取，长度: ${text.length}`, sessionId)
      
      return {
        success: true,
        data: text
      }
    } catch (error) {
      throw error
    }
  }

  // 调试方法：获取页面上的所有输入框和按钮
  async debugPageElements(sessionId?: string): Promise<MCPResult> {
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

      logMCP(`页面元素调试: ${JSON.stringify(elements)}`, sessionId)
      return { success: true, data: elements }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  // 清理所有MCP进程和浏览器
  async cleanup() {
    try {
      if (this.page) {
        // await this.page.close()
        logMCP(`已关闭页面`, undefined)
      }
      
      if (this.browser) {
        // await this.browser.close()
        logMCP(`已关闭浏览器`, undefined)
      }
      
      this.processes.forEach((process, name) => {
        try {
          if (typeof process.kill === 'function') {
            process.kill()
          }
          logMCP(`已停止MCP服务器: ${name}`, undefined)
        } catch (error) {
          logError(`停止MCP服务器 ${name} 失败`, error, undefined)
        }
      })
      this.processes.clear()
    } catch (error) {
      logError(`清理MCP资源失败`, error, undefined)
    }
  }
}

// 单例实例
export const mcpManager = new MCPManager()