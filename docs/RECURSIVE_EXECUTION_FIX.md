# 递归执行修复 - AI 和 MCP 交互逻辑改进

## 问题分析

在执行日志 `logs/test_20251217.log` 中发现了 AI 和 MCP 工具交互的逻辑断裂：

### 原始问题
1. **步骤 5 逻辑断裂** - AI 生成了 10 个测试步骤，但**没有实际执行这些步骤**
2. **缺少递归执行机制** - 生成步骤后直接跳到步骤 6（生成报告）
3. **MCP 工具未被调用** - 虽然获取了页面元素，但没有通过 Playwright 工具执行操作

### 原始流程（错误）
```
获取页面 → AI分析 → 生成步骤 → [结束] 跳过执行
```

### 改进后的流程（正确）
```
获取页面 → AI分析 → 生成步骤 → [递归] 逐个执行每个步骤 → 验证结果 → 继续下一步
```

---

## 修复内容

### 1. 增强 `SmartStepExecutor.executePageFunctionalityTest()` 方法

**文件**: `lib/ai/smartStepExecutor.ts`

#### 新增方法：`executeTestStep()`
- 执行单个测试步骤
- 支持的操作类型：
  - `fill` / `input` - 填充输入框
  - `click` - 点击元素
  - `select` - 选择下拉框
  - `hover` - 悬停元素
  - `wait` - 等待延迟
  - `verify` / `check` - 验证元素

#### 改进的主方法流程
```typescript
1. 获取页面元素和上下文
2. AI 分析页面功能
3. 生成测试步骤列表
4. [循环] 逐个执行每个测试步骤
   - 调用 MCP Playwright 工具执行操作
   - 记录执行结果
   - 如果失败，生成补救步骤
5. 统计执行结果（成功率、失败数等）
6. 返回详细的执行报告
```

#### 关键改进
- ✅ **递归执行** - 每个生成的步骤都会被实际执行
- ✅ **错误恢复** - 步骤失败时自动生成补救方案
- ✅ **详细日志** - 每个步骤的执行过程都有详细的日志记录
- ✅ **执行统计** - 返回成功率、失败数等统计信息

### 2. 新增 `aiClient.generateRecoverySteps()` 方法

**文件**: `lib/ai/aiClient.ts`

当测试步骤执行失败时，AI 会：
1. 分析失败原因（选择器错误、元素不可见等）
2. 根据当前页面状态生成替代操作步骤
3. 提供多个备选方案

---

## 执行流程示例

### 日志输出示例

```
[14:10:14] INFO [ai]: <qwen3-max> [步骤1] MCP获取页面元素 + AI分析...
[14:10:14] INFO [ai]: <qwen3-max> [元素统计] 输入框:3 下拉框:0 按钮:11 表格:3
[14:10:14] INFO [ai]: <qwen3-max> [步骤2] AI分析完成，生成了 10 个测试步骤
[14:10:14] INFO [ai]: <qwen3-max> [步骤3] 开始递归执行 10 个测试步骤...

[14:10:14] INFO [ai]: <qwen3-max> [执行进度] 1/10
[14:10:14] INFO [ai]: <qwen3-max> [测试步骤 1] 执行: 在小区名称输入框中输入已知存在的小区名称
[14:10:14] INFO [mcp]: <playwright> 填充输入框: #el-id-2747-126 = 幸福花园小区
[14:10:14] INFO [ai]: <qwen3-max> ✓ 填充成功: #el-id-2747-126
[14:10:14] INFO [ai]: <qwen3-max> ✓ 步骤 1 执行成功

[14:10:15] INFO [ai]: <qwen3-max> [执行进度] 2/10
[14:10:15] INFO [ai]: <qwen3-max> [测试步骤 2] 执行: 在负责人输入框中输入负责人名称
[14:10:15] INFO [mcp]: <playwright> 填充输入框: #el-id-2747-127 = 张三
[14:10:15] INFO [ai]: <qwen3-max> ✓ 填充成功: #el-id-2747-127
[14:10:15] INFO [ai]: <qwen3-max> ✓ 步骤 2 执行成功

...

[14:10:25] INFO [ai]: <qwen3-max> [执行总结] 成功: 9, 失败: 1, 总计: 10
```

---

## 技术细节

### 1. MCP 工具调用
每个测试步骤都通过 `mcpManager.callPlaywright()` 调用相应的 Playwright 工具：

```typescript
// 填充输入框
await mcpManager.callPlaywright('fill', { selector, value }, sessionId)

// 点击元素
await mcpManager.callPlaywright('click', { selector }, sessionId)

// 验证元素
await mcpManager.callPlaywright('evaluate', { script }, sessionId)
```

### 2. 错误恢复机制
当步骤失败时：

```typescript
1. 获取当前页面状态
2. 调用 AI 的 generateRecoverySteps() 方法
3. AI 分析失败原因并生成补救步骤
4. 尝试执行补救步骤
5. 如果补救成功，标记为 'recovered'
6. 如果补救失败，继续下一步
```

### 3. 日志规范
遵循项目的日志规范：

```typescript
// AI 日志
logAI(`[步骤1] 执行操作...`, getModelName(), sessionId)

// MCP 日志
logMCP(`点击元素: ${selector}`, 'playwright', sessionId)

// 系统日志
logSystem(`步骤执行完成`, 'smartStepExecutor-executePageFunctionalityTest', sessionId)

// 错误日志
logError(`执行失败: ${error}`, error, 'smartStepExecutor-executeTestStep', sessionId)
```

---

## 测试验证

修复后的执行流程会：

1. ✅ 生成测试步骤后**立即执行**
2. ✅ 通过 MCP Playwright 工具与页面交互
3. ✅ 记录每个步骤的执行结果
4. ✅ 失败时自动生成补救方案
5. ✅ 提供详细的执行统计和报告

---

## 相关文件修改

- `lib/ai/smartStepExecutor.ts` - 增强递归执行逻辑
- `lib/ai/aiClient.ts` - 新增补救步骤生成方法

## 作者
@author Jiane
