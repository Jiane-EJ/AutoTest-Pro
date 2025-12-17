#!/usr/bin/env node

/**
 * 真实场景测试脚本
 * @author Jiane
 * 
 * 用途：验证AI自动化测试平台的真实场景测试功能
 * 使用方式：node scripts/test-real-scenario.mjs
 */

import fetch from 'node-fetch'

const TEST_CONFIG = {
  url: process.env.TEST_URL,
  username: process.env.TEST_USERNAME || 'xwytlb001',
  password: process.env.TEST_PASSWORD || '888888',
  requirement: process.env.TEST_REQUIREMENT || '完整测试小区管理-小区信息管理下的功能'
}

const API_BASE = 'http://localhost:3000'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function startTest() {
  console.log('\n========== 开始真实场景测试 ==========')
  console.log('测试配置:')
  console.log(`  URL: ${TEST_CONFIG.url}`)
  console.log(`  用户名: ${TEST_CONFIG.username}`)
  console.log(`  需求: ${TEST_CONFIG.requirement}`)
  console.log('')

  try {
    // 1. 启动测试
    console.log('[1/3] 启动测试会话...')
    const startResponse = await fetch(`${API_BASE}/api/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CONFIG)
    })

    if (!startResponse.ok) {
      throw new Error(`启动测试失败: ${startResponse.status}`)
    }

    const startData = await startResponse.json()
    const sessionId = startData.sessionId

    console.log(`✓ 测试会话已创建: ${sessionId}\n`)

    // 2. 监控测试进度
    console.log('[2/3] 监控测试执行...')
    let isRunning = true
    let checkCount = 0
    const maxChecks = 120 // 最多检查120次（2分钟）

    while (isRunning && checkCount < maxChecks) {
      await sleep(1000)
      checkCount++

      try {
        const statusResponse = await fetch(
          `${API_BASE}/api/test/session?sessionId=${sessionId}`
        )

        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          const status = statusData.status

          if (status === 'completed' || status === 'error') {
            isRunning = false
            console.log(`✓ 测试已完成，状态: ${status}\n`)
          } else {
            process.stdout.write('.')
          }
        }
      } catch (error) {
        console.error(`检查状态失败: ${error.message}`)
      }
    }

    if (isRunning) {
      console.log('\n⚠ 测试超时\n')
    }

    // 3. 获取测试日志
    console.log('[3/3] 获取测试日志...')
    try {
      const logsResponse = await fetch(
        `${API_BASE}/api/test/logs?sessionId=${sessionId}`
      )

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        console.log('\n========== 测试日志 ==========')
        console.log(JSON.stringify(logsData, null, 2))
      }
    } catch (error) {
      console.error(`获取日志失败: ${error.message}`)
    }

    console.log('\n========== 测试完成 ==========\n')

  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}\n`)
    process.exit(1)
  }
}

// 运行测试
startTest().catch(error => {
  console.error(`\n❌ 脚本执行失败: ${error.message}\n`)
  process.exit(1)
})
