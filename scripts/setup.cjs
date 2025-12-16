#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

console.log('🚀 初始化 AI 自动化测试平台...')

// 确保必要目录存在
const dirs = [
  'database',
  'logs', 
  'public'
]

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`✅ 创建目录: ${dir}`)
  } else {
    console.log(`✅ 目录已存在: ${dir}`)
  }
})

// 检查环境变量文件
const envPath = path.join(__dirname, '..', '.env.local')
const envExamplePath = path.join(__dirname, '..', '.env.local.example')

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath)
  console.log('✅ 创建环境变量文件 .env.local')
  console.log('⚠️  请编辑 .env.local 文件配置相关参数')
} else if (fs.existsSync(envPath)) {
  console.log('✅ 环境变量文件已存在')
} else {
  console.log('❌ 缺少环境变量模板文件')
}

console.log('\n🎉 初始化完成！')
console.log('\n📋 下一步操作：')
console.log('1. 编辑 .env.local 文件配置相关参数')
console.log('2. 运行 npm install 安装依赖')
console.log('3. 运行 npm run dev 启动开发服务器')
console.log('\n🔗 访问地址: http://localhost:3000')