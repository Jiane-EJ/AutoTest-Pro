import { NextRequest, NextResponse } from 'next/server'

// 获取测试会话详情
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // 模拟返回会话数据
    const sessionData = {
      sessionId,
      testName: '登录流程验证',
      status: 'running',
      progress: 45,
      elapsedTime: '00:04:25',
      environment: '生产环境 (Production)',
      currentStep: 3,
      totalSteps: 12,
      startTime: '2025-12-16 10:00:00',
      estimatedEndTime: '2025-12-16 10:10:00'
    }

    return NextResponse.json({
      success: true,
      data: sessionData
    })
  } catch (error) {
    console.error('获取会话信息失败:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
