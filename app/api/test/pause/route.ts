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

    await sessionManager.updateSessionStatus(sessionId, 'paused')
    logSystem(`测试已暂停: ${sessionId}`, sessionId)
    
    return NextResponse.json({
      sessionId,
      status: 'paused'
    })
    
  } catch (error) {
    console.error('暂停测试失败:', error)
    return NextResponse.json(
      { error: 'Failed to pause test' },
      { status: 500 }
    )
  }
}
