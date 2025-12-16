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
</coding_guidelines>
