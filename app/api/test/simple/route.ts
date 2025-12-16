import { NextRequest, NextResponse } from 'next/server'

import { sessionManager, TestConfig } from '@/utils/testSession'
import { runAITest } from '@/lib/aiTestRunner'
import { logSystem } from '@/lib/logger'

// 简化的测试端点，用于验证主线流程
export async function POST(request: NextRequest) {
  try {
    let config: TestConfig
    
    try {
      const bodyText = await request.text()
      if (!bodyText || bodyText.trim() === '') {
        return NextResponse.json(
          { error: 'Request body is empty. Please provide test configuration.' },
          { status: 400 }
        )
      }
      
      config = JSON.parse(bodyText)
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body. Please provide valid JSON configuration.' },
        { status: 400 }
      )
    }
    
    // 验证配置
    if (!config.url || !config.username || !config.password || !config.requirement) {
      return NextResponse.json(
        { error: 'Missing required fields: url, username, password, and requirement are required' },
        { status: 400 }
      )
    }

    logSystem(`收到测试请求: ${config.url}`, 'test-session')

    // 创建测试会话
    const session = await sessionManager.createSession(config)
    
    logSystem(`测试会话已启动: ${session.sessionId}`, session.sessionId)
    
    // 启动AI测试流程（异步）
    runAITest(session.sessionId, config).catch(error => {
      logSystem(`测试执行失败: ${error.message}`, session.sessionId)
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

// 获取测试状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
    const session = sessionManager.getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      sessionId: session.sessionId,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    })
    
  } catch (error) {
    console.error('获取测试状态失败:', error)
    return NextResponse.json(
      { error: 'Failed to get test status' },
      { status: 500 }
    )
  }
}