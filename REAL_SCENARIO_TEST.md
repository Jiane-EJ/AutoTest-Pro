# 真实场景测试指南

## 概述

本文档说明如何运行真实场景的AI自动化测试，包括真实的浏览器操作、AI模型调用和MCP工具集成。

## 前置条件

### 1. 环境变量配置

确保 `.env.local` 文件中已配置以下变量：

```bash
# AI 厂商配置
AI_PROVIDER=qwen
QWEN_API_KEY=sk-7f57a989da6848f3a399cdaf4e39568a
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 测试配置
TEST_URL=https://wmptest.fuioupay.com/
TEST_USERNAME=xwytlb001
TEST_PASSWORD=888888
TEST_REQUIREMENT=完整测试/community/list下的功能
```

### 2. 依赖安装

```bash
npm install
```

## 运行真实场景测试

### 方式1：通过Web界面

1. 启动开发服务器：
```bash
npm run dev
```

2. 打开浏览器访问 `http://localhost:3000`

3. 点击"开始AI测试"按钮

4. 查看实时日志输出

### 方式2：通过API调用

```bash
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://wmptest.fuioupay.com/",
    "username": "xwytlb001",
    "password": "888888",
    "requirement": "完整测试/community/list下的功能"
  }'
```

### 方式3：通过测试脚本

```bash
node scripts/test-real-scenario.mjs
```

## 测试流程

### 步骤1-5：登录流程
- 初始化浏览器环境（真实Playwright浏览器）
- 导航至登录页面
- 输入用户名
- 输入密码
- 点击登录按钮

### 步骤6：登录验证
- 获取登录后的页面HTML内容
- 调用Qwen AI模型分析登录状态
- 识别页面菜单和导航元素
- 输出AI分析结果

### 步骤7-8：页面分析
- 导航至 `/community/list` 页面
- 获取页面内容
- 调用AI模型分析页面功能
- 生成测试计划

### 步骤9-12：功能测试和报告
- 执行功能测试
- 验证测试结果
- 生成测试报告
- 清理测试环境

## 日志输出

### 日志类型

- **[SYSTEM]** - 系统级日志（步骤执行、状态更新）
- **[AI]** - AI模型调用和分析结果
- **[MCP]** - MCP工具调用（Playwright、Sequential Thinking等）
- **[ERROR]** - 错误日志

### 日志位置

- 控制台输出：实时显示
- 文件日志：`./logs/combined.log`
- 会话日志：`./logs/test_<sessionId>.log`
- 错误日志：`./logs/error.log`

## 关键改进

### 1. 真实浏览器操作
- 使用Playwright进行真实的浏览器自动化
- 支持导航、填充表单、点击按钮等操作
- 获取真实的页面HTML和文本内容

### 2. 真实AI调用
- 移除所有模拟响应
- 直接调用Qwen API进行AI分析
- 支持登录状态分析和页面功能分析

### 3. 详细日志输出
- 添加日志类型标签
- 输出到控制台和文件
- 记录AI模型的完整分析结果

### 4. 错误处理
- 完整的错误捕获和处理
- 支持错误恢复和重试
- 详细的错误日志记录

## 故障排除

### 问题1：Playwright浏览器启动失败

**症状**：`Error: Failed to launch browser`

**解决方案**：
```bash
# 安装Playwright浏览器
npx playwright install chromium
```

### 问题2：Qwen API调用失败

**症状**：`Qwen API error: 401`

**解决方案**：
- 检查 `QWEN_API_KEY` 是否正确配置
- 确保API key有效且未过期
- 检查网络连接

### 问题3：登录失败

**症状**：登录步骤失败，无法找到登录表单

**解决方案**：
- 检查目标网站是否可访问
- 验证用户名和密码是否正确
- 检查登录表单的选择器是否正确（`#username`, `#password`, `#login-btn`）

### 问题4：页面加载超时

**症状**：`Timeout waiting for selector`

**解决方案**：
- 增加超时时间
- 检查网络连接
- 验证页面是否正确加载

## 自定义配置

### 修改测试URL和凭证

编辑 `.env.local` 文件：

```bash
TEST_URL=https://your-test-url.com/
TEST_USERNAME=your-username
TEST_PASSWORD=your-password
TEST_REQUIREMENT=your-test-requirement
```

### 修改登录表单选择器

编辑 `lib/aiTestRunner.ts` 中的步骤3-5：

```typescript
case 3:
  await callMCPTool('playwright_fill', {
    selector: '#your-username-selector',  // 修改此处
    value: config.username
  }, sessionId)
  break
```

### 修改超时配置

编辑 `lib/error/TimeoutManager.ts` 中的 `TIMEOUT_CONFIGS`

## 性能优化

1. **并行执行**：可以修改步骤执行逻辑支持并行
2. **缓存**：缓存AI分析结果以减少API调用
3. **资源管理**：自动清理未使用的浏览器实例

## 安全建议

1. **不要在代码中硬编码凭证**，使用环境变量
2. **定期更新依赖**，特别是Playwright和AI库
3. **限制API调用频率**，避免被限流
4. **使用HTTPS**进行所有网络通信

## 支持和反馈

如有问题或建议，请联系开发团队。

---

**作者**: @author Jiane  
**最后更新**: 2025-12-16
