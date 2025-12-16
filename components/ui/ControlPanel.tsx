import { TestStatus, TestConfig } from '@/types/test'
interface ControlPanelProps {
  testStatus: TestStatus
  testConfig: TestConfig
  setTestConfig: (config: TestConfig) => void
  onStartTest: () => void
  onPauseTest: () => void
  onStopTest: () => void
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  testStatus,
  testConfig,
  setTestConfig,
  onStartTest,
  onPauseTest,
  onStopTest
}) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusBadge = () => {
    if (testStatus.isPaused) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500 text-white border border-yellow-500/20">已暂停</span>
    } else if (testStatus.isRunning) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary text-white border border-primary/20">运行中</span>
    } else {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-500 text-white border border-slate-500/20">未开始</span>
    }
  }

  const progress = Math.round((testStatus.currentStep / testStatus.totalSteps) * 100)

  return (
    <div className="flex-none p-5 pb-0">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {testStatus.isRunning || testStatus.isPaused ? '正在运行: 登录流程验证' : '准备就绪'}
            </h1>
            {getStatusBadge()}
          </div>
          <p className="text-slate-500 dark:text-[#92adc9] text-sm font-medium">
            {testStatus.sessionId ? `会话 ID: #${testStatus.sessionId}  |  ` : ''}
            目标环境: {testStatus.environment}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-[#1a232e] px-4 py-2 rounded-lg border border-[#2b3d52]">
            <span className="material-symbols-outlined text-primary">timer</span>
            <div className="font-mono text-xl font-bold text-white tracking-widest">
              {testStatus.elapsedTime}
            </div>
          </div>

          <div className="flex gap-2">
            {!testStatus.isRunning ? (
              <button
                onClick={onStartTest}
                className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold border border-transparent hover:border-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                开始测试
              </button>
            ) : (
              <>
                <button
                  onClick={testStatus.isPaused ? onStartTest : onPauseTest}
                  className="flex items-center gap-2 h-10 px-5 rounded-lg bg-[#233648] hover:bg-[#2f455a] text-white text-sm font-bold border border-transparent hover:border-white/10 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">
                    {testStatus.isPaused ? 'play_arrow' : 'pause'}
                  </span>
                  {testStatus.isPaused ? '继续' : '暂停'}
                </button>
                <button
                  onClick={onStopTest}
                  className="flex items-center gap-2 h-10 px-5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold border border-red-500/20 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">stop</span>
                  终止
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex justify-between text-xs font-medium text-slate-400">
          <span>总体进度</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#1a232e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Test Configuration - 只在未运行时显示 */}
      {!testStatus.isRunning && (
        <div className="mb-6 bg-[#1a232e] rounded-lg p-4 border border-[#2b3d52]">
          <h3 className="text-sm font-bold text-white mb-3">测试配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">测试网址</label>
              <input
                type="text"
                value={testConfig.url}
                onChange={(e) => setTestConfig({ ...testConfig, url: e.target.value })}
                className="w-full px-3 py-2 bg-[#0c1219] border border-[#2b3d52] rounded text-sm text-white focus:outline-none focus:border-primary"
                placeholder="输入测试网址"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">测试账号</label>
              <input
                type="text"
                value={testConfig.username}
                onChange={(e) => setTestConfig({ ...testConfig, username: e.target.value })}
                className="w-full px-3 py-2 bg-[#0c1219] border border-[#2b3d52] rounded text-sm text-white focus:outline-none focus:border-primary"
                placeholder="输入用户名"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">测试密码</label>
              <input
                type="password"
                value={testConfig.password}
                onChange={(e) => setTestConfig({ ...testConfig, password: e.target.value })}
                className="w-full px-3 py-2 bg-[#0c1219] border border-[#2b3d52] rounded text-sm text-white focus:outline-none focus:border-primary"
                placeholder="输入密码"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">测试需求</label>
              <input
                type="text"
                value={testConfig.requirement}
                onChange={(e) => setTestConfig({ ...testConfig, requirement: e.target.value })}
                className="w-full px-3 py-2 bg-[#0c1219] border border-[#2b3d52] rounded text-sm text-white focus:outline-none focus:border-primary"
                placeholder="输入测试需求"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
