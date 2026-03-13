# openUBMC Portal MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

openUBMC Model Context Protocol (MCP) Server，为 Claude 等 AI 工具提供 openUBMC 社区相关信息的查询能力。

## 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

## 安装

```bash
npm install
```

## 启动

```bash
# Stdio 模式（用于 Cursor / Claude Code）
npm start

# SSE 模式（用于远程连接）
npm run start:sse
```

## 配置

### Claude Code (终端 CLI)

```bash
claude mcp add openubmc-portal-mcp -- node /path/to/openubmc-portal-mcp/src/index.js
```

### Cursor

在 `.cursor/mcp.json` 中添加：

```json
{
  "mcpServers": {
    "openubmc-portal-mcp": {
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

查询 openUBMC 技术特别兴趣小组（SIG）的详细信息，支持四种查询模式。

**何时使用：**
- 用户询问某个 SIG 的基本信息（maintainer、仓库列表）
- 用户想了解某个 SIG 的成员贡献排行
- 用户查询某个仓库属于哪个 SIG
- 用户查询某个 maintainer 参与了哪些 SIG

**参数：**
- `sig_name` (string, 必需): SIG 名称、仓库名或 maintainer ID，支持模糊匹配
- `query_type` (string, 可选): `"sig"`（默认）、`"repos"`、`"maintainer"`、`"contribute"`
- `contribute_type` (string, 可选): `"pr"`（默认）、`"issue"`、`"comment"`、`"all"`

**特性：**
- 智能查询：自动按顺序尝试 SIG 查询 → 仓库查询 → Maintainer 查询
- 模糊匹配：大小写不敏感，支持去连字符匹配（如 `bmc-core` → `BMCCore`）
- 名称建议：无精确匹配时自动推荐相似 SIG 名称
- 15 分钟缓存，减少 API 调用

**返回信息：**
- SIG 名称、描述、邮件列表
- Maintainer 列表及联系方式
- 管理的代码仓库（最多显示 20 个）
- 成员贡献排行（PR/Issue/评审评论）

**示例问题：**
- "openUBMC 有哪些 SIG 组？"
- "BMC SIG 的维护者是谁？"
- "查询某个仓库属于哪些 SIG 组"
- "查询某 SIG 的 PR 贡献排行"

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
- 会议议题（topic）
- 所属 SIG 组
- 会议日期和时间（开始/结束）
- 会议议程摘要（最多 100 字符）
- 协作文档链接（etherpad）
- 会议参会链接
- 视频回放链接

**示例问题：**
- "2026年3月9日有哪些 openUBMC 社区会议？"
- "查询某 SIG 最近的会议安排"
- "openUBMC 今天有开放会议吗？"

---

### 3. 社区应用查询 (`get_app_info`)

查询 openUBMC 社区发布的应用，包括开发工具（tooling）和社区组件（application），支持列表浏览和包详情查询。

**何时使用：**
- 用户想了解 openUBMC 社区有哪些开发工具或组件
- 用户查询某个具体软件包的版本、描述或下载信息
- 用户搜索与某关键词相关的社区应用

**参数：**
- `query_type` (string, 可选): `"list"`（默认，列出所有应用）、`"detail"`（查询某包详情）
- `pkg_name` (string, 详情查询时必填): 包名，支持模糊匹配（编辑距离 ≤ 3）
- `list_type` (string, 可选): `"tooling"`（开发工具）、`"application"`（社区组件），不填则返回全部
- `version` (string, 可选): 指定版本号，不填则返回最新版本

**特性：**
- 分类浏览：按开发工具 / 社区组件两类展示
- 模糊包名匹配：支持拼写错误和缩写（Levenshtein 编辑距离算法）
- 版本探索：自动列出包的所有可用版本
- 15 分钟列表缓存

**返回信息：**
- 包名、版本、描述
- 包类型（开发工具 / 社区组件）
- 可用版本列表
- 详细元数据（维护者、依赖等）

**示例问题：**
- "openUBMC 社区有哪些开发工具？"
- "查询 busybox 包的详细信息"
- "openUBMC 有哪些社区组件可用？"
- "busybox 有哪些可用版本？"

---

### 4. 文档搜索与内容获取 (`get_doc_info`)

搜索 openUBMC 文档中心，支持目录浏览、关键词搜索和文档页面内容抓取，数据来源为本地 `data/llms.txt` 索引文件。

**何时使用：**
- 用户询问技术问题，需要查找相关文档
- 用户想浏览某个主题下的文档列表
- 用户想获取某篇文档的具体内容

**参数：**
- `query_type` (string, 可选): `"toc"`（默认，目录浏览）、`"search"`（关键词搜索）、`"fetch"`（抓取页面内容）、`"sections"`（列出所有章节）
- `keyword` (string, 可选): 搜索关键词，支持多词（空格分隔，AND 逻辑）；fetch 模式下可用关键词自动匹配文档 URL
- `section` (string, 可选): 章节名称过滤（部分匹配），用于 toc 模式
- `lang` (string, 可选): 语言过滤，`"zh"`、`"en"`、`"all"`（默认）
- `url` (string, 可选): 文档页面 URL，用于 fetch 模式直接抓取

**特性：**
- 本地索引：解析 `data/llms.txt`，约 600 篇文档，永久内存缓存
- 双语支持：自动识别中英文文档，支持按语言过滤
- API 兜底：本地搜索无结果时自动调用远程搜索 API
- 页面内容提取：将 VitePress 页面转换为可读 Markdown（含代码块、表格、告示框）
- 安全限制：仅允许抓取 openubmc.cn 域名下的页面
- 内容截断：页面内容超过 8000 字符时自动截断并提示

**返回信息：**
- toc/search：文档标题、链接、所属章节
- fetch：文档标题、更新时间、完整 Markdown 正文

**示例问题：**
- "openUBMC 有哪些快速入门文档？"
- "搜索关于网络配置的文档"
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
│   ├── getSigInfo.test.js      # getSigInfo 单元测试（12 个用例）
│   ├── getMeetingInfo.test.js  # getMeetingInfo 单元测试（13 个用例）
│   ├── getAppInfo.test.js      # getAppInfo 单元测试
│   └── getDocInfo.test.js      # getDocInfo 单元测试
├── .claude/
│   └── skills/
│       └── community-mcp-builder/  # MCP Server 开发 Skill（供 Claude AI 使用）
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

## License

MIT
