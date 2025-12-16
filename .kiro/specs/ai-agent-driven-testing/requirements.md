# AI Agent 驱动的测试流程 - 需求规格书

## Introduction

本文档定义了 AI Agent 驱动的测试流程改进需求。当前系统的问题是 AI 仅基于 URL 和用户需求"想象"测试点，没有实际访问页面获取真实内容。

**正确的流程**：
1. 用户输入 URL + 占位符账号密码 + 测试需求描述
2. AI Agent 从数据库读取真实凭证
3. AI Agent 使用 Vercel AI SDK 的 Tool Calling 功能，自动调用 Playwright MCP 工具
4. AI Agent 访问页面、登录、获取真实页面内容
5. AI Agent 与用户交互确认需求
6. AI Agent 导航到目标菜单（如"房屋收费"）
7. AI Agent 基于真实页面内容生成带选择器的测试用例
8. 用户确认后，使用 Playwright MCP 真正执行测试

**技术方案**：使用 `qwen-ai-provider` + Vercel AI SDK 的 `generateText` 函数，通过 `tools` 参数定义 Playwright 工具，AI 模型会自动识别并调用这些工具。

## Glossary

- **AI Agent**: 具有自主决策能力的 AI 系统，能够识别任务并调用工具完成目标
- **Tool Calling**: Vercel AI SDK 提供的工具调用功能，AI 模型可以自动调用定义的工具
- **Qwen Provider**: 阿里云千问模型的 Vercel AI SDK Provider，支持 Tool Calling
- **MCP (Model Context Protocol)**: 模型上下文协议，用于 AI 调用外部工具
- **Playwright MCP**: 基于 Playwright 的浏览器自动化 MCP 工具
- **PageInfo**: 页面信息结构，包含表单、按钮、菜单、表格等元素信息
- **Credentials**: 登录凭证，包含用户名和密码
- **Test Case**: 测试用例，包含测试步骤和预期结果

## Requirements

### Requirement 1

**User Story:** As a 测试人员, I want AI Agent 能够自动访问目标网站并获取真实页面内容, so that 生成的测试用例基于真实页面结构而非想象。

#### Acceptance Criteria

1. WHEN 用户提供目标 URL THEN AI_Agent SHALL 使用 Vercel AI SDK 的 Tool Calling 功能自动调用 navigate 工具访问该 URL
2. WHEN 页面加载完成 THEN AI_Agent SHALL 自动调用 getPageHtml 工具获取页面 HTML 内容
3. WHEN 获取页面内容后 THEN AI_Agent SHALL 自动调用 extractPageStructure 工具提取页面结构信息（表单、按钮、菜单、表格）
4. WHEN 页面需要登录 THEN AI_Agent SHALL 从数据库读取真实凭证并自动调用 fill 和 click 工具完成登录
5. IF 页面访问失败 THEN AI_Agent SHALL 记录错误信息并通知用户

### Requirement 2

**User Story:** As a 测试人员, I want 系统安全地管理登录凭证, so that 真实密码不会暴露给用户界面。

#### Acceptance Criteria

1. WHEN 用户在界面输入凭证 THEN System SHALL 将凭证加密存储到数据库
2. WHEN AI Agent 需要登录 THEN System SHALL 从数据库读取并解密真实凭证传递给 AI Agent
3. WHEN 用户界面显示凭证 THEN System SHALL 显示占位符（如 ******）而非真实密码
4. WHEN 测试会话结束 THEN System SHALL 提供选项清除临时存储的凭证

### Requirement 3

**User Story:** As a 测试人员, I want AI Agent 能够导航到指定的功能菜单, so that 我可以针对特定功能页面生成测试用例。

#### Acceptance Criteria

1. WHEN 用户指定目标菜单名称 THEN AI_Agent SHALL 自动调用 click 工具在页面中查找并点击该菜单
2. WHEN 菜单需要多级导航 THEN AI_Agent SHALL 依次调用 click 工具点击父菜单和子菜单
3. WHEN 导航到目标页面后 THEN AI_Agent SHALL 自动调用 extractPageStructure 工具重新获取页面内容
4. IF 菜单未找到 THEN AI_Agent SHALL 列出可用菜单供用户选择

### Requirement 4

**User Story:** As a 测试人员, I want AI Agent 与我交互确认测试需求, so that 生成的测试用例准确符合我的期望。

#### Acceptance Criteria

1. WHEN AI Agent 获取页面内容后 THEN AI_Agent SHALL 向用户展示页面结构摘要
2. WHEN 用户提供测试需求 THEN AI_Agent SHALL 基于页面内容分析可测试的功能点
3. WHEN 分析完成后 THEN AI_Agent SHALL 向用户确认测试范围和优先级
4. WHEN 用户提出修改意见 THEN AI_Agent SHALL 调整分析结果并再次确认
5. WHEN 用户确认需求 THEN AI_Agent SHALL 进入测试用例生成阶段

### Requirement 5

**User Story:** As a 测试人员, I want 生成的测试用例包含具体的元素选择器, so that 测试用例可以被自动化执行。

#### Acceptance Criteria

1. WHEN 生成测试步骤 THEN AI_Agent SHALL 为每个操作提供 CSS 选择器
2. WHEN 页面元素有 ID THEN AI_Agent SHALL 优先使用 ID 选择器（如 #username）
3. WHEN 页面元素无 ID 但有 name THEN AI_Agent SHALL 使用 name 选择器（如 input[name="username"]）
4. WHEN 页面元素无 ID 和 name THEN AI_Agent SHALL 使用文本或位置选择器
5. WHEN 生成测试用例 THEN AI_Agent SHALL 包含 actionType（click/fill/select/navigate/verify）

### Requirement 6

**User Story:** As a 系统管理员, I want AI Agent 的工具调用过程被完整记录, so that 我可以追踪和调试测试流程。

#### Acceptance Criteria

1. WHEN AI Agent 调用工具 THEN System SHALL 记录工具名称、参数和调用时间
2. WHEN 工具返回结果 THEN System SHALL 记录返回内容和耗时
3. WHEN 工具调用失败 THEN System SHALL 记录错误信息和重试次数
4. WHEN 用户查看日志 THEN System SHALL 以时间线形式展示完整的工具调用过程

### Requirement 7

**User Story:** As a 测试人员, I want 测试执行使用真实的 Playwright 操作, so that 测试结果反映真实的页面行为。

#### Acceptance Criteria

1. WHEN 执行测试步骤 THEN TestExecutor SHALL 调用对应的 Playwright 工具
2. WHEN 执行点击操作 THEN TestExecutor SHALL 调用 click 工具并等待页面响应
3. WHEN 执行输入操作 THEN TestExecutor SHALL 调用 fill 工具填写内容
4. WHEN 执行验证操作 THEN TestExecutor SHALL 调用 evaluate 工具检查页面状态
5. WHEN 步骤执行失败 THEN TestExecutor SHALL 调用 screenshot 工具截图并记录错误详情

### Requirement 8

**User Story:** As a 开发者, I want 使用 Vercel AI SDK 的 Tool Calling 功能, so that AI 模型可以自动识别并调用工具。

#### Acceptance Criteria

1. WHEN 系统初始化 THEN System SHALL 使用 qwen-ai-provider 创建 Qwen Provider 实例
2. WHEN 调用 AI Agent THEN System SHALL 使用 generateText 函数并传入 tools 参数
3. WHEN AI 模型需要调用工具 THEN System SHALL 自动执行工具并将结果返回给模型
4. WHEN 设置 maxSteps 参数 THEN System SHALL 限制工具调用的最大步数
5. WHEN 工具执行完成 THEN System SHALL 收集所有工具调用记录并返回

---

**文档版本**：1.0  
**最后更新**：2025-12-16  
**作者**：@Jiane
