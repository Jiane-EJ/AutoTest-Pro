# 快速启动指南

## 项目概述

AI自动化测试平台 - 一个完全真实场景的自动化测试系统，集成了Playwright浏览器自动化、Qwen AI模型分析和MCP工具链。

## 前置要求

- Node.js 18+
- npm 或 yarn
- 有效的Qwen API Key

## 安装步骤

### 1. 克隆项目并安装依赖

```bash
cd "AutoTest Pro"
npm install
```

### 2. 配置环境变量

编辑 `.env.local` 文件，确保以下配置正确：

```bash
# AI 厂商配置
AI_PROVIDER=qwen
QWEN_API_KEY=sk-7f57a989da6848f3a399cdaf4e39568a
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 测试配置
TEST_URL=https://wyt-pf-test.fuioupay.com/
TEST_USERNAME=xwytlb001
TEST_PASSWORD=888888
TEST_REQUIREMENT=完整测试小区管理-小区信息管理下的功能
```

### 3. 安装Playwright浏览器

```bash
npx playwright install chromium
```

## 运行测试

### 方式1：Web界面（推荐）

```bash
npm run dev
```

然后打开浏览器访问 `http://localhost:3000`，点击"开始AI测试"按钮。

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

## 查看日志

### 实时日志

在Web界面上实时查看测试日志。

### 文件日志

```bash
# 查看所有日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log

# 查看特定会话日志
tail -f logs/test_<sessionId>.log
```

## 测试流程

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 初始化浏览器环境 | ✓ 真实Playwright |
| 2 | 导航至登陆页面 | ✓ 真实导航 |
| 3 | 识别并输入用户名 | ✓ 真实填充 |
| 4 | 输入密码 | ✓ 真实填充 |
| 5 | 点击登录按钮 | ✓ 真实点击 |
| 6 | 验证登录成功 | ✓ AI分析 |
| 7 | 导航至 小区管理-小区信息管理 | ✓ 真实导航 |
| 8 | 分析页面功能 | ✓ AI分析 |
| 9 | 执行功能测试 | ✓ 真实操作 |
| 10 | 验证测试结果 | ✓ 真实验证 |
| 11 | 生成测试报告 | ✓ AI生成 |
| 12 | 清理测试环境 | ✓ 资源清理 |

## 关键特性

### ✓ 真实浏览器自动化
- 使用Playwright进行真实的浏览器操作
- 支持导航、表单填充、点击、等待等操作
- 获取真实的页面HTML和文本内容

### ✓ AI模型集成
- 实时调用Qwen AI模型
- 分析登录状态和页面菜单
- 生成测试计划和报告

### ✓ 详细日志输出
- 系统日志：步骤执行、状态更新
- AI日志：模型调用和分析结果
- MCP日志：工具调用详情
- 错误日志：完整的错误堆栈

### ✓ 完整的错误处理
- 自动错误恢复
- 重试机制
- 资源清理

## 常见问题

### Q: 浏览器启动失败？
A: 运行 `npx playwright install chromium` 安装浏览器。

### Q: API调用失败？
A: 检查 `QWEN_API_KEY` 是否正确配置且有效。

### Q: 登录失败？
A: 检查用户名、密码和目标网站是否可访问。

### Q: 页面加载超时？
A: 检查网络连接或增加超时时间。

## 文档

- [真实场景测试指南](./REAL_SCENARIO_TEST.md) - 详细的测试说明
- [改造总结](./CHANGES_SUMMARY.md) - 所有改动的详细说明
- [项目架构](./ARCHITECTURE.md) - 系统架构设计

## 开发

### 构建项目

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

### 启动生产服务器

```bash
npm run start
```

## 支持

如有问题，请查看日志文件或联系开发团队。

---

**作者**: @author Jiane  
**版本**: 1.0.0  
**最后更新**: 2025-12-16
