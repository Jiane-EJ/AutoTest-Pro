import { NextRequest, NextResponse } from 'next/server'

import { sessionManager } from '@/utils/testSession'
import { logSystem } from '@/lib/logger'
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
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

    await sessionManager.updateSessionStatus(sessionId, 'completed')
    logSystem(`测试已停止: ${sessionId}`, 'test/stop/route-POST', sessionId)
    
    return NextResponse.json({
      sessionId,
      status: 'stopped'
    })
    
  } catch (error) {
    console.error('停止测试失败:', error)
    return NextResponse.json(
      { error: 'Failed to stop test' },
      { status: 500 }
    )
  }
}
