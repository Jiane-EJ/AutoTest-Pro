import { NextResponse } from 'next/server'

// 获取测试案例列表
export async function GET() {
  try {
    const testCases = [
      {
        id: 1,
        name: '登录流程验证',
        description: '完整测试登录功能',
        url: 'https://wyt-pf-test.fuioupay.com/#',
        username: 'xwytlb001',
        password: '888888',
        requirement: '完整测试小区管理-小区信息管理下的功能',
        steps: 12,
        lastRun: '2025-12-16 10:04:15',
        status: 'running'
      },
    ]

    return NextResponse.json({
      success: true,
      data: testCases,
      total: testCases.length
    })
  } catch (error) {
    console.error('获取测试案例失败:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test cases' },
      { status: 500 }
    )
  }
}
