# openUBMC Portal MCP Server

[![npm version](https://img.shields.io/npm/v/openubmc-portal-mcp.svg)](https://www.npmjs.com/package/openubmc-portal-mcp)

openUBMC Model Context Protocol (MCP) Server，为 Claude 等 AI 工具提供 openUBMC 社区相关信息的查询能力。

## 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

## 配置

### Claude Code (终端 CLI)

编辑配置文件：
- macOS/Linux: `~/.claude.json`
- Windows: `%USERPROFILE%\.claude.json`

**使用 npx：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "npx",
      "args": ["-y", "openubmc-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "openubmc-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "node",
      "args": ["/path/to/openubmc-portal-mcp/src/index.js"]
    }
  }
}
```

### Cursor

在 Cursor 的 MCP 配置中添加：

**使用 npx：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "npx",
      "args": ["-y", "openubmc-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "openubmc-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "node",
      "args": ["/path/to/openubmc-portal-mcp/src/index.js"]
    }
  }
}
```

### Cline (VS Code Extension)

在 VS Code 设置中配置 MCP servers：

**使用 npx：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "npx",
      "args": ["-y", "openubmc-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "openubmc-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "node",
      "args": ["/path/to/openubmc-portal-mcp/src/index.js"]
    }
  }
}
```



### Trae-CN

在 trae 设置中配置 MCP servers：

**使用 npx：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "npx",
      "args": ["-y", "openubmc-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "openubmc-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "openubmc-portal": {
      "command": "node",
      "args": ["/path/to/openubmc-portal-mcp/src/index.js"]
    }
  }
}
```

## 工具列表

本服务器提供 **4 个工具函数**：

| 工具名 | 描述 |
|--------|------|
| `get_sig_info` | 查询 openUBMC SIG 信息、成员贡献、仓库归属、maintainer 归属 |
| `get_meeting_info` | 查询 openUBMC 社区开放会议（按日期或按 SIG） |
| `get_app_info` | 查询 openUBMC 社区应用（开发工具 / 社区组件），支持列表浏览和包详情查询 |
| `get_doc_info` | 搜索 openUBMC 文档中心，支持目录浏览、关键词搜索、文档内容抓取 |

## 详细说明

### 1. SIG 信息查询 (`get_sig_info`)

查询 openUBMC 技术特别兴趣小组（SIG）的详细信息，支持 SIG 详情查询和成员贡献统计。

**何时使用：**
- 用户询问某个 SIG 的基本信息（maintainer、仓库列表）
- 用户想了解某个 SIG 的成员贡献排行
- 用户查询 openUBMC 有哪些 SIG 组

**参数：**
- `sig_name` (string, 必需): SIG 组名称，大小写不敏感，自动修正大小写错误
- `query_type` (string, 可选): `"sig"`（默认，SIG 详情）、`"contribute"`（成员贡献统计）
- `contribute_type` (string, 可选): `"pr"`（默认）、`"issue"`、`"comment"`、`"all"`

**特性：**
- 全字段展示：直接从 SIG 列表 API 取完整对象，无冗余二次请求
- 大小写自动修正：输入错误大小写也能匹配
- 无匹配时返回完整 SIG 列表供选择
- 15 分钟缓存，减少 API 调用

**返回信息（SIG 详情）：**
- 名称、中英文描述、邮件列表、创建时间
- 会议链接、讨论链接
- Maintainers 列表（ID + 中文名 + 角色）
- Maintainer 详细信息（gitcode_id、邮箱等）
- Committers 列表（ID + 中文名）及详细信息
- 管理的代码仓库（最多显示 20 个）
- 分支管理信息
- 会议议程（中英文）

**返回信息（贡献统计）：**
- 贡献者 ID、贡献次数、用户角色（committer/maintainer）
- 支持 PR / Issue / 评审评论 / 全部类型一次查询

**示例问题：**
- "openUBMC 有哪些 SIG 组？"
- "sig-hardware SIG 的维护者是谁？"
- "查询 sig-hardware SIG 的 PR 贡献排行"

---

### 2. 会议信息查询 (`get_meeting_info`)

查询 openUBMC 社区开放会议信息，支持按日期和按 SIG 组两种查询方式。

**何时使用：**
- 用户询问某一天的社区会议安排
- 用户想了解某个 SIG 的会议记录
- 用户查找会议议题、参会链接或视频回放

**参数：**
- `query_type` (string, 可选): `"date"`（默认）、`"sig"`
- `date` (string, 按日期查询时必填): 格式 `YYYY-MM-DD`，如 `2026-03-09`
- `sig_name` (string, 按 SIG 查询时必填): SIG 组名称，支持大小写模糊匹配

**特性：**
- 智能 SIG 匹配：自动将用户输入的 SIG 名称修正为正确大小写
- 无会议推荐：当查询日期没有会议时，自动推荐附近有会议的日期
- 15 分钟缓存：SIG 列表数据缓存

**返回信息：**
- 会议议题（topic）、发起人、会议平台
- 所属 SIG 组、邮件列表
- 会议日期和时间（开始/结束）、时长
- 循环会议标记及周期（开始/结束日期）
- 录制状态标记
- 会议议程摘要（最多 100 字符）
- 协作文档链接（etherpad）
- 会议参会链接（join_url）
- 视频回放链接（obs_data）、字幕/转写链接
- Bilibili 视频链接（如有）

**示例问题：**
- "2026年3月9日有哪些 openUBMC 社区会议？"
- "查询某 SIG 最近的会议安排"
- "openUBMC 今天有开放会议吗？"

---

### 3. 社区应用查询 (`get_app_info`)

查询 openUBMC 社区发布的**可安装软件包**，包括开发工具（tooling）和社区组件（application），支持列表浏览和包详情查询。文档、教程类内容请用 `get_doc_info`。

**何时使用：**
- 用户想了解 openUBMC 社区有哪些开发工具或组件可以安装
- 用户查询某个软件包的版本、安装方法或下载信息
- 用户想知道某个包有哪些可用版本

**参数：**
- `query_type` (string, 可选): `"list"`（默认，列出所有应用）、`"detail"`（查询某包详情）
- `package_name` (string, 详情查询时必填): 包名，大小写不敏感，支持模糊匹配（编辑距离 ≤ 3）
- `list_type` (string, 可选): `"tooling"`（开发工具）、`"application"`（社区组件），不填则返回全部
- `version` (string, 可选): 指定版本号，不填则使用默认版本

**特性：**
- 分类浏览：按开发工具 / 社区组件两类展示，新上架包标注 🆕 标记
- 模糊包名匹配：支持拼写错误和缩写（Levenshtein 编辑距离算法）
- 安装指引：详情中展示中英文安装方法（`usage` / `usage_en` 字段）
- 版本探索：自动列出包的所有可用版本
- 15 分钟列表缓存

**返回信息：**
- 包名、版本（应用版本 `app_version`）、中英文描述
- 包类型（开发工具 / 社区组件）、新上架标记
- 安装指引（中文 + 英文）、安装命令（`download_cmd`）
- 主页、代码仓库、下载地址（含 CPIO 格式）、下载说明
- 维护者（SIG、邮箱、仓库地址）
- 架构、操作系统、包大小、发布时间、SHA256
- 许可证（含英文对照）、依赖信息
- 可用版本列表

**示例问题：**
- "openUBMC 有哪些应用或组件可以安装？"
- "openUBMC 有哪些开发工具？"
- "BMC Studio 怎么安装？"
- "查询 BMC Studio 的详细信息"
- "busybox 有哪些可用版本？"

---

### 4. 文档搜索与内容获取 (`get_doc_info`)

搜索 openUBMC 文档中心，支持目录浏览、关键词搜索和文档页面内容抓取，数据来源为本地 `data/llms.txt` 索引文件（约 600 篇）。软件包安装信息请用 `get_app_info`。

**何时使用：**
- 用户询问技术问题，需要查找相关文档
- 用户想浏览某个主题下的文档列表
- 用户想获取某篇文档的具体内容（步骤、命令、配置说明等）

**参数：**
- `query_type` (string, 可选): `"toc"`（默认，目录浏览）、`"search"`（关键词搜索）、`"fetch"`（抓取页面内容）、`"sections"`（列出所有章节）
- `keyword` (string, 可选): 搜索关键词，支持多词（空格分隔，AND 逻辑）
- `section` (string, 可选): 章节名称过滤（部分匹配），用于 toc 模式
- `lang` (string, 可选): 语言过滤，`"zh"`、`"en"`、`"all"`（默认）
- `url` (string, 可选): 文档页面完整 URL，用于 fetch 模式直接抓取指定页面

**特性：**
- 本地索引优先：解析 `data/llms.txt`，约 600 篇文档，永久内存缓存，响应快
- API 兜底：本地索引无结果时自动调用远程搜索 API，无需手动切换
- 一步获取内容：`fetch` 模式传入 `keyword` 即可自动定位并抓取文档正文，无需先 search 再 fetch
- 双语支持：自动识别中英文文档，支持按语言过滤
- 页面内容提取：将 VitePress 页面转换为可读 Markdown（含代码块、表格、告示框）
- 安全限制：仅允许抓取 openubmc.cn 域名下的页面
- 内容截断：页面内容超过 8000 字符时自动截断并提示

**返回信息：**
- toc/search：文档标题、链接、所属章节
- fetch：文档标题、更新时间、完整 Markdown 正文

**示例问题：**
- "openUBMC 有哪些快速入门文档？"
- "搜索关于网络配置的文档"
- "openUBMC 如何构建 BMC？"
- "给我看看 BMC 架构设计文档的内容"
- "查找中文版的开发环境搭建指南"

---

## 项目结构

```
openubmc-portal-mcp/
├── src/
│   ├── index.js                # 服务器入口（支持 stdio / SSE 双模式）
│   └── tools/
│       ├── getSigInfo.js       # SIG 信息查询工具
│       ├── getMeetingInfo.js   # 会议信息查询工具
│       ├── getAppInfo.js       # 社区应用查询工具
│       ├── getDocInfo.js       # 文档搜索与内容获取工具
│       └── _template.js        # 新工具开发模板
├── data/
│   ├── llms.txt                # openUBMC 文档索引（llms.txt 标准格式，~600 篇）
│   └── llms-full.txt           # 完整文档索引
├── tests/
│   ├── getSigInfo.test.js      # getSigInfo 单元测试
│   ├── getMeetingInfo.test.js  # getMeetingInfo 单元测试
│   ├── getAppInfo.test.js      # getAppInfo 单元测试
│   └── getDocInfo.test.js      # getDocInfo 单元测试
├── CLAUDE.md                   # AI 开发规范
├── package.json
├── LICENSE
└── README.md
```

## 测试

```bash
node tests/getSigInfo.test.js
node tests/getMeetingInfo.test.js
node tests/getAppInfo.test.js
node tests/getDocInfo.test.js
```

## 开发指南

添加新工具：
1. 复制 `src/tools/_template.js` → `src/tools/getXxxInfo.js`
2. 实现查询逻辑，遵循模板结构（缓存、超时、Markdown 输出）
3. 在 `src/index.js` 导入并注册工具（三步：import → tools 数组 → toolHandlers 映射）
4. 创建对应测试文件 `tests/getXxxInfo.test.js`
5. 更新本文档的工具列表和详细说明
6. 更新 `package.json` 版本号（新增工具为 minor 版本升级）