import { TestStep } from '@/types/test'
interface TestTimelineProps {
  steps: TestStep[]
  currentStep: number
  isRunning: boolean
}

export const TestTimeline: React.FC<TestTimelineProps> = ({ steps, currentStep, isRunning }) => {
  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'completed':
        return 'check_circle'
      case 'running':
        return 'progress_activity'
      case 'error':
        return 'error'
      default:
        return 'radio_button_unchecked'
    }
  }

  const getStepColor = (status: TestStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500'
      case 'running':
        return 'text-primary'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-slate-400'
    }
  }

  const getBorderColor = (status: TestStep['status'], isCurrent: boolean) => {
    if (status === 'completed') return 'border-green-500/50'
    if (status === 'running' || isCurrent) return 'border-primary'
    return 'border-slate-200 dark:border-[#233648]'
  }

  const getStatusBadge = (status: TestStep['status']) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 w-fit">成功</span>
      case 'running':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary text-white w-fit">运行中</span>
      case 'error':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-500 w-fit">失败</span>
      default:
        return null
    }
  }

  const completedCount = steps.filter(step => step.status === 'completed').length
  const remainingCount = steps.length - completedCount

  return (
    <div className="space-y-3">
        {steps.map((step, index) => {
          const isCurrent = step.status === 'running'
          const borderColor = getBorderColor(step.status, isCurrent)
          
          return (
            <div
              key={step.id}
              className={`relative pl-6 pb-4 border-l-2 ${borderColor}`}
            >
              <div className="absolute -left-[9px] top-0 bg-background-light dark:bg-background-dark">
                <span
                  className={`material-symbols-outlined text-lg ${getStepColor(step.status)} ${
                    isCurrent ? 'animate-spin' : ''
                  }`}
                >
                  {getStepIcon(step.status)}
                </span>
              </div>
              
              <div className="flex flex-col gap-2">
                {isCurrent && (
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-primary">当前步骤</span>
                    <span className="pulse-dot w-2 h-2 rounded-full bg-primary"></span>
                  </div>
                )}
                
                <div className={`flex flex-col gap-1 ${isCurrent ? 'p-3 rounded-lg bg-primary/10 border border-primary/20' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        步骤 {step.id}
                        {step.duration && ` · ${step.duration}`}
                      </span>
                      <p className="text-sm font-bold">{step.title}</p>
                      {step.log && (
                        <p className={`text-xs ${isCurrent ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {step.log}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(step.status)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}
