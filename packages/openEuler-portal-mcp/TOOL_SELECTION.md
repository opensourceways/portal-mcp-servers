# Agent 工具选择指南

## Agent 如何选择工具？

Agent（如 Claude）通过以下信息来决定调用哪个工具：

### 1. 工具名称 (`name`)
- 简洁、描述性的名称
- 使用下划线分隔的小写命名
- 例如：`get_sig_info`, `get_openEuler_info`

### 2. 工具描述 (`description`)
这是最重要的部分！Agent 主要依靠描述来理解工具的用途。

**好的描述应该包括：**
- **简短总结**：一句话说明工具的主要功能
- **使用场景**：列出具体的使用情况
- **示例**：提供具体的输入示例
- **返回信息**：说明会返回什么样的结果

### 3. 输入参数 (`inputSchema`)
- 参数名称和类型
- 参数描述（包含示例）
- 必需/可选标记

## 本项目的工具

### 工具 1: `get_sig_info`

**何时使用：**
- 用户询问某个 SIG 的信息
- 用户想了解 SIG 的维护者
- 用户想查看 SIG 管理的仓库
- 用户询问 "谁负责 XXX"、"XXX SIG 的信息"

**触发关键词：**
- "SIG"、"特别兴趣小组"
- "维护者"、"maintainer"
- "仓库"、"repository"
- 具体的 SIG 名称（Kernel, ai, Cloud 等）

**示例用户问题：**
- "Kernel SIG 的信息是什么？"
- "谁是 ai SIG 的维护者？"
- "Cloud SIG 管理哪些仓库？"
- "告诉我关于 Networking SIG 的信息"

### 工具 2: `get_openEuler_info`

**何时使用：**
- 用户搜索 openEuler 文档内容
- 用户询问技术特性、功能
- 用户想了解某个技术概念
- 用户需要使用指南或文档

**触发关键词：**
- "搜索"、"查找"、"检索"
- "文档"、"说明"、"介绍"
- 技术术语（kernel, container, security 等）
- "如何"、"怎么"、"什么是"

**示例用户问题：**
- "搜索 openEuler 中关于 kernel 的信息"
- "openEuler 有哪些容器相关的特性？"
- "什么是 openEuler 的安全特性？"
- "查找性能优化相关的文档"

## 工具描述优化原则

### ✅ 好的描述

```javascript
{
  name: "get_sig_info",
  description: `查询 openEuler 特别兴趣小组（SIG）的详细信息。

SIG（Special Interest Group）是 openEuler 社区中负责特定技术领域的工作组。

**使用场景：**
- 查询某个 SIG 的基本信息
- 了解 SIG 的维护者和贡献者
- 查看 SIG 管理的代码仓库

**常见 SIG 名称示例：**
- Kernel（内核）
- ai（人工智能）
- Cloud（云计算）

**返回信息包括：**
- SIG 基本信息
- Maintainers 列表
- 代码仓库列表`,
  inputSchema: {
    type: "object",
    required: ["sig_name"],
    properties: {
      sig_name: {
        type: "string",
        description: "SIG 名称，例如：'Kernel'、'ai'、'Cloud'。不区分大小写。",
      },
    },
  },
}
```

### ❌ 不好的描述

```javascript
{
  name: "get_sig_info",
  description: "获取 SIG 信息",  // 太简短，缺少上下文
  inputSchema: {
    type: "object",
    required: ["sig_name"],
    properties: {
      sig_name: {
        type: "string",
        description: "SIG 名称",  // 缺少示例
      },
    },
  },
}
```

## 测试工具选择

你可以通过以下方式测试 Agent 是否能正确选择工具：

### 测试场景 1：SIG 查询
**用户问题：** "Kernel SIG 的维护者是谁？"
**期望工具：** `get_sig_info`
**参数：** `sig_name: "Kernel"`

### 测试场景 2：文档搜索
**用户问题：** "搜索 openEuler 中关于容器的文档"
**期望工具：** `get_openEuler_info`
**参数：** `query: "container"`

### 测试场景 3：模糊查询
**用户问题：** "openEuler 的 AI 相关内容"
**可能工具：**
- `get_sig_info` (sig_name: "ai") - 如果用户想了解 AI SIG
- `get_openEuler_info` (query: "ai") - 如果用户想搜索 AI 相关文档

Agent 会根据上下文和描述来做出最佳选择。

## 提示

1. **描述要详细**：Agent 只能通过描述来理解工具，描述越详细越好
2. **提供示例**：具体的示例帮助 Agent 理解如何使用
3. **说明场景**：明确列出使用场景，帮助 Agent 判断
4. **参数说明**：参数描述中包含示例值
5. **使用 Markdown**：描述支持 Markdown 格式，可以使用列表、加粗等

## 调试技巧

如果 Agent 选择了错误的工具：

1. **检查描述**：描述是否清晰地说明了工具的用途？
2. **添加场景**：在描述中添加更多使用场景
3. **提供示例**：添加具体的输入输出示例
4. **区分工具**：确保不同工具的描述有明显区别
5. **测试提示词**：尝试不同的用户问题，看 Agent 的选择是否合理
