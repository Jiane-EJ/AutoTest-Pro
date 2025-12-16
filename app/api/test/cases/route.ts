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
        requirement: '完整测试/community/list下的功能',
        steps: 12,
        lastRun: '2025-12-16 10:04:15',
        status: 'running'
      },
      {
        id: 2,
        name: '社区列表功能测试',
        description: '测试社区列表页面功能',
        url: 'https://wyt-pf-test.fuioupay.com/#/community/list',
        username: 'xwytlb001',
        password: '888888',
        requirement: '验证列表加载、搜索、分页功能',
        steps: 8,
        lastRun: '2025-12-16 09:30:00',
        status: 'completed'
      },
      {
        id: 3,
        name: '用户信息编辑测试',
        description: '测试用户信息修改功能',
        url: 'https://wyt-pf-test.fuioupay.com/#/user/profile',
        username: 'xwytlb001',
        password: '888888',
        requirement: '验证表单验证、提交、保存功能',
        steps: 6,
        lastRun: '2025-12-16 08:15:00',
        status: 'pending'
      }
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
