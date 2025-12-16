# AI 自动化测试平台 - 需求规格书

## 项目概述

AI 驱动的 Web 功能自动化测试平台，通过 AI + MCP 工具链自动化执行网站功能测试。支持多领域隔离管理，每个测试项目独立运行、存储、报告。

## 核心特性

1. **领域隔离管理**：每个测试项目作为独立"领域"，所有数据完全隔离
2. **简化用户操作**：创建领域 → 输入网址 + 凭证 + 需求 → 点击运行
3. **AI 智能分析**：AI 分析需求并使用 Playwright MCP 探索网站结构
4. **交互式完善**：用户通过实时聊天完善测试用例
5. **共享上下文并发**：同一浏览器上下文中并发执行 10 个测试任务
6. **实时反馈**：WebSocket 推送执行日志、进度、Bug 信息
7. **智能报告**：生成 Bug 列表、验收报告、整改建议

## 功能需求

### 1. 领域管理模块

**用户故事**：作为测试管理员，我想创建和管理多个独立的测试项目，以便隔离不同系统的测试数据。

**验收标准**：
- 用户可以创建新领域（输入名称、描述）
- 显示所有领域列表（名称、创建时间、最近测试状态）
- 支持删除领域（清除所有关联数据）
- 点击领域进入测试配置页面
- 每个领域有独立的 ID，所有数据按 domainId 隔离存储

### 2. 测试配置模块

**用户故事**：作为测试人员，我想输入测试目标网站信息和需求，以便 AI 自动生成测试用例。

**验收标准**：
- 输入框：目标网站 URL（必填）
- 输入框：用户名（可选，用于登录）
- 输入框：密码（可选，用于登录）
- 文本框：测试需求和重点测试点（可选）
- 点击"开始 AI 测试"按钮启动测试流程
- 凭证仅在当前会话中临时存储，浏览器关闭后清除
- 所有配置数据按 domainId 隔离

### 3. AI 需求分析模块

**用户故事**：作为 AI 代理，我需要分析用户输入的测试需求，生成初步测试用例。

**验收标准**：
- 使用 Sequential Thinking MCP 分析用户需求
- 使用 Playwright MCP 探索目标网站结构
- 生成初步测试用例列表（包含用例名称、描述、优先级、类型）
- 测试用例类型：functional（功能）、boundary（边界）、security（安全）、performance（性能）
- 优先级：high、medium、low
- 将用例展示给用户进行交互完善

### 4. 交互式用例完善模块

**用户故事**：作为测试人员，我想通过实时聊天与 AI 交互，补充和修改测试用例。

**验收标准**：
- 显示 AI 生成的初步用例列表（Todo List）
- 用户可以在聊天框输入补充需求或修改建议
- 用户点击"提交修改"后，系统将对话内容发送给 AI 进行更新
- AI 实时更新 Todo 列表中的用例
- 支持添加新用例、删除用例、修改用例详情
- 用户确认"开始执行"后进入并发执行阶段
- 聊天消息仅在当前会话保存，浏览器关闭后清除
- WebSocket 支持断线重连
- 系统支持并发启动多个 AI 模型调用，处理不同的流程（需求分析、用例生成、用例更新等）

### 5. 并发执行模块

**用户故事**：作为测试系统，我需要在同一浏览器上下文中并发执行多个测试任务。

**验收标准**：
- 支持同时执行最多 10 个测试任务
- 所有任务共享同一浏览器上下文（登录状态共享）
- 每个任务独立执行，互不干扰
- 任务失败时自动重试 3 次
- 重试失败后终止该任务，告知用户
- MCP 工具调用失败时，由 AI 判断是否必要：
  - 必要的操作：重试 3 次，失败则终止
  - 非必要的操作：记录错误，继续执行
- 内存队列管理任务，支持最多 10 个并发

### 并发 AI 调用策略

系统支持并发启动多个 AI 模型调用，处理不同的流程：

| 流程 | 触发时机 | AI 任务 | 并发数 |
|------|---------|--------|--------|
| 需求分析 | 用户点击"开始 AI 测试" | 使用 Sequential Thinking 分析需求 | 1 |
| 网站探索 | 需求分析完成后 | 使用 Playwright MCP 探索网站结构 | 1 |
| 用例生成 | 网站探索完成后 | 生成初步测试用例 | 1 |
| 用例更新 | 用户提交修改后 | 根据用户反馈更新用例 | 1 |
| 并发执行 | 用户确认用例后 | 并发执行 10 个测试任务 | 10 |
| 报告生成 | 所有任务完成后 | 汇总结果并生成报告 | 1 |

**并发调用规则**：
- 每个 AI 调用都是独立的异步任务
- 不同流程的 AI 调用可以并发进行（如用例更新和报告生成可以同时进行）
- 同一流程内的多个任务使用内存队列管理
- 每个 AI 调用都有独立的超时控制和错误处理

### 6. 实时反馈模块

**用户故事**：作为测试人员，我想实时看到测试执行进度、日志和 Bug 信息。

**验收标准**：
- 显示执行步骤进度条（初始化 → 分析需求 → 探索网站 → 生成用例 → 用户确认 → 并发执行 → 生成报告）
- 实时显示执行日志（每个任务的执行步骤、结果）
- 实时显示发现的 Bug（Bug 标题、描述、严重度、类别）
- WebSocket 推送实时数据到前端
- 支持 WebSocket 断线重连
- 用户可在聊天框输入新需求，AI 动态调整测试

### 7. 报告生成模块

**用户故事**：作为测试人员，我想获得完整的测试报告，包括 Bug 列表和整改建议。

**验收标准**：
- 测试完成后自动生成报告
- 报告包含：
  - 测试总结统计（通过率、Bug 数量、执行时间）
  - Bug 列表（Bug 标题、描述、严重度、类别、复现步骤、整改建议）
  - 验收报告（测试覆盖范围、测试结果、风险评估）
  - 整改建议清单
- 暂不支持截图，仅记录 Bug 路径和描述
- 报告数据按 domainId 隔离存储

### 8. 实时用户干预模块

**用户故事**：作为测试人员，我想在测试执行过程中随时补充新需求或调整测试。

**验收标准**：
- 测试执行中用户可在聊天框输入新需求
- AI 立即响应并动态调整测试任务
- 支持暂停、继续、停止单个任务
- 支持添加新的测试用例并立即执行
- 所有操作实时反馈到前端

## 测试用例标准格式

AI 生成的测试用例必须遵循以下标准格式，确保结构化和可执行性：

```json
{
  "id": "tc_001",
  "name": "用例名称",
  "description": "用例描述和目的",
  "type": "functional",
  "priority": "high",
  "preconditions": "前置条件（如已登录、已进入某页面）",
  "steps": [
    {
      "stepNo": 1,
      "action": "具体操作描述",
      "expectedResult": "预期结果"
    },
    {
      "stepNo": 2,
      "action": "具体操作描述",
      "expectedResult": "预期结果"
    }
  ],
  "postconditions": "后置条件（如返回首页、清除数据）",
  "tags": ["标签1", "标签2"],
  "estimatedTime": 300
}
```

### 字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | string | 用例唯一标识 | tc_001 |
| name | string | 用例名称（简洁明了） | 用户登录功能测试 |
| description | string | 用例目的和背景 | 验证用户能否使用正确的账号密码登录系统 |
| type | enum | 用例类型 | functional / boundary / security / performance |
| priority | enum | 优先级 | high / medium / low |
| preconditions | string | 前置条件 | 用户未登录，浏览器已打开登录页面 |
| steps | array | 测试步骤数组 | 见下表 |
| postconditions | string | 后置条件 | 用户已登录，页面跳转到首页 |
| tags | array | 标签（用于分类） | ["登录", "用户管理", "核心功能"] |
| estimatedTime | number | 预计执行时间（秒） | 300 |

### 测试步骤格式

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| stepNo | number | 步骤序号 | 1 |
| action | string | 具体操作（动词+对象+参数） | 在用户名输入框输入"test@example.com" |
| expectedResult | string | 预期结果 | 输入框显示"test@example.com" |

### 用例类型定义

- **functional**：功能测试，验证功能是否按预期工作
- **boundary**：边界测试，测试边界值和异常情况（如空值、超长字符串、特殊字符）
- **security**：安全测试，测试安全相关功能（如密码强度、SQL 注入、XSS 等）
- **performance**：性能测试，测试系统性能（如加载时间、响应速度）

### 优先级定义

- **high**：核心功能，必须测试
- **medium**：重要功能，应该测试
- **low**：辅助功能，可选测试

### 用例生成提示词

AI 生成测试用例时应遵循以下原则：

1. **结构化**：每个用例必须包含完整的前置条件、步骤、后置条件
2. **可执行性**：每个步骤必须具体、明确，能被自动化工具执行
3. **覆盖性**：覆盖正常流程、边界情况、异常情况
4. **独立性**：每个用例应该相对独立，不依赖其他用例的结果
5. **可追溯性**：每个用例应该能追溯到具体的需求或功能点
6. **合理性**：用例数量应该合理，避免过多或过少

### 用例生成示例

**需求**：测试电商网站的购物车功能

**生成的用例**：

```json
[
  {
    "id": "tc_cart_001",
    "name": "添加商品到购物车",
    "description": "验证用户能否成功添加商品到购物车",
    "type": "functional",
    "priority": "high",
    "preconditions": "用户已登录，浏览器已打开商品详情页面",
    "steps": [
      {
        "stepNo": 1,
        "action": "点击商品数量输入框，输入数量'2'",
        "expectedResult": "输入框显示'2'"
      },
      {
        "stepNo": 2,
        "action": "点击'加入购物车'按钮",
        "expectedResult": "页面显示'已添加到购物车'提示，购物车图标显示商品数量'2'"
      },
      {
        "stepNo": 3,
        "action": "点击购物车图标进入购物车页面",
        "expectedResult": "购物车页面显示刚添加的商品，数量为'2'"
      }
    ],
    "postconditions": "用户在购物车页面，可以继续购物或结算",
    "tags": ["购物车", "商品管理", "核心功能"],
    "estimatedTime": 120
  },
  {
    "id": "tc_cart_002",
    "name": "购物车数量边界测试",
    "description": "验证购物车对异常数量输入的处理",
    "type": "boundary",
    "priority": "medium",
    "preconditions": "用户已登录，浏览器已打开商品详情页面",
    "steps": [
      {
        "stepNo": 1,
        "action": "点击商品数量输入框，输入'0'",
        "expectedResult": "系统提示'数量必须大于0'或自动调整为'1'"
      },
      {
        "stepNo": 2,
        "action": "点击商品数量输入框，输入'999999'",
        "expectedResult": "系统提示'超出库存'或显示最大可购买数量"
      },
      {
        "stepNo": 3,
        "action": "点击商品数量输入框，输入特殊字符'@#$'",
        "expectedResult": "输入框不接受特殊字符或自动清除"
      }
    ],
    "postconditions": "用户回到商品详情页面，购物车未被修改",
    "tags": ["购物车", "边界测试", "数据验证"],
    "estimatedTime": 180
  }
]
```

---

## 数据模型

### Domain（领域）
```typescript
interface Domain {
  id: string                    // 唯一标识
  name: string                  // 领域名称
  description?: string          // 描述
  createdAt: Date              // 创建时间
  updatedAt: Date              // 更新时间
  status: 'active' | 'inactive' // 状态
}
```

### TestProject（测试项目）
```typescript
interface TestProject {
  id: string                    // 唯一标识
  domainId: string             // 所属领域 ID
  url: string                  // 测试网址
  credentials?: {
    username?: string          // 用户名（临时存储）
    password?: string          // 密码（临时存储）
  }
  requirements: string         // 测试需求
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
  updatedAt: Date
}
```

### TestCase（测试用例）
```typescript
interface TestCase {
  id: string
  projectId: string
  domainId: string
  name: string                 // 用例名称
  description: string          // 用例描述
  type: 'functional' | 'boundary' | 'security' | 'performance'
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  steps: TestStep[]           // 测试步骤
  result?: TestResult
  createdAt: Date
}
```

### TestStep（测试步骤）
```typescript
interface TestStep {
  id: string
  description: string         // 步骤描述
  action: string             // 执行动作
  expectedResult: string     // 预期结果
  actualResult?: string      // 实际结果
  status: 'pending' | 'running' | 'passed' | 'failed'
  error?: string             // 错误信息
}
```

### TestResult（测试结果）
```typescript
interface TestResult {
  id: string
  testCaseId: string
  status: 'passed' | 'failed' | 'skipped'
  executionTime: number      // 执行时间（毫秒）
  bugs: Bug[]
  logs: string[]
}
```

### Bug（Bug 报告）
```typescript
interface Bug {
  id: string
  testCaseId: string
  domainId: string
  title: string              // Bug 标题
  description: string        // Bug 描述
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'functional' | 'ui' | 'security' | 'performance'
  steps: string[]            // 复现步骤
  recommendation: string     // 整改建议
  createdAt: Date
}
```

### ChatMessage（聊天消息）
```typescript
interface ChatMessage {
  id: string
  domainId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
```

## 技术约束

### 前端
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Zustand 状态管理
- WebSocket 实时通信

### 后端
- Next.js API Routes
- Vercel AI SDK + MCP 工具链
- SQLite (开发) / PostgreSQL (生产)
- 内存队列 (开发) / Redis Queue (生产)

### AI 工具链
- Sequential Thinking MCP：需求分析
- Playwright MCP：网站探索和测试执行
- Context7 MCP：测试最佳实践查询
- 默认 AI 模型：GPT-4o（用户可配置）

### 数据隔离
- 所有数据表增加 `domainId` 字段
- 所有查询必须带 `domainId` 过滤
- 文件存储路径：`storage/${domainId}/`

## 非功能需求

### 性能
- 单个测试任务预期执行时间：5-30 分钟（取决于网站复杂度）
- 支持 10 个并发任务
- WebSocket 消息推送延迟 < 1 秒

### 可靠性
- 任务失败自动重试 3 次
- WebSocket 支持断线重连
- MCP 工具调用失败时智能降级

### 安全性
- 凭证仅在当前会话临时存储
- 浏览器关闭后自动清除所有临时数据
- 所有数据按 domainId 隔离

### 用户体验
- 现代蓝白极简风格（主色调 #1877f2）
- 完全对称布局，无横向滚动条
- 实时反馈和进度显示

## 开发阶段

### Phase 1: 基础架构（1-2 周）
- [ ] 项目初始化和依赖配置
- [ ] 基础 UI 组件开发（Button、Input、Card 等）
- [ ] 数据模型设计和数据库初始化
- [ ] 基础 API 框架搭建

### Phase 2: 前端核心功能（2-3 周）
- [ ] 领域管理页面（列表、创建、删除）
- [ ] 测试配置页面（表单输入）
- [ ] 执行监控页面（进度、日志、聊天）
- [ ] 报告展示页面

### Phase 3: 后端核心功能（2-3 周）
- [ ] 领域管理 API
- [ ] 测试配置 API
- [ ] AI Agent 框架和 MCP 集成
- [ ] WebSocket 实时通信

### Phase 4: AI 测试功能（3-4 周）
- [ ] 需求分析模块
- [ ] 网站探索模块
- [ ] 用例生成模块
- [ ] 交互完善模块
- [ ] 并发执行模块
- [ ] 报告生成模块

### Phase 5: 优化和完善（1-2 周）
- [ ] 性能优化
- [ ] 错误处理和重试机制
- [ ] 用户体验优化
- [ ] 文档完善

## 验收标准

### 功能验收
- ✅ 用户可以创建和管理多个独立的测试领域
- ✅ 用户可以输入测试网址、凭证和需求
- ✅ AI 可以自动分析需求并生成初步测试用例
- ✅ 用户可以通过聊天与 AI 交互完善用例
- ✅ 系统可以并发执行 10 个测试任务
- ✅ 系统实时推送执行进度和 Bug 信息
- ✅ 系统生成完整的测试报告

### 质量验收
- ✅ 所有数据按 domainId 完全隔离
- ✅ 任务失败自动重试 3 次
- ✅ WebSocket 支持断线重连
- ✅ 凭证仅在当前会话临时存储

---

**文档版本**：1.0  
**最后更新**：2025-12-15  
**作者**：@Jiane
