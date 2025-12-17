<coding_guidelines>
## 一、核心准则
- 使用中文交流
- 作者统一为：@author Jiane
- 项目开发禁止使用事务，多表操作使用补偿机制
 
## 二、指令说明

| 指令 | 说明 |
|------|------|
| /开发 | 按顺序开发所有未完成模块 |
| /开发 <模块名> | 开发指定模块 |
| /检查 | 代码自检 |
| /测试 <模块名> | 创建测试用例 |
| /问题 | 协助解决问题 |
| /继续 | 恢复任务或继续输出 |

## 三、PowerShell命令
```powershell
# 创建文件夹
New-Item -ItemType Directory -Path "目标路径"
# 创建文件
New-Item -ItemType File -Path "文件路径"
# 复制文件
Copy-Item -Path "源路径" -Destination "目标路径"
```
注意：PowerShell不支持 `&&`，使用分号 `;` 链接命令

## 四、日志规范

使用 `lib/logger.ts` 中的日志函数时，必须遵循以下格式：

### 1. logAI - AI日志
```typescript
logAI(message: string, model: string, sessionId?: string)
```
- `model`: 必须标明AI模型名称，如 `'qwen-max'`, `'qwen-vl-max'`
- 示例: `logAI('开始分析页面...', 'qwen-vl-max', sessionId)`

### 2. logSystem - 系统日志
```typescript
logSystem(message: string, source: string, sessionId?: string)
```
- `source`: 必须标明来源，格式为 `文件名-方法名`
- 示例: `logSystem('步骤完成', 'aiTestRunner-runAITest', sessionId)`

### 3. logMCP - MCP工具日志
```typescript
logMCP(message: string, tool: string, sessionId?: string)
```
- `tool`: 必须标明工具名称，如 `'playwright'`, `'context7'`, `'sequential-thinking'`
- 示例: `logMCP('点击元素', 'playwright', sessionId)`

### 4. logError - 错误日志
```typescript
logError(message: string, error: Error, source: string, sessionId?: string)
```
- `source`: 必须标明来源，格式为 `文件名-方法名`
- 示例: `logError('API调用失败', error, 'qwenClient-chatCompletion', sessionId)`

### 日志输出格式
```
[时间] INFO [ai]: <模型名> 消息内容
[时间] INFO [system]: <文件名-方法名> 消息内容
[时间] INFO [mcp]: <工具名> 消息内容
[ERROR] <文件名-方法名> 错误消息 - 错误详情
```
</coding_guidelines>
