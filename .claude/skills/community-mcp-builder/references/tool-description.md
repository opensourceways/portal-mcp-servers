# 工具描述（description）质量指南

`toolDefinition.description` 是 MCP 工具最关键的字段。LLM 完全依赖它决定：
1. **是否调用**这个工具（触发准确性）
2. **如何填写参数**（参数填写正确性）
3. **何时不应该调用**（避免误触发）

描述写得差，工具就会被忽视或误用，再好的实现也没有意义。

---

## 描述的四要素

### 1. 核心功能（一句话）

开门见山说清楚这个工具**做什么**。

```
✅ 好：查询 openUBMC 社区 SIG（Special Interest Group）的详细信息和成员贡献统计。
❌ 差：这个工具提供了各种关于 SIG 的查询功能。
```

### 2. 触发场景（何时使用）

明确列出用户会用什么自然语言来触发这个工具。这些词语/模式直接影响 LLM 的触发判断。

```
✅ 好：
**何时使用：**
- 用户询问"XXX SIG 的信息"、"XXX SIG 有哪些成员"
- 用户想了解某 SIG 最近的贡献情况
- 用户查询 SIG 管理的代码仓库列表

❌ 差：
用于查询 SIG 信息。
```

### 3. 排除场景（何时不用）

帮助 LLM 区分边界，避免与相似工具混淆。这一条很多人忽略，但对精确触发很关键。

```
✅ 好：
**何时不用：**
- 查询技术委员会等治理组织（请用 get_organization_info）
- 查询软件包信息（请用 get_package_info）
- 修改或创建 SIG（本工具只读）

❌ 差：（无排除场景说明）
```

### 4. 参数说明（如何填写）

每个参数的 `description` 字段要说明：
- 接受什么格式
- 有哪些有效值（enum 的）
- 默认行为是什么
- 支持什么样的输入（如：模糊、大小写不敏感）

```
✅ 好：
sig_name：SIG 名称，大小写不敏感，支持模糊输入（如输入 "infra" 可匹配 "Infrastructure"）

❌ 差：
sig_name：SIG 的名称
```

---

## 完整描述示例

### 示例 1：SIG 查询工具

```javascript
description: `查询 openUBMC 社区 SIG（Special Interest Group）的详细信息和成员贡献统计。

**何时使用：**
- 用户询问某个 SIG 的信息、组织结构、仓库列表
- 用户想了解某 SIG 的 PR/Issue/Comment 贡献排行
- 用户查询"infrastructure SIG 是做什么的"

**何时不用：**
- 查询技术委员会等治理组织 → 用 get_organization_info
- 查询软件包/应用信息 → 用 get_package_info
- 不知道 SIG 名称时先用 query_type="sig" 加空 sig_name 列出所有 SIG

**参数：**
- sig_name：SIG 名称，大小写不敏感，支持模糊输入（空值时返回所有 SIG 列表）
- query_type：
  - "sig"（默认）：查询 SIG 基本信息、成员、仓库
  - "contribute"：查询成员贡献统计（PR/Issue/Comment 排行）

**示例问题：**
- "Infrastructure SIG 有哪些 maintainer？"
- "查一下 BMC SIG 最近谁贡献最多"
- "openUBMC 有哪些 SIG？"`,
```

### 示例 2：文档搜索工具

```javascript
description: `在 openUBMC 文档中心搜索、浏览和获取文档内容。支持目录浏览、关键词搜索和页面内容提取。

**何时使用：**
- 用户询问"如何安装/配置/使用 XXX"类技术问题
- 用户想找某个功能的文档
- 用户说"给我看看 XXX 的文档"
- 用户需要获取某个文档页面的完整内容

**查询模式（query_type）：**
- "toc"（默认）：浏览文档目录，按章节列出文档链接
- "search"：按关键词搜索，返回匹配的文档列表
- "fetch"：获取指定 URL 的文档页面内容（转换为 Markdown）
- "sections"：列出所有文档章节的名称和文档数量

**何时不用：**
- 查询社区 SIG 信息 → 用 get_sig_info
- 查询会议安排 → 用 get_meeting_info

**示例问题：**
- "BMC 架构文档在哪里？"
- "搜索关于网络配置的文档"
- "给我看看快速入门指南的内容"`,
```

---

## 常见错误和修正

### 错误 1：描述太通用

```
❌ "获取社区信息的工具，支持多种查询方式。"
✅ "查询 openUBMC SIG 的成员、仓库和贡献统计，支持精准查询和模糊匹配。"
```

### 错误 2：混淆相似工具

社区 MCP 通常有多个查询工具。如果描述不区分，LLM 会随机选择：

```
❌ getSigInfo.description: "查询 openUBMC 的相关信息"
❌ getDocInfo.description: "查询 openUBMC 的相关信息"
✅ getSigInfo.description: "查询 openUBMC SIG 工作组信息（不含文档，不含软件包）"
✅ getDocInfo.description: "搜索和获取 openUBMC 文档内容（不含 SIG，不含会议）"
```

### 错误 3：参数 description 太简略

```
❌ { name: "query", description: "查询内容" }
✅ { name: "keyword", description: "搜索关键词，支持中英文，多个关键词用空格分隔（如：'网络 配置'），大小写不敏感" }
```

### 错误 4：enum 值没有解释

```
❌ { name: "type", enum: ["list", "detail", "search"] }
✅ {
     name: "query_type",
     enum: ["list", "detail", "search"],
     description: "list：列出所有应用；detail：查指定应用详情（需提供 name）；search：按关键词搜索"
   }
```

### 错误 5：没有示例问题

示例问题直接对应用户的真实输入模式，帮助 LLM 的 few-shot 触发：

```
// 在 description 末尾加上示例问题
**示例用户问题：**
- "openUBMC 有哪些 SIG？"
- "查一下 infrastructure SIG 的情况"
- "谁在 BMC SIG 贡献最多？"
```

---

## 工具命名规范

| 场景 | 命名 | 说明 |
|---|---|---|
| 查询单类资源 | `get_sig_info` | 动词_名词_info |
| 列表 + 详情 | `get_app_info` + query_type 参数 | 合并为一个工具，用参数区分 |
| 搜索 | `search_packages` | 只做搜索时单独命名 |
| 复合操作 | `get_doc_info` | 浏览/搜索/抓取统一入口 |

**工具数量建议：** 宁少勿多。相关功能合并为一个工具（用 `query_type` 区分），降低 LLM 选错工具的概率。一般一个社区 MCP Server 有 3~6 个工具是合理范围。

---

## 描述迭代流程

描述不是写一次就完的，需要根据实际使用情况迭代：

1. **首版**：按上述模板写，覆盖核心场景
2. **测试**：用 10 个真实用户问题测试触发准确率
3. **分析失误**：
   - 该触发但没触发 → 在描述中补充该场景的触发词
   - 不该触发但触发了 → 在"何时不用"中补充排除说明
4. **迭代**：修改描述后重新测试，目标触发准确率 > 90%

**触发测试方法：** 在 Claude Code 中启用该 MCP server，然后输入各种用户问题，观察 LLM 是否调用正确的工具。
