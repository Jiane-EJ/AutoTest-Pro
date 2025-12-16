# AI 自动化测试平台
完全解放测试人员手工功能测试，通过 AI + MCP 工具链自动化执行网站功能测试。支持多领域隔离管理，每个测试项目独立运行、存储、报告。

## 🎯 项目特性

- 🤖 **AI 驱动**：使用 AI 智能分析测试需求并生成测试用例
- 🔧 **MCP 工具链**：集成 Sequential Thinking、Context7、Playwright 等工具
- 📊 **实时监控**：实时显示测试进度、日志和浏览器预览
- 💾 **本地数据库**：使用 SQLite 进行本地数据存储
- 📝 **完整日志**：详细的测试日志记录和控制台输出
- 🎨 **现代 UI**：基于 Tailwind CSS 的响应式界面

## 🛠️ 技术栈

### 前端
- **Next.js 16** - React 框架（App Router）
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库

### 后端
- **Next.js API Routes** - API 服务
- **SQLite** - 数据库（开发环境）
- **WebSocket** - 实时通信

### AI & 工具
- **Qwen qwen-vl-max** - AI 模型
- **MCP Tools**：
  - `sequential-thinking` - 逐步思考
  - `context7` - 文档查询
  - `playwright` - 浏览器自动化

## 📦 安装和运行

### 环境要求

- Node.js 18+
- npm

### 安装依赖

```bash
npm install
```

### 环境配置

复制 `.env.local.example` 到 `.env.local` 并配置相关参数：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
# AI 厂商配置
AI_PROVIDER=qwen
QWEN_API_KEY=your-qwen-api-key
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 数据库配置
DATABASE_PATH=./database/test.db

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs
```

### MCP 配置

在您的 MCP 客户端配置中添加：

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

### 运行项目

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start
```

## 🔄 使用流程

1. **配置测试信息**：在界面中输入测试网址、账号、密码和测试需求
2. **开始 AI 测试**：点击"开始测试"按钮
3. **实时监控**：查看测试步骤时间轴、实时预览和系统日志
4. **获取结果**：测试完成后查看详细的测试报告

## 📁 项目结构

```
├── app/                  # 核心路由目录（App Router）
│   ├── api/              # API routes（Route Handlers）
│   │   ├── test/         # 测试相关API
│   │   └── ws/           # WebSocket API
│   ├── globals.css       # 全局样式
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 主页面
├── components/           # 可复用 UI/组件
│   ├── ui/               # 基础UI组件
│   └── dashboard/        # 仪表板组件
├── hooks/                # 自定义 hooks
├── lib/                  # 工具、数据库连接、Server Actions
├── utils/                # 通用工具
├── types/                # TS 类型
├── design/               # 设计图，原型图
├── database/             # 数据库文件
├── logs/                 # 日志目录
├── public/               # 静态资源
└── .env.local            # 环境变量配置
```

## 🚀 主要功能

### 1. 智能测试分析
- AI 分析测试需求
- 自动生成测试用例
- 智能识别页面元素

### 2. 实时测试执行
- Playwright 自动化浏览器操作
- MCP 工具链集成
- 实时状态更新

### 3. 可视化监控
- 测试步骤时间轴
- 实时浏览器预览
- 系统日志实时显示

### 4. 数据管理
- SQLite 本地数据库
- 测试会话管理
- 完整日志记录

## 🔧 开发指南

### 添加新的测试步骤

1. 在 `lib/aiTestRunner.ts` 中的 `testSteps` 数组添加新步骤
2. 在 `runAITest` 函数中添加对应的执行逻辑
3. 更新相关的 MCP 工具调用

### 扩展 MCP 工具

1. 在 `lib/aiTestRunner.ts` 中的 `callMCPTool` 函数添加新工具
2. 配置相应的 MCP 服务器
3. 更新工具调用逻辑

### 自定义 UI 组件

1. 在 `components/ui/` 目录创建新组件
2. 在主页面 `app/page.tsx` 中导入和使用
3. 确保遵循现有的设计规范

## 📝 注意事项

1. 确保 `.env.local` 文件正确配置
2. MCP 服务器需要正常运行
3. 数据库文件会自动创建在 `database/` 目录
4. 所有日志会保存在 `logs/` 目录
5. WebSocket 服务运行在端口 3001

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

MIT License
