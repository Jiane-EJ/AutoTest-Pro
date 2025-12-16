import { TestConfig } from '@/utils/testSession'
import { sessionManager } from '@/utils/testSession'
import { logSystem, logAI, logMCP, logError } from '@/lib/logger'
import { broadcast } from '@/app/api/ws/route'
import { TestStep, LogEntry } from '@/types/test'
import { qwenClient } from '@/lib/ai/qwenClient'
import { mcpManager } from '@/lib/mcp/mcpManager'
import { SmartStepExecutor } from '@/lib/ai/smartStepExecutor'
import { errorHandler, RecoveryStrategy } from '@/lib/error/ErrorHandler'
import { timeoutManager, TIMEOUT_CONFIGS } from '@/lib/error/TimeoutManager'
import { resourceManager } from '@/lib/error/ResourceManager'

// 更新步骤状态
async function updateStep(sessionId: string, stepId: number, stepData: Partial<TestStep>) {
  broadcast({
    type: 'stepUpdate',
    stepId,
    stepData,
    sessionId
  })
}

// 添加日志
async function addLog(sessionId: string, logEntry: LogEntry) {
  broadcast({
    type: 'logUpdate',
    logEntry,
    sessionId
  })
}

// 主要的AI测试运行函数
export async function runAITest(sessionId: string, config: TestConfig) {
  const startTime = Date.now()
  
  try {
    logSystem(`开始AI测试流程: ${sessionId}`, sessionId)
    
    // 更新会话状态为运行中
    await sessionManager.updateSessionStatus(sessionId, 'running')
    
    // 定义测试步骤
    const testSteps: TestStep[] = [
      { id: 1, title: '初始化浏览器环境', status: 'pending', duration: null, log: null },
      { id: 2, title: '导航至登陆页面', status: 'pending', duration: null, log: null },
      { id: 3, title: '执行完整登录流程', status: 'pending', duration: null, log: null },
      { id: 4, title: '导航至 /community/list', status: 'pending', duration: null, log: null },
      { id: 5, title: '执行页面功能测试', status: 'pending', duration: null, log: null },
      { id: 6, title: '生成测试报告', status: 'pending', duration: null, log: null },
      { id: 7, title: '清理测试环境', status: 'pending', duration: null, log: null }
    ]

    // 逐步执行测试
    for (let i = 0; i < testSteps.length; i++) {
      const step = testSteps[i]
      const stepStartTime = Date.now()
      
      logSystem(`开始执行步骤 ${step.id}: ${step.title}`, sessionId)
      
      // 更新步骤为运行中
      await updateStep(sessionId, step.id, {
        status: 'running',
        log: `正在执行: ${step.title}...`
      })
      
      // 添加AI分析日志
      logAI(`分析步骤 ${step.id} 中... 发现相关元素。目标: ${step.title}`, sessionId)
      await addLog(sessionId, {
        timestamp: new Date().toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        type: 'ai',
        message: `分析步骤 ${step.id} 中... 发现相关元素。目标: ${step.title}`
      })
      
      const stepContext = {
        sessionId,
        stepId: step.id,
        operation: `步骤_${step.id}`,
        timestamp: new Date()
      }
      
      try {
        // 使用超时控制执行测试步骤
        await timeoutManager.executeWithTimeout(
          async () => {
            // 根据步骤执行不同的操作
            switch (step.id) {
              case 1:
                // 导航到登录页面
                logAI(`[步骤1] 初始化浏览器并导航到登录页面...`, sessionId)
                const navResult = await SmartStepExecutor.executeNavigation(
                  { sessionId, stepId: step.id, stepTitle: step.title, config },
                  config.url
                )
                if (!navResult.success) {
                  throw new Error(navResult.error || '导航失败')
                }
                break
                
              case 2:
                // 分析登录页面结构
                logAI(`[步骤2] 分析登录页面结构...`, sessionId)
                const debugResult = await mcpManager.debugPageElements(sessionId)
                
                if (debugResult.success && debugResult.data) {
                  logAI(`页面元素: ${JSON.stringify(debugResult.data)}`, sessionId)
                  await addLog(sessionId, {
                    timestamp: new Date().toLocaleTimeString('zh-CN', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    }),
                    type: 'ai',
                    message: `页面输入框: ${JSON.stringify(debugResult.data.inputs)}\n页面按钮: ${JSON.stringify(debugResult.data.buttons)}`
                  })
                }
                break
                
              case 3:
                // 执行完整的登录流程
                logAI(`[步骤3] 执行完整登录流程...`, sessionId)
                const loginResult = await SmartStepExecutor.executeLoginFlow(
                  { sessionId, stepId: step.id, stepTitle: step.title, config }
                )
                if (!loginResult.success) {
                  throw new Error(loginResult.error || '登录失败')
                }
                
                // 记录登录成功的详细信息
                await addLog(sessionId, {
                  timestamp: new Date().toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  }),
                  type: 'ai',
                  message: `✓ 登录验证成功 | 用户: ${config.username}\n验证结果: ${loginResult.data?.verification?.substring(0, 200)}`
                })
                break
                
              case 4:
                // 导航到功能测试页面
                logAI(`[步骤4] 导航到功能测试页面...`, sessionId)
                const funcNavResult = await SmartStepExecutor.executeNavigation(
                  { sessionId, stepId: step.id, stepTitle: step.title, config },
                  `${config.url}/#/community/list`
                )
                if (!funcNavResult.success) {
                  throw new Error(funcNavResult.error || '导航失败')
                }
                break
                
              case 5:
                // 执行页面功能测试
                logAI(`[步骤5] 执行页面功能测试...`, sessionId)
                const funcTestResult = await SmartStepExecutor.executePageFunctionalityTest(
                  { sessionId, stepId: step.id, stepTitle: step.title, config },
                  config.requirement
                )
                if (!funcTestResult.success) {
                  throw new Error(funcTestResult.error || '功能测试失败')
                }
                
                await addLog(sessionId, {
                  timestamp: new Date().toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  }),
                  type: 'ai',
                  message: `页面功能分析:\n${funcTestResult.data?.analysis?.substring(0, 300)}`
                })
                break
                
              case 6:
                // 生成测试报告
                logAI(`[步骤6] 生成测试报告...`, sessionId)
                const reportAnalysis = await qwenClient.chatCompletion({
                  model: 'qwen-vl-max',
                  messages: [
                    {
                      role: 'system',
                      content: '你是一个专业的测试报告生成专家。请生成详细的测试报告。'
                    },
                    {
                      role: 'user',
                      content: `请生成一份测试报告，总结本次测试的执行情况、发现的问题和建议。`
                    }
                  ],
                  temperature: 0.3,
                  max_tokens: 1000
                }, sessionId)
                
                logAI(`测试报告生成完成`, sessionId)
                await addLog(sessionId, {
                  timestamp: new Date().toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  }),
                  type: 'system',
                  message: `测试报告:\n${reportAnalysis.substring(0, 300)}`
                })
                break
                
              case 7:
                // 清理测试环境
                logAI(`[步骤7] 清理测试环境...`, sessionId)
                await addLog(sessionId, {
                  timestamp: new Date().toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  }),
                  type: 'system',
                  message: `测试环境清理完成`
                })
                break
                
              default:
                await new Promise(resolve => setTimeout(resolve, 500))
            }
          },
          TIMEOUT_CONFIGS.LONG,
          `步骤_${step.id}`,
          sessionId
        )
        
        // 计算步骤耗时
        const stepDuration = Date.now() - stepStartTime
        const seconds = Math.floor(stepDuration / 1000)
        const milliseconds = stepDuration % 1000
        const durationStr = `${seconds < 10 ? '0' + seconds : seconds}:${milliseconds < 10 ? '00' + milliseconds : milliseconds < 100 ? '0' + milliseconds : milliseconds}s`
        
        // 更新步骤为完成
        await updateStep(sessionId, step.id, {
          status: 'completed',
          duration: durationStr,
          log: `${step.title} - 执行成功`
        })
        
        logSystem(`步骤 ${step.id} 完成，耗时: ${durationStr}`, sessionId)
        
      } catch (error) {
        // 增强的错误处理
        const { shouldContinue } = await errorHandler.handleError(
          error instanceof Error ? error : new Error(String(error)),
          stepContext,
          step.id <= 3 ? RecoveryStrategy.SKIP_AND_CONTINUE : RecoveryStrategy.RETRY,
          {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000,
            backoffMultiplier: 2
          }
        )
        
        const errorMsg = error instanceof Error ? error.message : String(error)
        
        if (shouldContinue) {
          // 跳过当前步骤，继续执行
          await updateStep(sessionId, step.id, {
            status: 'completed',
            duration: `${Date.now() - stepStartTime}ms`,
            log: `${step.title} - 已跳过（错误: ${errorMsg}）`
          })
          
          await addLog(sessionId, {
            timestamp: new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            type: 'error',
            message: `步骤 ${step.id} 已跳过: ${errorMsg}`
          })
          
          logSystem(`步骤 ${step.id} 已跳过，继续执行后续步骤`, sessionId)
        } else {
          // 步骤真正失败
          logError(`步骤 ${step.id} 失败: ${errorMsg}`, error as Error, sessionId)
          
          await updateStep(sessionId, step.id, {
            status: 'error',
            log: `${step.title} - 执行失败: ${errorMsg}`
          })
          
          await addLog(sessionId, {
            timestamp: new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            type: 'error',
            message: `步骤 ${step.id} 失败: ${errorMsg}`
          })
          
          throw error
        }
      }
      
      // 短暂延迟，模拟真实执行间隔
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 测试完成
    const totalDuration = Date.now() - startTime
    const hours = Math.floor(totalDuration / 3600000)
    const minutes = Math.floor((totalDuration % 3600000) / 60000)
    const seconds = Math.floor((totalDuration % 60000) / 1000)
    const milliseconds = totalDuration % 1000
    const totalDurationStr = `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}:${milliseconds < 10 ? '00' + milliseconds : milliseconds < 100 ? '0' + milliseconds : milliseconds}`
    
    logSystem(`AI测试完成: ${sessionId}，总耗时: ${totalDurationStr}`, sessionId)
    
    await sessionManager.updateSessionStatus(sessionId, 'completed')
    
    // 广播完成状态
    broadcast({
      type: 'statusUpdate',
      statusData: {
        isRunning: false,
        progress: 100,
        elapsedTime: totalDurationStr
      },
      sessionId
    })
    
  } catch (error) {
    logError(`AI测试失败: ${sessionId}`, error as Error, sessionId)
    
    // 使用错误处理器进行最终错误处理
    await errorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)),
      {
        sessionId,
        operation: 'runAITest',
        timestamp: new Date()
      },
      RecoveryStrategy.ESCALATE
    )
    
    await sessionManager.updateSessionStatus(sessionId, 'error')
    
    // 广播错误状态
    broadcast({
      type: 'statusUpdate',
      statusData: {
        isRunning: false,
        progress: 0
      },
      sessionId
    })
  } finally {
    // 清理资源
    try {
      await mcpManager.cleanup()
      await resourceManager.cleanupUnusedResources(60000)
    } catch (cleanupError) {
      logError('资源清理失败', cleanupError as Error, sessionId)
    }
  }
}
