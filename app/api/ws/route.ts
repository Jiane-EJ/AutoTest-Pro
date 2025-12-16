import { WebSocketServer, WebSocket } from 'ws'
import { NextRequest, NextResponse } from 'next/server'

import { logSystem } from '@/lib/logger'

// 扩展WebSocket类型以包含sessionId
interface ExtendedWebSocket extends WebSocket {
  sessionId?: string
}

interface WSMessage {
  type: string
  data: any
  sessionId?: string
}

let wss: WebSocketServer | null = null

// 获取或创建WebSocket服务器
function getWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ port: 3001 })
    
    wss.on('connection', (ws: ExtendedWebSocket, req) => {
      console.log('WebSocket client connected')
      logSystem('WebSocket 客户端已连接')

      ws.on('message', (message: string) => {
        try {
          const data: WSMessage = JSON.parse(message)
          console.log('Received message:', data)
          
          // 处理不同类型的消息
          switch (data.type) {
            case 'subscribe':
              // 订阅特定会话的更新
              ws.sessionId = data.sessionId
              ws.send(JSON.stringify({
                type: 'subscribed',
                sessionId: data.sessionId
              }))
              break
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }))
              break
          }
        } catch (error) {
          console.error('WebSocket message error:', error)
        }
      })

      ws.on('close', () => {
        console.log('WebSocket client disconnected')
        logSystem('WebSocket 客户端已断开')
      })

      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        logSystem(`WebSocket 错误: ${error.message}`)
      })
    })

    console.log('WebSocket server started on port 3001')
  }
  
  return wss
}

// 广播消息给所有客户端
export function broadcast(message: any, sessionId?: string) {
  const server = getWebSocketServer()
  
  server.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      // 如果指定了sessionId，只发送给订阅该会话的客户端
      if (!sessionId || client.sessionId === sessionId) {
        client.send(JSON.stringify(message))
      }
    }
  })
}

// GET handler for WebSocket upgrade
export async function GET(request: NextRequest) {
  // 初始化WebSocket服务器
  getWebSocketServer()
  
  return NextResponse.json({ 
    message: 'WebSocket server initialized on port 3001' 
  })
}

// POST handler for sending messages via HTTP
export async function POST(request: NextRequest) {
  try {
    const message = await request.json()
    broadcast(message, message.sessionId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Message broadcasted'
    })
  } catch (error) {
    console.error('Broadcast error:', error)
    return NextResponse.json(
      { error: 'Failed to broadcast message' },
      { status: 500 }
    )
  }
}
