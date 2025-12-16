import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 自动化测试平台',
  description: '完全解放测试人员手工功能测试，通过 AI + MCP 工具链自动化执行网站功能测试',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-screen flex flex-col overflow-hidden selection:bg-primary/30">
        {children}
      </body>
    </html>
  )
}
