# 调试指南 - 登录表单元素识别

## 问题描述

在真实场景测试中，浏览器成功导航到登录页面，但在填充用户名时超时，错误信息：
```
page.fill: Timeout 30000ms exceeded.
Call log:- waiting for locator('#username')
```

这表示页面上找不到 `id="username"` 的元素。

## 根本原因

登录表单的选择器可能与实际页面结构不匹配。常见原因：
- 输入框的 ID 不是 `username`
- 输入框使用 `name` 属性而不是 `id`
- 输入框有不同的选择器（如 `data-*` 属性）
- 页面使用动态加载，元素还未出现

## 解决方案

### 1. 自动元素检测

现在系统会在步骤2自动检测页面上的所有输入框和按钮，并输出调试信息：

```
页面输入框: [
  { type: "text", id: "username", name: "username", placeholder: "用户名", selector: "#username" },
  { type: "password", id: "password", name: "password", placeholder: "密码", selector: "#password" },
  ...
]

页面按钮: [
  { text: "登录", id: "login-btn", name: "login", selector: "#login-btn" },
  ...
]
```

### 2. 改进的元素定位

系统现在支持多种选择器策略：

**对于输入框**：
- 优先使用 ID 选择器：`#username`
- 备选 name 属性：`input[name="username"]`
- 备选 placeholder：`[placeholder*="username"]`
- 通用选择器：`input[type="text"]`、`input[type="password"]`

**对于按钮**：
- 优先使用 ID 选择器：`#login-btn`
- 备选 name 属性：`button[name="login"]`
- 备选文本内容：`button:has-text("登录")`
- 通用选择器：`button[type="submit"]`、`input[type="submit"]`

### 3. 更好的页面加载等待

改进了导航方法：
- 使用 `domcontentloaded` 而不是 `networkidle`（更快）
- 添加额外的 2 秒等待，确保动态内容加载
- 每个操作前都会等待元素出现（超时 5 秒）

## 使用调试信息

### 查看调试日志

1. **Web界面**：在测试日志中查看步骤2的输出
2. **文件日志**：查看 `logs/test_<sessionId>.log`
3. **控制台**：查看 `npm run dev` 的输出

### 示例日志输出

```
[AI] 正在分析登录页面结构...
[AI] 页面元素: {
  "inputs": [
    {"type":"text","id":"username","name":"username","placeholder":"用户名","selector":"#username"},
    {"type":"password","id":"password","name":"password","placeholder":"密码","selector":"#password"}
  ],
  "buttons": [
    {"text":"登录","id":"login-btn","name":"login","selector":"#login-btn"}
  ]
}
```

## 修改登录选择器

如果自动检测失败，可以手动修改选择器：

### 方法1：编辑 aiTestRunner.ts

```typescript
case 3:
  await callMCPTool('playwright_fill', {
    selector: '#your-actual-username-selector',  // 修改此处
    value: config.username
  }, sessionId)
  break

case 4:
  await callMCPTool('playwright_fill', {
    selector: '#your-actual-password-selector',  // 修改此处
    value: config.password
  }, sessionId)
  break

case 5:
  await callMCPTool('playwright_click', {
    selector: '#your-actual-login-button-selector'  // 修改此处
  }, sessionId)
  break
```

### 方法2：使用替代选择器

系统会自动尝试以下选择器：

**用户名输入框**：
```
input[name="username"]
input[id="username"]
[placeholder*="username"]
input[type="text"]
```

**密码输入框**：
```
input[name="password"]
input[id="password"]
[placeholder*="密码"]
input[type="password"]
```

**登录按钮**：
```
button[id="login-btn"]
button[name="login"]
button:has-text("登录")
button[type="submit"]
input[type="submit"]
```

## 常见问题

### Q: 为什么还是找不到元素？

A: 可能的原因：
1. 页面使用 iframe，元素在 iframe 内
2. 页面使用 Shadow DOM
3. 元素是动态生成的，需要更长的等待时间
4. 选择器语法错误

### Q: 如何增加等待时间？

A: 修改 `lib/mcp/mcpManager.ts` 中的超时时间：

```typescript
// 从 5000ms 改为 10000ms
await page.waitForSelector(selector, { timeout: 10000 })
```

### Q: 如何调试 iframe 内的元素？

A: 需要特殊处理，暂不支持。可以提交 issue 或联系开发团队。

## 测试流程

1. **启动测试**：`npm run dev`
2. **点击"开始AI测试"**
3. **查看步骤2的日志**：获取页面元素信息
4. **根据日志修改选择器**（如需要）
5. **重新运行测试**

## 日志示例

### 成功的登录流程

```
[SYSTEM] 开始执行步骤 2: 导航至登陆页面
[AI] 正在分析登录页面结构...
[AI] 页面元素: {"inputs":[...],"buttons":[...]}
[SYSTEM] 开始执行步骤 3: 识别并输入用户名
[MCP] 输入文本到元素 [#username]: xwytlb001
[MCP] 输入成功: [#username]
[SYSTEM] 开始执行步骤 4: 输入密码
[MCP] 输入文本到元素 [#password]: 888888
[MCP] 输入成功: [#password]
[SYSTEM] 开始执行步骤 5: 点击登录按钮
[MCP] 点击元素: #login-btn
[MCP] 点击成功: #login-btn
```

### 失败的登录流程

```
[SYSTEM] 开始执行步骤 3: 识别并输入用户名
[MCP] 输入文本到元素 [#username]: xwytlb001
[ERROR] 元素 [#username] 未找到，尝试使用替代选择器...
[MCP] 找到替代元素: input[name="username"]
[MCP] 输入成功: input[name="username"]
```

## 下一步

1. 运行测试并查看步骤2的调试信息
2. 根据实际页面结构修改选择器
3. 重新运行测试验证

---

**作者**: @author Jiane  
**最后更新**: 2025-12-16
