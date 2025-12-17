# 快速修复 - 登录表单问题

## 问题

浏览器打开了登录页面，但无法自动填充用户名和密码。

## 快速解决步骤

### 步骤1：运行测试并获取调试信息

```bash
npm run dev
# 点击"开始AI测试"按钮
# 等待步骤2完成
```

### 步骤2：查看调试日志

在Web界面的日志中查找类似这样的信息：

```
页面输入框: [
  { type: "text", id: "username", name: "username", ... },
  { type: "password", id: "password", name: "password", ... }
]

页面按钮: [
  { text: "登录", id: "login-btn", ... }
]
```

### 步骤3：根据实际情况修改选择器

编辑 `lib/aiTestRunner.ts`，找到步骤3-5的代码：

```typescript
case 3:
  await callMCPTool('playwright_fill', {
    selector: '#username',  // ← 如果调试信息显示不同，修改这里
    value: config.username
  }, sessionId)
  break

case 4:
  await callMCPTool('playwright_fill', {
    selector: '#password',  // ← 如果调试信息显示不同，修改这里
    value: config.password
  }, sessionId)
  break

case 5:
  await callMCPTool('playwright_click', {
    selector: '#login-btn'  // ← 如果调试信息显示不同，修改这里
  }, sessionId)
  break
```

### 步骤4：常见的选择器修改

如果调试信息显示不同的选择器，使用以下替代方案：

**如果 ID 不是 `username`**：
```typescript
selector: 'input[name="username"]'  // 使用 name 属性
// 或
selector: 'input[placeholder*="用户名"]'  // 使用 placeholder
```

**如果 ID 不是 `password`**：
```typescript
selector: 'input[name="password"]'  // 使用 name 属性
// 或
selector: 'input[type="password"]'  // 使用 type 属性
```

**如果 ID 不是 `login-btn`**：
```typescript
selector: 'button[name="login"]'  // 使用 name 属性
// 或
selector: 'button:has-text("登录")'  // 使用按钮文本
// 或
selector: 'button[type="submit"]'  // 使用 type 属性
```

### 步骤5：重新运行测试

```bash
# 保存修改后的文件
# 刷新浏览器或重新启动
npm run dev
# 再次点击"开始AI测试"
```

## 示例修复

### 原始代码（失败）
```typescript
case 3:
  await callMCPTool('playwright_fill', {
    selector: '#username',
    value: config.username
  }, sessionId)
```

### 调试信息显示
```
页面输入框: [
  { type: "text", id: "user_name", name: "user_name", ... }
]
```

### 修复后的代码
```typescript
case 3:
  await callMCPTool('playwright_fill', {
    selector: '#user_name',  // 改为实际的 ID
    value: config.username
  }, sessionId)
```

## 验证修复

修复后，你应该看到这样的日志：

```
[MCP] 输入文本到元素 [#username]: xwytlb001
[MCP] 输入成功: [#username]
[MCP] 输入文本到元素 [#password]: 888888
[MCP] 输入成功: [#password]
[MCP] 点击元素: #login-btn
[MCP] 点击成功: #login-btn
```

而不是：

```
[ERROR] 元素 [#username] 未找到，尝试使用替代选择器...
```

## 如果还是不行

1. **检查网络连接** - 确保能访问 https://wmptest.fuioupay.com/
2. **检查浏览器窗口** - 浏览器应该会打开一个窗口显示登录页面
3. **查看完整日志** - 查看 `logs/test_<sessionId>.log` 文件
4. **增加等待时间** - 修改 `lib/mcp/mcpManager.ts` 中的超时时间

## 获取帮助

查看详细的调试指南：[DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)

---

**作者**: @author Jiane  
**最后更新**: 2025-12-16
