# Implementation Plan

- [x] 1. 凭证管理服务

  - [x] 1.1 创建 CredentialService 类


    - 实现凭证加密存储功能
    - 实现凭证解密读取功能
    - 实现凭证掩码显示功能
    - 实现凭证清除功能
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 1.2 编写属性测试：凭证加密存储 Round-Trip
    - **Property 2: 凭证加密存储 Round-Trip**
    - **Validates: Requirements 2.1, 2.2**
  - [ ]* 1.3 编写属性测试：凭证掩码显示
    - **Property 3: 凭证掩码显示**
    - **Validates: Requirements 2.3**


- [ ] 2. MCP 执行器实现
  - [x] 2.1 创建 PlaywrightMCPExecutor 类


    - 实现 navigate 方法
    - 实现 fill 方法
    - 实现 click 方法
    - 实现 getVisibleHtml 方法
    - 实现 getVisibleText 方法
    - 实现 evaluate 方法
    - 实现 screenshot 方法
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ]* 2.2 编写单元测试：MCP 执行器方法
    - 测试各方法的基本功能
    - 测试错误处理
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [ ] 3. AI Tool Agent 核心实现
  - [x] 3.1 完善 AIToolAgent 类


    - 集成 CredentialService
    - 集成 PlaywrightMCPExecutor
    - 实现工具调用日志记录
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2_
  - [ ]* 3.2 编写属性测试：页面访问工具调用序列
    - **Property 1: 页面访问工具调用序列**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  - [ ]* 3.3 编写属性测试：工具调用日志完整性
    - **Property 7: 工具调用日志完整性**
    - **Validates: Requirements 6.1, 6.2**
  - [ ]* 3.4 编写属性测试：maxSteps 限制
    - **Property 9: maxSteps 限制工具调用次数**
    - **Validates: Requirements 8.4**
  - [x]* 3.5 编写属性测试：工具调用记录收集完整性


    - **Property 10: 工具调用记录收集完整性**

    - **Validates: Requirements 8.5**



- [ ] 4. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. 菜单导航功能
  - [x] 5.1 实现菜单导航逻辑

    - 实现单级菜单点击


    - 实现多级菜单导航
    - 实现菜单未找到时的处理
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 5.2 编写属性测试：菜单导航工具调用
    - **Property 4: 菜单导航工具调用**
    - **Validates: Requirements 3.1, 3.2**

- [ ] 6. 选择器生成器
  - [ ] 6.1 创建 SelectorGenerator 类
    - 实现 ID 选择器生成

    - 实现 name 选择器生成


    - 实现文本/位置选择器生成
    - 实现选择器优先级逻辑
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 6.2 编写属性测试：选择器生成优先级
    - **Property 5: 测试用例选择器生成优先级**


    - **Validates: Requirements 5.2, 5.3, 5.4**

  - [x]* 6.3 编写属性测试：测试用例必须包含选择器和 actionType


    - **Property 6: 测试用例必须包含选择器和 actionType**
    - **Validates: Requirements 5.1, 5.5**

- [x] 7. 测试执行器改造


  - [ ] 7.1 改造 TestExecutor 使用真实 Playwright 工具
    - 根据 actionType 调用对应工具


    - 实现步骤执行失败时的截图和错误记录
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x]* 7.2 编写属性测试：测试执行器工具映射


    - **Property 8: 测试执行器工具映射**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**


- [ ] 8. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.


- [x] 9. API 路由实现


  - [ ] 9.1 创建 /api/test/agent-analyze 路由
    - 接收 URL、凭证占位符、需求
    - 从数据库读取真实凭证
    - 调用 AIToolAgent 执行分析
    - 返回页面信息和工具调用记录

    - _Requirements: 1.1, 1.4, 4.1, 4.2_
  - [ ] 9.2 更新 /api/test/generate 路由
    - 使用真实页面信息生成测试用例
    - 确保测试用例包含选择器
    - _Requirements: 5.1, 5.5_
  - [ ] 9.3 更新 /api/test/execute 路由
    - 使用改造后的 TestExecutor
    - 记录工具调用日志
    - _Requirements: 7.1, 6.1_

- [ ] 10. 前端交互完善
  - [ ] 10.1 更新测试配置表单
    - 添加凭证输入（显示占位符）
    - 添加目标菜单输入
    - _Requirements: 2.3, 3.1_
  - [ ] 10.2 添加页面结构展示组件
    - 展示 AI Agent 获取的页面结构
    - 支持用户确认和修改
    - _Requirements: 4.1, 4.3_
  - [ ] 10.3 添加工具调用日志展示
    - 以时间线形式展示工具调用过程
    - _Requirements: 6.4_

- [ ] 11. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
