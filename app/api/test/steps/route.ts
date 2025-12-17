import { NextRequest, NextResponse } from 'next/server'

// 获取测试步骤列表
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // 模拟返回步骤数据
    const steps = [
      {
        id: 1,
        title: '初始化浏览器环境',
        status: 'completed',
        duration: '00:02s',
        log: '浏览器环境初始化成功'
      },
      {
        id: 2,
        title: '导航至登陆页面',
        status: 'completed',
        duration: '00:05s',
        log: '成功导航到登录页面'
      },
      {
        id: 3,
        title: '识别并输入用户名',
        status: 'running',
        duration: null,
        log: 'AI 正在分析 DOM 结构以定位输入框...'
      },
      {
        id: 4,
        title: '输入密码',
        status: 'pending',
        duration: null,
        log: null
      },
      {
        id: 5,
        title: '点击登录按钮',
        status: 'pending',
        duration: null,
        log: null
      },
      {
        id: 6,
        title: '验证登录成功',
        status: 'pending',
        duration: null,
        log: null
      },
      {
        id: 7,
        title: '导航至 小区管理-小区信息管理',
        status: 'pending',
        duration: null,
        log: null
      },
      {
        id: 8,
        title: '分析页面功能',
        status: 'pending',
        duration: null,
        log: null
      },
      {
        id: 9,
        title: '执行功能测试',
        status: 'pending',
        duration: null,
        log: null
      },
      {
        id: 10,
        title: '验证测试结果',
        status: 'pending',
        duration: null,
        log: null
      },
      {
        id: 11,
        title: '生成测试报告',
        status: 'pending',
        duration: null,
        log: null
      },
      {
        id: 12,
        title: '清理测试环境',
        status: 'pending',
        duration: null,
        log: null
      }
    ]

    return NextResponse.json({
      success: true,
      data: steps,
      total: steps.length
    })
  } catch (error) {
    console.error('获取步骤列表失败:', error)
    return NextResponse.json(
      { error: 'Failed to fetch steps' },
      { status: 500 }
    )
  }
}
