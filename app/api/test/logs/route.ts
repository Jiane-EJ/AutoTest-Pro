import { NextRequest, NextResponse } from 'next/server'

// 获取测试日志列表
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // 模拟返回日志数据
    const logs = [
      { timestamp: '10:04:15', type: 'system', message: '会话初始化完成。ID: #8492-A' },
      { timestamp: '10:04:16', type: 'system', message: '浏览器已启动 (无头模式: 关闭)' },
      { timestamp: '10:04:18', type: 'ai', message: '分析页面结构中... 发现 14 个交互元素。目标定位: "登录"。' },
      { timestamp: '10:04:20', type: 'mcp', message: '工具调用: click_element(selector="#login-btn", wait_for_nav=true)' },
      { timestamp: '10:04:22', type: 'system', message: '开始页面跳转...' },
      { timestamp: '10:04:23', type: 'ai', message: '检测到页面加载延迟，动态调整等待超时时间 (+2s)。' },
      { timestamp: '10:04:24', type: 'ai', message: '正在扫描输入框 "username"...' },
      { timestamp: '10:04:25', type: 'system', message: '等待 MCP 工具响应...', isWaiting: true }
    ]

    return NextResponse.json({
      success: true,
      data: logs,
      total: logs.length
    })
  } catch (error) {
    console.error('获取日志失败:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
