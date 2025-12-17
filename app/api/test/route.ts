import { NextRequest, NextResponse } from 'next/server'

import { sessionManager, TestConfig } from '@/utils/testSession'
import { runAITest } from '@/lib/aiTestRunner'
import { logSystem } from '@/lib/logger'
export async function POST(request: NextRequest) {
  try {
    const config: TestConfig = await request.json()
    
    // 验证配置
    if (!config.url || !config.username || !config.password || !config.requirement) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 创建测试会话
    const session = await sessionManager.createSession(config)
    
    logSystem(`测试会话已启动: ${session.sessionId}`, 'test/route-POST', session.sessionId)
    
    // 启动AI测试流程（异步）
    runAITest(session.sessionId, config).catch(error => {
      logSystem(`测试执行失败: ${error.message}`, 'test/route-POST', session.sessionId)
      sessionManager.updateSessionStatus(session.sessionId, 'error')
    })
    
    return NextResponse.json({
      sessionId: session.sessionId,
      status: 'started',
      config
    })
    
  } catch (error) {
    console.error('启动测试失败:', error)
    return NextResponse.json(
      { error: 'Failed to start test' },
      { status: 500 }
    )
  }
}
