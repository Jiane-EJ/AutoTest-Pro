# AI自动化测试平台 - 真实场景测试版本

## 🎯 项目概述

这是一个完全真实场景的AI自动化测试平台，集成了：
- **Playwright** - 真实浏览器自动化
- **Qwen AI** - 智能分析和决策
- **MCP工具链** - 模型上下文协议支持

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
npx playwright install chromium
```

### 2. 配置环境
编辑 `.env.local`：
```bash
QWEN_API_KEY=sk-7f57a989da6848f3a399cdaf4e39568a
TEST_URL=https://wyt-pf-test.fuioupay.com/
TEST_USERNAME=xwytlb001
TEST_PASSWORD=888888
```

### 3. 启动测试
```bash
npm run dev
# 访问 http://localhost:3000
```

## ✨ 核心特性

### 真实浏览器自动化
- ✅ 真实导航到目标网站
- ✅ 真实填充表单字段
- ✅ 真实点击按钮和链接
- ✅ 获取真实的页面内容

### AI智能分析
- ✅ 分析登录状态和页面菜单
- ✅ 分析页面功能和交互元素
- ✅ 生成详细的测试计划
- ✅ 生成完整的测试报告

### 详细日志输出
- ✅ [SYSTEM] 系统级日志
- ✅ [AI] AI模型日志
- ✅ [MCP] 工具调用日志
- ✅ [ERROR] 错误日志

## 📊 测试流程

```
步骤1: 初始化浏览器 → 真实Playwright
步骤2: 导航至登陆页面 → 真实导航
步骤3-5: 登录操作 → 真实填充和点击
步骤6: 登录验证 → AI分析 + 菜单识别
步骤7: 导航至小区管理-小区信息管理 → 真实导航
步骤8: 页面分析 → AI分析 + 测试计划
步骤9-12: 功能测试和报告 → 真实操作 + AI生成
```

## 📁 项目结构

```
AutoTest Pro/
├── app/
│   ├── api/test/          # 测试API路由
│   ├── layout.tsx         # 应用布局
│   ├── page.tsx           # 主页面
│   └── test.tsx           # 测试组件
├── lib/
│   ├── ai/
│   │   └── qwenClient.ts  # Qwen AI客户端（真实API调用）
│   ├── mcp/
│   │   └── mcpManager.ts  # MCP管理器（真实浏览器操作）
│   ├── aiTestRunner.ts    # AI测试运行器（改进的流程）
│   └── logger.ts          # 日志系统（详细分类）
├── scripts/
│   └── test-real-scenario.mjs  # 测试脚本
├── .env.local             # 环境配置
├── package.json           # 项目依赖
└── README.md              # 本文件
```

## 🔧 配置说明

### 环境变量
```bash
# AI配置
QWEN_API_KEY=sk-xxxxxxxxxxxxxxxx
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 测试配置
TEST_URL=https://wyt-pf-test.fuioupay.com/
TEST_USERNAME=xwytlb001
TEST_PASSWORD=888888
TEST_REQUIREMENT=完整测试小区管理-小区信息管理下的功能
```

### 修改登录表单选择器
编辑 `lib/aiTestRunner.ts` 中的步骤3-5：
```typescript
case 3:
  await callMCPTool('playwright_fill', {
    selector: '#your-username-selector',  // 修改此处
    value: config.username
  }, sessionId)
```

## 📝 使用方式

### 方式1：Web界面（推荐）
```bash
npm run dev
# 打开 http://localhost:3000
# 点击"开始AI测试"按钮
```

### 方式2：命令行脚本
```bash
node scripts/test-real-scenario.mjs
```

### 方式3：API调用
```bash
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://wyt-pf-test.fuioupay.com/",
    "username": "xwytlb001",
    "password": "888888",
    "requirement": "完整测试小区管理-小区信息管理下的功能"
  }'
```

## 📊 日志查看

### 实时日志
在Web界面上实时查看测试日志。

### 文件日志
```bash
# 所有日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# 会话日志
tail -f logs/test_<sessionId>.log
```

## 🐛 故障排除

### 浏览器启动失败
```bash
npx playwright install chromium
```

### API调用失败
- 检查 `QWEN_API_KEY` 是否正确
- 确保API key有效且未过期
- 检查网络连接

### 登录失败
- 验证用户名和密码
- 检查目标网站是否可访问
- 检查登录表单选择器

### 页面加载超时
- 检查网络连接
- 增加超时时间
- 验证页面是否正确加载

## 📚 文档

- [快速启动指南](./QUICK_START.md) - 快速上手
- [真实场景测试指南](./REAL_SCENARIO_TEST.md) - 详细说明
- [改造总结](./CHANGES_SUMMARY.md) - 技术细节
- [完成报告](./IMPLEMENTATION_COMPLETE.md) - 项目总结
- [验证清单](./VERIFICATION_CHECKLIST.md) - 验证状态

## 🔍 关键改进

### 从模拟到真实
| 方面 | 之前 | 现在 |
|------|------|------|
| 浏览器 | 模拟延迟 | 真实Playwright |
| AI | 硬编码响应 | 真实API调用 |
| 页面内容 | 无 | 真实HTML/文本 |
| 日志 | 简单 | 详细分类 |
| 执行时间 | ~30秒 | ~60-90秒 |

## 🎓 学习资源

- [Playwright文档](https://playwright.dev/)
- [Qwen API文档](https://dashscope.aliyuncs.com/)
- [MCP协议](https://modelcontextprotocol.io/)

## 🤝 贡献

欢迎提交问题和改进建议。

## 📄 许可证

MIT License

## 👤 作者

**@author Jiane**

## 📞 支持

如有问题，请查看日志文件或联系开发团队。

---

**版本**: 1.0.0  
**状态**: ✅ 完成并验证  
**最后更新**: 2025-12-16

## 🎉 项目完成

✅ 所有模拟数据已移除  
✅ 真实浏览器自动化已实现  
✅ AI模型集成已完成  
✅ 详细日志系统已建立  
✅ 完整文档已编写  

**项目已准备好进行真实场景测试！**
