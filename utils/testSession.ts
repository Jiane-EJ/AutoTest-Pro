import { createSession, updateSessionStatus as dbUpdateSessionStatus, getSession as dbGetSession } from '@/lib/db'
import { logSystem } from '@/lib/logger'

export interface TestConfig {
  url: string
  username: string
  password: string
  requirement: string
}

export interface TestSession {
  sessionId: string
  config: TestConfig
  status: 'pending' | 'running' | 'paused' | 'completed' | 'error'
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export class TestSessionManager {
  private sessions = new Map<string, TestSession>()

  private generateSessionId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  async createSession(config: TestConfig): Promise<TestSession> {
    const sessionId = this.generateSessionId()
    
    const session: TestSession = {
      sessionId,
      config,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 保存到内存
    this.sessions.set(sessionId, session)
    
    // 保存到数据库
    createSession({
      session_id: sessionId,
      url: config.url,
      username: config.username,
      requirement: config.requirement,
      status: session.status,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString()
    })
    
    logSystem(`测试会话已创建: ${sessionId}`, 'testSession-createSession', sessionId)
    
    return session
  }

  async updateSessionStatus(sessionId: string, status: TestSession['status']): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }
    
    session.status = status
    session.updatedAt = new Date()
    
    if (status === 'completed') {
      session.completedAt = new Date()
    }
    
    // 更新数据库
    dbUpdateSessionStatus(sessionId, status)
    
    logSystem(`会话状态更新: ${status}`, 'testSession-updateSessionStatus', sessionId)
  }

  getSession(sessionId: string): TestSession | undefined {
    return this.sessions.get(sessionId)
  }

  getAllSessions(): TestSession[] {
    return Array.from(this.sessions.values())
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
    logSystem(`测试会话已删除: ${sessionId}`, 'testSession-deleteSession', sessionId)
  }
}

export const sessionManager = new TestSessionManager()
