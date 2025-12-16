import { TestStep } from '@/types/test'
interface PlaywrightTestRunnerProps {
  isRunning: boolean
  currentStep: TestStep | undefined
}

export const PlaywrightTestRunner: React.FC<PlaywrightTestRunnerProps> = ({ 
  isRunning, 
  currentStep 
}) => {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#2b3d52] bg-slate-50 dark:bg-[#151d26]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isRunning ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
            )}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            实时预览
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-[#2b3d52]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-[#2b3d52]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-[#2b3d52]"></div>
        </div>
      </div>
      
      <div className="flex-1 relative bg-slate-100 dark:bg-[#0c1219] flex items-center justify-center overflow-hidden group">
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(#2b3d52 1px, transparent 1px)', 
            backgroundSize: '20px 20px' 
          }}
        ></div>
        
        {isRunning ? (
          <>
            {/* 模拟浏览器截图 */}
            <img 
              alt="测试页面预览" 
              className="w-full h-full object-cover object-top opacity-90 transition-opacity duration-300" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMGGNLE34tea2Upr6k6jzeVpeHGxroSz2nCo8Cq9pRzug4HhcSAOxjUOv_1Deny6CU5NIdgpxvtfMoqxiVSEPjev0Vy2CDsSNMfYK4B0Too1MuhJ8Wy46w6oT1oPWZMuMlogFbzs7dgsK9mAIpimzfCyibaNW_fSuGhbKYdHkJ20LaoBS9FdNyo2WA3NupR36rKnBayFps6sxvqc_nr40J5yAIQDw0ENtEt0vK36Eoy_trmLhJwa_dXsc1ifqwxNAec08x-DJmYJE"
            />
            
            {/* 模拟元素高亮 */}
            {currentStep?.title.includes('输入框') && (
              <div className="absolute top-[35%] left-[40%] w-[20%] h-[40px] border-2 border-primary bg-primary/10 rounded pointer-events-none flex items-center justify-center">
                <span className="absolute -top-6 left-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                  输入框 #username
                </span>
              </div>
            )}
            
            {currentStep?.title.includes('密码') && (
              <div className="absolute top-[45%] left-[40%] w-[20%] h-[40px] border-2 border-primary bg-primary/10 rounded pointer-events-none flex items-center justify-center">
                <span className="absolute -top-6 left-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                  输入框 #password
                </span>
              </div>
            )}
            
            {currentStep?.title.includes('按钮') && (
              <div className="absolute top-[55%] left-[40%] w-[20%] h-[40px] border-2 border-primary bg-primary/10 rounded pointer-events-none flex items-center justify-center">
                <span className="absolute -top-6 left-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                  按钮 #submit
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4">computer</span>
            <p className="text-lg font-medium">浏览器预览</p>
            <p className="text-sm mt-2">点击"开始测试"查看实时执行过程</p>
          </div>
        )}
        
        {/* 分辨率显示 */}
        <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          1920 x 1080
        </div>
      </div>
    </>
  )
}
