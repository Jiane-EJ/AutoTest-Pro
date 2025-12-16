# AI 自动化测试平台 - 完整开发计划（2025年12月）

## 📋 文档说明

本文档是对原始开发方案的完整整合和细化，包含：
- 项目概述和核心特性
- 详细的功能需求和验收标准
- 标准化的测试用例格式
- 完整的技术架构设计
- 分阶段的开发计划
- 项目结构和文件组织

**文档版本**：1.0  
**最后更新**：2025-12-15  
**作者**：@Jiane

---

## 🎯 项目概述

### 项目名称
AI 自动化测试平台

### 项目目标
完全解放测试人员手工功能测试，通过 AI + MCP 工具链自动化执行网站功能测试。支持多领域隔离管理，每个测试项目独立运行、存储、报告。

### 核心价值
- 🚀 **自动化测试**：AI 自动分析需求、生成用例、执行测试
- 🔒 **数据隔离**：多项目完全隔离，防止数据串台
- 💬 **交互完善**：用户通过聊天与 AI 交互完善用例
- ⚡ **并发执行**：支持 10 个任务并发执行
- 📊 **智能报告**：自动生成 Bug 列表和整改建议

### 核心特性

1. **领域隔离管理**
   - 每个测试项目作为独立"领域"（Domain）
   - 所有数据、会话、用例、报告完全隔离
   - 防止多项目数据串台

2. **简化用户操作**
   - 创建/选择领域 → 输入网址 + 凭证 + 需求 → 点击运行
   - 三步完成测试配置，无需复杂操作

3. **AI 智能分析**
   - 使用 Sequential Thinking MCP 分析用户需求
   - 使用 Playwright MCP 实际探索网站结构
   - 结合 Context7 最佳实践生成测试用例

4. **交互式完善**
   - AI 生成初步用例后进入对话完善阶段
   - 用户通过实时聊天补充/修改用例
   - 支持添加新用例、删除用例、修改详情

5. **共享上下文并发**
   - 同一浏览器上下文中并发执行 10 个测试任务
   - 所有任务共享登录状态
   - 每个任务独立执行，互不干扰

6. **实时交互反馈**
   - WebSocket 实时推送执行日志、进度、Bug 信息
   - 支持 WebSocket 断线重连
   - 用户可随时补充新需求，AI 动态调整测试

7. **智能报告生成**
   - 自动汇总测试结果
   - 生成 Bug 列表（标题、描述、严重度、类别、复现步骤、整改建议）
   - 生成验收报告和整改建议清单

---

## 🎨 UI 设计规范

### 设计风格
- **主色调**：#1877f2（现代蓝）
- **设计理念**：现代极简风格，类似百度搜索的简洁体验
- **布局原则**：完全对称布局，无横向滚动条，竖向内容超出时显示滚动条

### 页面流程

#### 1. 领域管理页面（首页）
```
┌─────────────────────────────────────┐
│ AI 自动化测试平台                    │
├─────────────────────────────────────┤
│ [+ 创建新领域]                       │
├─────────────────────────────────────┤
│ 领域列表：                           │
│ ┌─────────────────────────────────┐ │
│ │ 电商后台测试                     │ │
│ │ 创建时间：2025-12-15             │ │
│ │ 最近测试：进行中                 │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 用户管理系统                     │ │
│ │ 创建时间：2025-12-14             │ │
│ │ 最近测试：已完成                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 2. 测试配置页面（领域内主页）
```
┌─────────────────────────────────────┐
│ 🌐 网址输入框                        │
│ https://example.com                 │
├─────────────────────────────────────┤
│ 👤 用户名（可选）                    │
│ [输入框]                            │
├─────────────────────────────────────┤
│ 🔑 密码（可选）                      │
│ [输入框]                            │
├─────────────────────────────────────┤
│ 📝 补充说明（测试路径、注意事项）    │
│ [大文本框]                          │
│ 示例：请重点测试购物车到支付全流程，│
│ 注意边界如库存不足、优惠券失效等    │
├─────────────────────────────────────┤
│ [🚀 开始 AI 测试]                    │
└─────────────────────────────────────┘
```

#### 3. 执行监控页面
```
┌─────────────────────────────────────┐
│ 执行进度：                           │
│ [初始化] → [分析需求] → [探索网站]  │
│ → [生成用例] → [用户确认] →         │
│ [并发执行] → [生成报告]             │
├─────────────────────────────────────┤
│ 左侧：测试用例 Todo 列表             │
│ ☑ 用例1                             │
│ ☐ 用例2                             │
│ ☐ 用例3                             │
├─────────────────────────────────────┤
│ 右侧：实时执行日志 + Bug 信息        │
│ [日志内容]                          │
├─────────────────────────────────────┤
│ 下方：实时聊天框                     │
│ 用户：请额外测试退款流程             │
│ AI：已添加新用例，正在执行...       │
└─────────────────────────────────────┘
```

#### 4. 报告页面
```
┌─────────────────────────────────────┐
│ 测试报告                             │
├─────────────────────────────────────┤
│ 测试总结统计：                       │
│ - 通过率：85%                        │
│ - Bug 数量：3                        │
│ - 执行时间：15 分钟                  │
├─────────────────────────────────────┤
│ Bug 列表：                           │
│ 1. 购物车数量输入框接受负数          │
│    严重度：高 | 类别：功能           │
│    复现步骤：...                     │
│    整改建议：...                     │
├─────────────────────────────────────┤
│ 验收报告：                           │
│ [报告内容]                          │
└─────────────────────────────────────┘
```

---

## 🏗️ 技术架构

### 前端技术栈
- **框架**：Next.js 16 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS + shadcn/ui
- **状态管理**：Zustand
- **实时通信**：WebSocket
- **HTTP 客户端**：Fetch API

### 后端技术栈
- **API 框架**：Next.js API Routes
- **AI 集成**：Vercel AI SDK
- **MCP 工具链**：
  - Sequential Thinking MCP（需求分析）
  - Playwright MCP（网站探索和测试执行）
  - Context7 MCP（测试最佳实践）
- **数据库**：SQLite（开发）/ PostgreSQL（生产）
- **文件存储**：本地文件系统
- **任务队列**：内存队列（开发）/ Redis Queue（生产）

### MCP 配置
```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

### AI 模型配置
- **默认模型**：GPT-4o
- **支持切换**：用户可配置其他模型（火山大模型、Qwen 等）
- **API 配置**：通过环境变量 `OPENAI_API_KEY` 配置

---

## 📊 数据模型

### Domain（领域）
```typescript
interface Domain {
  id: string                    // UUID
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
  id: string                    // UUID
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
  id: string                    // UUID
  projectId: string
  domainId: string
  name: string                 // 用例名称
  description: string          // 用例描述
  type: 'functional' | 'boundary' | 'security' | 'performance'
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  preconditions: string        // 前置条件
  steps: TestStep[]           // 测试步骤
  postconditions: string      // 后置条件
  tags: string[]              // 标签
  estimatedTime: number       // 预计执行时间（秒）
  result?: TestResult
  createdAt: Date
}
```

### TestStep（测试步骤）
```typescript
interface TestStep {
  id: string
  stepNo: number              // 步骤序号
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

---

## 🔄 工作流程

### 用户操作流程
```
1. 用户访问平台
   ↓
2. 创建/选择测试领域
   ↓
3. 输入测试网址、凭证、需求
   ↓
4. 点击"开始 AI 测试"
   ↓
5. AI 分析需求并探索网站
   ↓
6. AI 生成初步测试用例
   ↓
7. 用户通过聊天完善用例
   ↓
8. 用户确认"开始执行"
   ↓
9. AI 并发执行测试任务
   ↓
10. 实时显示执行进度和 Bug
   ↓
11. 生成完整测试报告
```

### AI 执行流程
```
1. 需求分析
   - 使用 Sequential Thinking MCP 分析用户需求
   - 提取关键测试点和优先级

2. 网站探索
   - 使用 Playwright MCP 打开网址
   - 使用用户提供的凭证登录
   - 遍历关键页面，构建功能地图
   - 利用 accessibility tree 分析页面元素

3. 用例生成
   - 结合需求分析和网站探索结果
   - 使用 Context7 查询测试最佳实践
   - 生成结构化的测试用例

4. 交互完善
   - 展示初步用例给用户
   - 接收用户反馈
   - 根据反馈更新用例

5. 并发执行
   - 将用例拆分成独立任务
   - 支持最多 10 个任务并发
   - 所有任务共享同一浏览器上下文
   - 任务失败自动重试 3 次

6. 报告生成
   - 汇总所有任务结果
   - 生成 Bug 列表
   - 生成验收报告和整改建议
```

### 并发 AI 调用策略

| 流程 | 触发时机 | AI 任务 | 并发数 | 说明 |
|------|---------|--------|--------|------|
| 需求分析 | 用户点击"开始 AI 测试" | Sequential Thinking 分析需求 | 1 | 串行执行 |
| 网站探索 | 需求分析完成后 | Playwright MCP 探索网站 | 1 | 串行执行 |
| 用例生成 | 网站探索完成后 | 生成初步测试用例 | 1 | 串行执行 |
| 用例更新 | 用户提交修改后 | 根据用户反馈更新用例 | 1 | 串行执行 |
| 并发执行 | 用户确认用例后 | 并发执行 10 个测试任务 | 10 | 并行执行 |
| 报告生成 | 所有任务完成后 | 汇总结果并生成报告 | 1 | 串行执行 |

**并发调用规则**：
- 每个 AI 调用都是独立的异步任务
- 不同流程的 AI 调用可以并发进行（如用例更新和报告生成可以同时进行）
- 同一流程内的多个任务使用内存队列管理
- 每个 AI 调用都有独立的超时控制和错误处理

---

## 📁 项目结构

```
ai-auto-test/
├── .kiro/
│   └── specs/
│       └── ai-auto-test-platform/
│           ├── requirements.md          # 需求规格书
│           ├── design.md               # 设计文档
│           ├── tasks.md                # 任务列表
│           └── DEVELOPMENT_PLAN.md     # 本文档
├── .task/                              # 项目规划文档
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── domains/               # 领域管理 API
│   │   │   │   ├── create/
│   │   │   │   ├── list/
│   │   │   │   ├── [domainId]/
│   │   │   │   └── delete/
│   │   │   ├── test/                  # 测试相关 API
│   │   │   │   ├── analyze/
│   │   │   │   ├── generate/
│   │   │   │   ├── execute/
│   │   │   │   └── report/
│   │   │   └── chat/                  # 聊天 API
│   │   │       ├── send/
│   │   │       └── history/
│   │   ├── [domainId]/                # 领域内页面
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        # shadcn/ui 组件
│   │   ├── domains/                   # 领域管理组件
│   │   ├── test-config/               # 测试配置组件
│   │   ├── test-monitor/              # 测试监控组件
│   │   ├── interactive-chat/          # 聊天组件
│   │   └── reports/                   # 报告组件
│   ├── lib/
│   │   ├── ai-agent.ts               # AI Agent 核心逻辑
│   │   ├── mcp-client.ts             # MCP 客户端
│   │   ├── domain-manager.ts         # 领域管理器
│   │   ├── test-manager.ts           # 测试任务管理器
│   │   ├── storage.ts                # 数据存储层
│   │   ├── websocket.ts              # WebSocket 管理
│   │   └── utils.ts                  # 工具函数
│   ├── hooks/
│   │   ├── use-domain-state.ts
│   │   ├── use-test-state.ts
│   │   ├── use-websocket.ts
│   │   └── use-test-progress.ts
│   ├── types/
│   │   ├── domain.types.ts
│   │   ├── test.types.ts
│   │   ├── ai.types.ts
│   │   └── api.types.ts
│   └── styles/
│       ├── globals.css
│       └── components.css
├── public/
├── .env.local.example
├── .env.local
├── components.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
└── README.md
```

---

## 🚀 开发阶段

### Phase 1: 基础架构（1-2 周）
**目标**：搭建项目基础框架，完成基础 UI 组件和数据模型设计

- [ ] 项目初始化和依赖配置
- [ ] 基础 UI 组件开发（Button、Input、Card、Progress 等）
- [ ] 数据模型设计和数据库初始化
- [ ] 基础 API 框架搭建
- [ ] TypeScript 类型定义

### Phase 2: 前端核心功能（2-3 周）
**目标**：完成前端页面开发，实现用户交互

- [ ] 领域管理页面（列表、创建、删除）
- [ ] 测试配置页面（表单输入）
- [ ] 执行监控页面（进度、日志、聊天）
- [ ] 报告展示页面
- [ ] WebSocket 客户端集成

### Phase 3: 后端核心功能（2-3 周）
**目标**：完成后端 API 和 AI Agent 框架

- [ ] 领域管理 API（CRUD 操作）
- [ ] 测试配置 API
- [ ] AI Agent 框架和 MCP 集成
- [ ] WebSocket 服务器实现
- [ ] 数据存储和持久化

### Phase 4: AI 测试功能（3-4 周）
**目标**：实现 AI 测试的核心功能

- [ ] 需求分析模块（Sequential Thinking）
- [ ] 网站探索模块（Playwright MCP）
- [ ] 用例生成模块
- [ ] 交互完善模块（聊天交互）
- [ ] 并发执行模块（10 个任务并发）
- [ ] 报告生成模块

### Phase 5: 优化和完善（1-2 周）
**目标**：性能优化、错误处理、用户体验优化

- [ ] 性能优化（缓存、并发优化）
- [ ] 错误处理和重试机制
- [ ] 用户体验优化
- [ ] 文档完善
- [ ] 测试和 Bug 修复

---

## ✅ 验收标准

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
- ✅ 浏览器关闭后自动清除所有临时数据

### 性能验收
- ✅ 单个测试任务预期执行时间：5-30 分钟
- ✅ 支持 10 个并发任务
- ✅ WebSocket 消息推送延迟 < 1 秒

---

## 📝 关键决策

### 1. 数据存储
- **开发阶段**：使用 SQLite 本地存储
- **生产阶段**：迁移到 PostgreSQL
- **文件存储**：本地文件系统（可扩展到云存储）

### 2. 凭证管理
- **存储方式**：仅在当前会话临时存储
- **清除时机**：浏览器关闭时自动清除
- **加密方式**：不加密（临时存储）

### 3. 并发策略
- **浏览器上下文**：所有任务共享同一浏览器上下文
- **登录状态**：共享登录状态
- **任务隔离**：每个任务独立执行，互不干扰

### 4. 错误处理
- **任务失败重试**：自动重试 3 次
- **MCP 工具失败**：由 AI 判断是否必要
  - 必要的操作：重试 3 次，失败则终止
  - 非必要的操作：记录错误，继续执行

### 5. 测试用例格式
- **格式**：JSON 结构化格式
- **包含字段**：id、name、description、type、priority、preconditions、steps、postconditions、tags、estimatedTime
- **步骤格式**：stepNo、action、expectedResult

---

## 🔗 相关文档

- [需求规格书](./requirements.md)

---

**文档版本**：1.0  
**最后更新**：2025-12-15  
**作者**：@Jiane
