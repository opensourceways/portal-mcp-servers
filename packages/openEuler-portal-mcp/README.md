# openEuler Portal MCP Server

[![npm version](https://img.shields.io/npm/v/openeuler-portal-mcp.svg)](https://www.npmjs.com/package/openeuler-portal-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

openEuler Model Context Protocol (MCP) Server，为 Claude 等 AI 工具提供 openEuler 官网相关信息的查询能力。

## 环境要求

本项目需要以下环境：

- **Node.js**: >= 18.0.0（推荐使用 LTS 版本）
  - 本项目使用 ES Modules，需要 Node.js 18 或更高版本
  - 下载地址：https://nodejs.org/
- **npm**: >= 9.0.0（随 Node.js 自动安装）

**检查当前版本：**

```bash
node --version
npm --version
```

## 安装

### 方式 1：使用 npx

npx 会在首次使用时自动从 npm 下载包并运行，无需手动执行安装命令。当 MCP 客户端启动时会自动执行。

**注意：** 首次启动时需要联网下载包，之后会使用缓存。

### 方式 2：全局安装

```bash
npm install -g openeuler-portal-mcp
```

**优点：**

- 启动速度更快（无需下载）
- 可以固定版本
- 离线也能使用

### 方式 3：本地开发

克隆源码进行开发和调试。

```bash
# 克隆仓库
git clone https://github.com/gzbang/openEuler-portal-mcp.git
cd openEuler-portal-mcp

# 安装依赖
npm install
```

## 配置

### Claude Code (终端 CLI)

编辑配置文件：
- macOS/Linux: `~/.claude.json`
- Windows: `%USERPROFILE%\.claude.json`

**使用 npx：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "npx",
      "args": ["-y", "openeuler-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "openeuler-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "node",
      "args": ["/path/to/openEuler-portal-mcp/src/index.js"]
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
    "openeuler-portal": {
      "command": "npx",
      "args": ["-y", "openeuler-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "openeuler-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "node",
      "args": ["/path/to/openEuler-portal-mcp/src/index.js"]
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
    "openeuler-portal": {
      "command": "npx",
      "args": ["-y", "openeuler-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "openeuler-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "node",
      "args": ["/path/to/openEuler-portal-mcp/src/index.js"]
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
    "openeuler-portal": {
      "command": "npx",
      "args": ["-y", "openeuler-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "openeuler-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "openeuler-portal": {
      "command": "node",
      "args": ["/path/to/openEuler-portal-mcp/src/index.js"]
    }
  }
}
```

## 功能

提供 14 个工具函数，根据问题自动选择合适的工具函数。

### 工具列表

| 工具名称 | 函数名 | 功能描述 | 主要参数 | 使用场景 |
|---------|--------|---------|---------|---------|
| SIG 信息查询 | `get_sig_info` | 查询 openEuler SIG 详细信息、成员贡献统计，支持名称模糊推荐 | `sig_name` (必需), `query_type` (可选), `contribute_type` (贡献时可选) | 查询 SIG 维护者、仓库、贡献排行；查询仓库/maintainer 所属的 SIG |
| CVE 安全公告查询 | `get_cve_info` | 查询 openEuler CVE 安全公告信息，支持列表和详情查询 | `query_type` (可选), `keyword` (列表时), `cve_id`+`package_name` (详情时必需) | 查询安全漏洞列表、查看 CVE 详情及受影响产品 |
| 下载信息查询 | `get_download_info` | 查询下载信息、镜像站点、版本列表 | `query` (必需), `query_type` (可选) | 下载 ISO 镜像、查询镜像站点、查看可用版本 |
| 组织信息查询 | `get_organization_info` | 查询 openEuler 社区组织架构和成员信息 | `query` (必需) | 查询委员会、工作组、社区成员信息 |
| 软件包信息查询 | `get_package_info` | 查询发行版软件包信息、生命周期 | `query` (必需), `query_type` (可选) | 查询软件包列表、详情、发行版生命周期 |
| 兼容性测试查询 | `get_compatibility_info` | 查询硬件兼容性测试信息 | `query_type` (必需), `architecture`, `os`, `keyword`, `card_type` | 查询整机/板卡兼容性测试、硬件认证信息 |
| 文档版本查询 | `get_docs_version` | 获取 openEuler 文档版本信息 | 无 | 了解可用文档版本、获取文档仓库地址 |
| 文档内容搜索 | `get_docs_search_content` | 搜索 openEuler 文档内容 | `keyword` (必需), `version` (必需), `lang` (可选) | 搜索技术特性、查找文档说明、了解项目工具、搜索术语解释 |
| 社区会议查询 | `get_meeting_info` | 查询 openEuler 社区开放会议信息 | `query_type` (可选), `date` (按日期时必需), `sig_name` (按SIG时必需) | 查询每日会议安排、SIG 会议记录、无会议时推荐附近日期 |
| 用户案例查询 | `get_showcase_info` | 查询 openEuler 用户案例信息 | `keyword` (可选), `lang` (可选), `industry` (可选) | 查询各行业用户案例、搜索特定企业案例、了解 openEuler 应用实践 |
| 演进提案查询 | `get_oeep_info` | 查询 openEuler 演进提案（oEEP）信息 | `query_type` (可选), `number` (详情时必需), `keyword` (可选) | 查询 oEEP 列表、按关键词/作者过滤、查看具体提案详细内容 |
| 安全公告查询 | `get_security_notice_info` | 查询 openEuler 安全公告列表及详情 | `query_type` (可选), `keyword` (可选), `security_notice_no` (详情时必需) | 查询最新安全公告、按组件名搜索、查看公告完整详情 |
| 缺陷公告查询 | `get_bug_notice_info` | 查询 openEuler 缺陷公告列表及详情 | `query_type` (可选), `keyword` (可选), `security_notice_no` (详情时必需) | 查询最新缺陷公告、按组件名搜索、查看公告完整详情 |
| 门户全站搜索 | `get_search_info` | 全站兜底搜索，覆盖博客/Issue/代码仓库/SIG/会议文档等内容 | `keyword` (必需), `lang` (可选) | 其他工具未找到结果时的兜底查询、搜索博客文章、Issue 等 |

### 详细说明

#### 1. SIG 信息查询 (`get_sig_info`)

查询 openEuler 特别兴趣小组（SIG）的详细信息，支持成员贡献统计查询和 SIG 名称模糊推荐。

**何时使用：**
- 用户询问某个 SIG 的信息、维护者、仓库等
- 用户想查看某个 SIG 的成员贡献排行（PR/Issue/评审）
- 用户提到的 SIG 名称不确定（系统自动从 SIG 列表中推荐相近名称）
- 用户想了解某个仓库属于哪些 SIG 组
- 用户想查询某个 maintainer 参与了哪些 SIG 组

**参数：**
- `sig_name` (string, 必需): 查询关键词，可以是 SIG 名称、仓库名或 maintainer 的 Gitee ID；名称不准确时系统自动进行大小写修正和模糊推荐
- `query_type` (string, 可选): 查询类型，默认为 "sig"（智能查询）
  - `"sig"`: 智能查询模式，自动按 SIG → 仓库 → maintainer 顺序尝试；名称不明确时推荐相近 SIG
  - `"repos"`: 仅查询仓库所属的 SIG 组
  - `"maintainer"`: 仅查询 maintainer 所属的 SIG 组
  - `"contribute"`: 查询指定 SIG 的成员贡献统计
- `contribute_type` (string, 可选): 贡献类型（query_type 为 "contribute" 时有效），默认 "pr"
  - `"pr"`: PR 合并请求数量排行
  - `"issue"`: Issue 需求&评审数量排行
  - `"comment"`: 评审评论数量排行
  - `"all"`: 一次性查询全部三种类型

**特性：**
- 智能查询：自动识别输入类型，无需指定查询模式
- 名称模糊推荐：名称不精确时从 SIG 列表中智能推荐，支持去连字符匹配（如 big-data → BigData）
- 大小写修正：自动尝试不同大小写变体（如 bigdata → BigData，ai → AI）
- 贡献统计：支持按 PR/Issue/评审评论查询 SIG 成员贡献排行

**返回信息（SIG 信息）：**
- SIG 基本信息（名称、描述、邮件列表）
- Maintainers 列表和详细信息
- 仓库列表（最多显示 20 个）
- Committers 统计（显示前 10 位活跃贡献者）
- 分支管理信息（显示前 3 个分支组）

**返回信息（贡献统计）：**
- 贡献者 Gitee ID 和贡献次数排行（最多显示 20 人）
- 支持 PR、Issue、评审评论三种类型

**示例问题：**
- "Kernel SIG 的维护者是谁？"
- "ai SIG 管理哪些仓库？"
- "kernel 仓库属于哪些 SIG 组？"
- "gzbang 这个 maintainer 参与了哪些 SIG？"
- "bigdata SIG 的成员 PR 贡献排行"
- "查询 ai SIG 的 Issue 贡献情况"
- "big-data SIG 的全部贡献统计"

#### 2. CVE 安全公告查询 (`get_cve_info`)

查询 openEuler CVE（Common Vulnerabilities and Exposures）安全公告信息，支持列表查询和 CVE 详情查询。

**何时使用：**
- 用户询问安全漏洞、CVE 信息
- 用户想了解某个软件包的安全问题
- 用户查询特定 CVE 编号的详情
- 用户想了解某个 CVE 的 CVSS 评分、攻击向量和受影响产品列表

**参数：**
- `query_type` (string, 可选): 查询类型，默认 "list"
  - `"list"`: 按关键词搜索 CVE 列表，支持分页
  - `"detail"`: 查询指定 CVE 在指定软件包中的完整详情
- `keyword` (string, 可选): 搜索关键词（list 模式），可以是 CVE 编号或软件包名
- `page` (number, 可选): 页码，默认为 1（list 模式）
- `page_size` (number, 可选): 每页显示记录数，默认 20（list 模式）
- `cve_id` (string, 条件必需): CVE 编号（detail 模式必填），如 CVE-2026-23865
- `package_name` (string, 条件必需): 软件包名（detail 模式必填），如 kernel、freetype

**返回信息（列表）：**
- CVE ID（漏洞编号）
- 摘要（漏洞描述）
- CVSS 评分（漏洞严重程度）
- 状态（如已修复、调查中等）
- 发布时间和更新时间
- 受影响的产品和软件包
- 安全公告编号

**返回信息（详情）：**
- 以上所有字段
- CVSS V3/V4 评分（OE 和 NVD 两个来源）
- 攻击向量详情（攻击复杂度、权限要求、用户交互、影响范围等）
- 完整漏洞摘要（最多500字符）
- 受影响产品列表（含修复状态、关联安全公告、修复时间）

**示例问题：**
- "查询 kernel 相关的 CVE"
- "openssl 有哪些安全漏洞？"
- "CVE-2024-1234 的详细信息"
- "查询 CVE-2026-23865 在 freetype 软件包中的详情"
- "freetype 的 CVE-2026-23865 影响了哪些产品？"

### 3. 下载信息查询 (`get_download_info`)

查询 openEuler 下载信息、镜像仓列表和版本信息。

**何时使用：**
- 用户想下载 openEuler ISO 镜像
- 用户询问某个版本的下载地址
- 用户想查找镜像站点
- 用户想了解有哪些可用版本

**参数：**
- `query` (string, 必需): 查询关键词，可以是版本号或镜像
- `query_type` (string, 可选): 查询类型，默认为 "auto"
  - `"auto"`: 自动查询，支持版本号和模糊搜索
  - `"mirrors"`: 查询镜像仓列表
  - `"versions"`: 查询所有可用版本

**特性：**
- 智能查询：自动识别版本号或关键词
- 模糊搜索：在多个版本中查找匹配的文件
- 镜像列表：显示全球镜像站点信息
- 版本列表：显示所有可用的 openEuler 版本

**返回信息：**
- 下载文件名、大小、路径
- SHA256 校验码
- 支持的架构（aarch64、x86_64 等）
- 镜像站点 URL、国家、带宽
- 版本号、LTS 状态、支持的架构

**示例问题：**
- "openEuler-24.03-LTS 的下载地址"
- "查询 openEuler 镜像站点"
- "有哪些 openEuler 版本可用？"
- "查找 aarch64 架构的 ISO"

#### 4. 组织信息查询 (`get_organization_info`)

查询 openEuler 社区组织架构和成员信息。

**何时使用：**
- 用户询问社区组织结构
- 用户想了解委员会、工作组信息
- 用户查询社区成员和角色

**参数：**
- `query` (string, 必需): 查询关键词

**示例问题：**
- "openEuler 有哪些委员会？"
- "技术委员会的成员有谁？"

#### 5. 软件包信息查询 (`get_package_info`)

查询 openEuler 社区发行版软件包信息。

**何时使用：**
- 用户询问 openEuler 发行版的生命周期信息
- 用户想搜索软件包列表
- 用户查询特定软件包的详细信息
- 用户想了解软件包的维护者和分类信息

**参数：**
- `query` (string, 必需): 查询关键词，可以是软件包名称或为空字符串
- `query_type` (string, 可选): 查询类型，默认为 "auto"
  - `"auto"`: 自动查询模式，智能判断返回列表或详情
  - `"lifecycle"`: 查询发行版生命周期信息
  - `"list"`: 搜索软件包列表
  - `"detail"`: 查询软件包详细信息

**特性：**
- 智能查询：自动判断返回列表或详情
- 多类型支持：支持 RPM、OEPKG、IMAGE 等不同类型的包
- 详细信息：包括依赖关系、文件列表、许可证等

**返回信息：**
- 发行版：版本号、发布日期、EOL 日期、支持状态
- 软件包列表：名称、版本、描述、分类、维护者、可用类型
- 软件包详情：完整的包信息、依赖关系、文件列表、许可证等

**示例问题：**
- "openEuler 有哪些版本？"
- "查询 kernel 相关的软件包"
- "redis 软件包的详细信息"
- "nginx 的依赖包有哪些？"

#### 6. 兼容性测试查询 (`get_compatibility_info`)

查询 openEuler 硬件兼容性测试信息。

**何时使用：**
- 用户询问硬件兼容性测试信息
- 用户想了解某个硬件设备在 openEuler 上的认证状态
- 用户查询整机或板卡的兼容性测试列表
- 用户想搜索特定厂商或型号的兼容性信息

**参数：**
- `query_type` (string, 必需): 查询类型
  - `"whole"`: 整机兼容性测试
  - `"board"`: 板卡兼容性测试
- `architecture` (string, 可选): 架构（如 x86_64、aarch64）
- `os` (string, 可选): 操作系统版本（如 openEuler-22.03-LTS-SP4）
- `keyword` (string, 可选): 关键词（厂商名、型号等）
- `card_type` (string, 可选): 板卡类型（仅板卡查询时有效，如网卡、显卡、RAID卡等）

**特性：**
- 多条件查询：支持架构、操作系统、关键词等多条件组合
- 板卡类型筛选：板卡查询支持按类型筛选
- 固定返回前 10 条记录

**返回信息：**
- 整机测试：硬件厂商、型号、CPU、架构、操作系统版本、主板型号、内存、认证时间、产品链接
- 板卡测试：板卡名称、芯片厂商、板卡型号、芯片型号、板卡类型、驱动信息、下载链接、认证时间

**示例问题：**
- "查询 x86_64 架构的整机兼容性测试"
- "openEuler-24.03-LTS 支持哪些网卡？"
- "华为服务器的兼容性测试信息"
- "查询 RAID 卡的兼容性测试"

#### 7. 文档版本查询 (`get_docs_version`)

获取 openEuler 文档版本信息。

**何时使用：**
- 用户想了解 openEuler 可用的文档版本
- 用户需要获取文档版本的标签、版本号、终止支持状态和分支名
- 用户想获取对应版本的文档仓库地址
- 用户需要为文档访问和开发提供版本选择依据

**参数：**
无必填参数

**返回信息：**
- 标签 (label)：显示标签（如 20.03 LTS）
- 版本号 (value)：对应的版本号（如 20.03_LTS）
- 是否终止支持 (eom)：表示版本是否已终止支持
- 分支名 (branch)：版本分支标识符（如 stable2-20.03_LTS）
- Git 仓库地址：根据分支名生成的仓库地址
  - stable- 开头的分支：使用 docs 仓库，格式为 https://atomgit.com/openeuler/docs/tree/{branchName}
  - stable2- 开头的分支：使用 docs-centralized 仓库，格式为 https://atomgit.com/openeuler/docs-centralized/tree/{branchName}

**示例问题：**
- "openEuler 有哪些文档版本？"
- "最新的 openEuler 文档版本是什么？"
- "哪个文档版本还在支持中？"
- "获取 openEuler-24.03-LTS 的文档仓库地址"

#### 8. 文档内容搜索 (`get_docs_search_content`)

搜索 openEuler 文档内容，返回与搜索词相关的文档内容。

**何时使用：**
- 用户想搜索 openEuler 的技术特性和功能
- 用户需要查找特定技术的文档说明
- 用户想了解 openEuler 的项目和工具
- 用户需要搜索技术术语、概念解释
- 用户想查找使用指南和最佳实践

**参数：**
- `keyword` (string, 必需)：搜索关键词。可以是单个词（如 'kernel'）或多个词（如 'kernel security'）。支持中英文。
- `lang` (string, 可选)：语言，zh 或 en（默认 zh）
- `version` (string, 必需)：版本号，可通过 get_docs_version 获取。当用户不指定版本时，建议传递最新版本

**返回信息：**
- 搜索结果列表
- 每个结果的标题
- 每个结果的内容摘要
- 每个结果的版本号
- 每个结果的文档链接

**示例问题：**
- "如何在 openEuler 中安装 Docker？"
- "openEuler 的内核特性有哪些？"
- "搜索 openEuler 的安全加固指南"
- "查找 openEuler 的网络配置文档"

#### 9. 社区会议查询 (`get_meeting_info`)

查询 openEuler 社区开放会议信息，支持按日期查询和按 SIG 组查询。

**何时使用：**
- 用户询问某一天有哪些社区会议
- 用户想了解某个 SIG 组的会议安排
- 用户查询会议议题、时间、参与链接
- 用户想查找会议的协作文档或视频回放

**参数：**
- `query_type` (string, 可选): 查询类型，默认为 "date"
  - `"date"`: 按日期查询，需提供 `date` 参数
  - `"sig"`: 按 SIG 组查询，需提供 `sig_name` 参数
- `date` (string, 条件必需): 查询日期，格式 YYYY-MM-DD（如 2026-03-03），`query_type` 为 "date" 时必填
- `sig_name` (string, 条件必需): SIG 组名称（如 Kernel、ai），`query_type` 为 "sig" 时必填

**特性：**
- 无会议推荐：当查询日期没有会议时，自动查询并推荐附近有会议的日期
- 智能 SIG 匹配：支持大小写不敏感匹配，自动将用户输入映射到正确的 SIG 名称
- 15分钟缓存：SIG 列表缓存，减少重复 API 调用

**返回信息：**
- 会议议题（topic）
- 所属 SIG 组名称
- 会议日期和时间段
- 会议议程摘要（超过100字符自动截断）
- 协作文档链接（etherpad）
- 会议参会链接
- 视频回放链接

**示例问题：**
- "2026年3月3日有哪些 openEuler 社区会议？"
- "Kernel SIG 最近有什么会议安排？"
- "今天的 openEuler 社区会议有哪些？"
- "查看 ai SIG 的会议记录"
- "openEuler 本周有哪些开放会议？"

#### 10. 用户案例查询 (`get_showcase_info`)

查询 openEuler 在各行业的用户案例，了解 openEuler 在实际生产环境中的应用情况。

**何时使用：**
- 用户询问 openEuler 在某个行业的应用案例
- 用户想查找某个企业使用 openEuler 的案例
- 用户想了解 openEuler 的用户案例列表
- 用户询问 openEuler 在金融、运营商等领域的成功实践

**参数：**
- `keyword` (string, 可选): 搜索关键词，如企业名称、技术关键词等，为空时返回所有案例
- `lang` (string, 可选): 查询语言，"zh"（中文，默认）或 "en"（英文），根据用户提问语言自动选择
- `industry` (string, 可选): 行业分类，可选值：
  - `金融`
  - `运营商`
  - `能源`
  - `物流`
  - `高校&科研`
  - `云计算`
  - `其他`

**特性：**
- 行业筛选：支持按行业分类精确筛选
- 双语查询：支持中英文两种查询语言
- 15分钟缓存：相同查询条件命中缓存，减少 API 调用
- 最多显示前 20 条，超出时提示缩小范围

**返回信息：**
- 案例标题
- 所属企业/单位
- 行业分类
- 案例摘要（超过 120 字符自动截断）
- 案例详情链接

**示例问题：**
- "openEuler 在金融行业有哪些用户案例？"
- "工商银行使用 openEuler 的案例"
- "查询 openEuler 在运营商领域的应用"
- "高校和科研机构使用 openEuler 的案例有哪些？"
- "openEuler 全部用户案例"
- "openEuler 云计算相关案例"

#### 11. 演进提案查询 (`get_oeep_info`)

查询 openEuler 演进提案（oEEP, openEuler Evolution Proposal）信息，了解社区技术决策的来龙去脉。

**何时使用：**
- 用户询问 openEuler 的演进提案、技术提案
- 用户想了解某个社区决策的背景和详情
- 用户搜索特定主题的 oEEP（如内核、镜像、安全、流程）
- 用户查询某个作者或特定状态的 oEEP

**参数：**
- `query_type` (string, 可选): 查询类型，默认为 "list"
  - `"list"`: 列出所有 oEEP，支持 keyword 关键词过滤
  - `"detail"`: 查看指定 oEEP 的完整内容，需提供 `number` 参数
- `number` (string, 条件必需): oEEP 编号，`query_type` 为 "detail" 时必填，支持 "1"、"0001"、"oEEP-0001" 等多种格式
- `keyword` (string, 可选): 关键词，`query_type` 为 "list" 时有效，可按标题、作者、类型码（D/P/S）、状态码（I/A/F 等）过滤

**oEEP 类型：**
- D (Document, 信息整理): 社区索引、指南、规范等文档
- P (Process, 流程设计): 社区治理、CI/CD、测试等流程
- S (Standard, 特性变更): 代码、工具、配置变更提案

**oEEP 状态：**
- I (Initial, 初始化)、A (Accepted/Active, 接纳/活跃)、P (Provision, 基本成型)
- F (Final, 已完成)、D (Deactive, 不活跃)、R (Rejected, 被拒绝)、S (Substituted, 被替代)、W (Withdraw, 撤回)

**特性：**
- 索引 15 分钟缓存，详情文档单独缓存
- 编号格式智能识别（"1"、"01"、"0001"、"oEEP-0001" 均可）
- 详情自动去除 front matter，只展示正文内容
- 关键词可同时匹配标题、作者、类型码、状态码

**返回信息（列表）：**
- 编号、类型、状态、标题、作者、提案日期

**返回信息（详情）：**
- 结构化元信息（编号、类型、状态、作者、日期）
- 完整正文（动机描述、方案详述、参考链接、流程图等）

**示例问题：**
- "openEuler 有哪些演进提案？"
- "有哪些关于内核的 oEEP？"
- "查看 oEEP-0001 的详细内容"
- "oEEP 5 的方案是什么？"
- "胡欣蔚提交了哪些 oEEP？"
- "已完成的 oEEP 有哪些？"
- "流程设计类的 oEEP 有哪些？"

#### 12. 安全公告查询 (`get_security_notice_info`)

查询 openEuler 发布的安全公告（Security Notice），支持按关键词搜索列表和查看公告完整详情。

**何时使用：**
- 用户查询某个组件的安全公告（如 kernel、openssl）
- 用户想了解某条安全公告的详细内容
- 用户想了解 openEuler 最新的安全更新
- 用户通过 CVE 编号查找对应的安全公告

**参数：**
- `query_type` (string, 可选): 查询类型，默认 "list"
  - `"list"`: 列表查询，支持关键词过滤
  - `"detail"`: 详情查询，需提供 security_notice_no
- `keyword` (string, 可选): 搜索关键词，如组件名（kernel、openssl）或 CVE 编号，为空时返回全部最新公告
- `security_notice_no` (string): 安全公告编号，如 openEuler-SA-2026-1486；query_type 为 "detail" 时必填

**特性：**
- 双模式：列表查询 + 详情查询
- 15分钟缓存：列表和详情分别缓存，减少 API 调用
- CVE 聚合：超过3个 CVE 时自动聚合显示总数
- 描述截断：详情描述超过500字符时自动截断

**返回信息（列表）：**
- 公告编号、摘要、危险等级（Critical/High/Medium/Low）
- 受影响组件和版本、关联 CVE 编号、发布时间

**返回信息（详情）：**
- 以上所有字段 + 更新时间
- 完整漏洞描述（最多500字符）
- 关联 CVE 完整列表
- 参考链接列表（最多10个）
- 修复软件包列表

**示例问题：**
- "openEuler 最新有哪些安全公告？"
- "kernel 相关的安全公告有哪些？"
- "查询 openEuler-SA-2026-1486 的详细内容"
- "openssl 有哪些安全更新公告？"
- "CVE-2026-2239 对应的公告详情是什么？"

#### 13. 缺陷公告查询 (`get_bug_notice_info`)

查询 openEuler 发布的缺陷公告（Bug Advisory），支持按关键词搜索列表和查看公告完整详情。

**何时使用：**
- 用户查询某个组件的缺陷修复公告（如 kernel、babel、libreport）
- 用户想了解某条缺陷公告的详细内容
- 用户想了解 openEuler 最新的软件缺陷修复情况
- 用户通过缺陷编号（BUG-YYYY-NNNN）查找对应的缺陷公告

**参数：**
- `query_type` (string, 可选): 查询类型，默认 "list"
  - `"list"`: 列表查询，支持关键词过滤
  - `"detail"`: 详情查询，需提供 security_notice_no
- `keyword` (string, 可选): 搜索关键词，如组件名（kernel、babel）或缺陷编号，为空时返回全部最新公告
- `security_notice_no` (string): 缺陷公告编号，如 openEuler-BA-2025-1130；query_type 为 "detail" 时必填

**特性：**
- 双模式：列表查询 + 详情查询
- 15分钟缓存：列表和详情分别缓存，减少 API 调用
- 缺陷 ID 聚合：超过3个缺陷 ID 时自动聚合显示总数
- 描述截断：详情描述超过500字符时自动截断

**返回信息（列表）：**
- 公告编号（格式 openEuler-BA-YYYY-NNNN）、摘要、严重等级（High/Moderate/Low）
- 受影响组件和版本、关联缺陷 ID（格式 BUG-YYYY-NNNN）、发布时间

**返回信息（详情）：**
- 以上所有字段 + 更新时间
- 完整缺陷描述（最多500字符）
- 关联缺陷 ID 完整列表
- 参考链接列表（最多10个）
- 修复软件包列表

**示例问题：**
- "openEuler 最新有哪些缺陷公告？"
- "kernel 组件有哪些缺陷修复公告？"
- "查询 openEuler-BA-2025-1130 的详细内容"
- "babel 相关的缺陷公告有哪些？"
- "BUG-2025-32 对应的公告详情是什么？"

#### 14. 门户全站搜索 (`get_search_info`)

搜索 openEuler 门户网站全站内容，作为其他专项工具都不适用或未查到结果时的兜底查询。

**何时使用：**
- 其他专项工具（CVE 查询、SIG 查询、文档搜索等）均未找到相关结果时
- 问题涉及多个领域，不确定用哪个专项工具时
- 搜索 openEuler 博客文章、新闻资讯
- 搜索社区 Issue、代码提交记录
- 搜索 SIG 组相关内容
- 搜索会议记录（etherpad 文档）
- 泛化问题：如"openEuler 有哪些关于 XXX 的内容？"

**参数：**
- `keyword` (string, 必需): 搜索关键词，支持中英文，可以是单个词或短语
- `lang` (string, 可选): 搜索语言，`"zh"`（中文，默认）或 `"en"`（英文），根据用户提问语言自动选择

**特性：**
- 全站覆盖：博客文章、Issue、代码仓库、SIG 组页面、会议文档（etherpad）等多种类型
- HTML 清理：自动去除 API 返回的高亮 `<span>` 等标签
- 链接处理：相对路径自动补全门户域名，全 URL 直接使用
- 摘要截断：内容摘要超过 120 字符自动截断
- 15分钟缓存：相同关键词+语言命中缓存，减少 API 调用

**不推荐使用本工具的场景（请优先使用专项工具）：**
- 查询 CVE 漏洞 → 使用 `get_cve_info`
- 查询 SIG 详细信息 → 使用 `get_sig_info`
- 查询安全/缺陷公告 → 使用 `get_security_notice_info` / `get_bug_notice_info`
- 搜索技术文档（含版本）→ 使用 `get_docs_search_content`
- 查询软件包 → 使用 `get_package_info`
- 查询下载镜像 → 使用 `get_download_info`

**返回信息：**
- 搜索结果列表（最多 12 条）
- 每条结果的类型（博客文章/Issue/代码仓库/SIG 组/会议文档等）
- 标题、内容摘要（最多 120 字符）、日期、标签、作者
- 结果访问链接

**示例问题：**
- "openEuler 社区有关于容器的博客吗？"
- "openEuler 和 RISC-V 相关的内容有哪些？"
- "搜索 openEuler 门户中关于 DPU 的内容"
- "有没有关于 openEuler 虚拟化的文章？"
- "What content does openEuler have about containers?"

> 💡 **提示：** 会根据工具的描述自动选择合适的工具。详细了解工具选择机制，请查看 [TOOL_SELECTION.md](./TOOL_SELECTION.md)

## 高级用法

### SSE 模式（远程连接）

如果需要通过 HTTP 远程访问 MCP server：

```bash
# 使用 npx
npx openeuler-portal-mcp --sse

# 或指定端口
PORT=3000 npx openeuler-portal-mcp --sse

# 或使用全局安装
openeuler-portal-mcp --sse
```

SSE 模式提供以下端点：
- `http://localhost:3000/sse` - SSE 连接端点
- `http://localhost:3000/message` - 消息处理端点
- `http://localhost:3000/health` - 健康检查端点

### Docker 部署

```bash
# 构建镜像
docker build -t openeuler-portal-mcp .

# 运行容器（SSE 模式）
docker run -p 3000:3000 openeuler-portal-mcp
```

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/gzbang/openEuler-portal-mcp.git
cd openEuler-portal-mcp

# 安装依赖
npm install

# 启动开发服务器（Stdio 模式）
npm start

# 或启动 SSE 模式
npm run start:sse
```

## 项目结构

```
openeuler-portal-mcp/
├── src/
│   ├── index.js                    # 主入口文件
│   └── tools/                      # 工具函数目录
│       ├── getSigInfo.js           # SIG 信息查询
│       ├── getCveInfo.js           # CVE 安全公告查询
│       ├── getDownloadInfo.js      # 下载信息查询
│       ├── getOrganizationInfo.js  # 组织信息查询
│       ├── getPackageInfo.js       # 软件包信息查询
│       ├── getCompatibilityInfo.js # 兼容性测试查询
│       ├── getDocsVersion.js       # 文档版本查询
│       ├── getDocsSearchContent.js # 文档内容搜索
│       ├── getMeetingInfo.js       # 社区会议查询
│       ├── getShowcaseInfo.js      # 用户案例查询
│       ├── getOEEPInfo.js          # oEEP 演进提案查询
│       ├── getSecurityNoticeInfo.js # 安全公告查询
│       └── getBugNoticeInfo.js      # 缺陷公告查询
│       └── getSearchInfo.js         # 门户全站搜索
├── tests/                          # 测试文件目录
│   ├── getCveInfo.test.js          # CVE 查询工具测试
│   ├── getSigInfo.test.js          # SIG 信息查询工具测试
│   ├── getMeetingInfo.test.js      # 会议查询工具测试
│   ├── getShowcaseInfo.test.js     # 用户案例查询测试
│   ├── getOEEPInfo.test.js         # oEEP 查询测试
│   ├── getSecurityNoticeInfo.test.js # 安全公告查询测试
│   ├── getBugNoticeInfo.test.js    # 缺陷公告查询测试
│   └── getSearchInfo.test.js       # 门户全站搜索测试
├── docs/                           # 文档目录
├── package.json
├── Dockerfile
└── README.md
```

## 贡献

欢迎贡献！请随时提交 Issue 或 Pull Request。

### 添加新工具

1. 在 `src/tools/` 目录下创建新的工具文件
2. 导出工具函数和 `toolDefinition`
3. 在 `src/index.js` 中导入并注册工具

示例：

```javascript
// src/tools/myTool.js
export async function myTool(param) {
  // 工具逻辑
  return "结果";
}

export const toolDefinition = {
  name: "my_tool",
  description: "工具描述",
  inputSchema: {
    type: "object",
    required: ["param"],
    properties: {
      param: {
        type: "string",
        description: "参数描述",
      },
    },
  },
};
```

## 相关链接

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [openEuler 官网](https://www.openeuler.org/)
- [GitHub 仓库](https://github.com/gzbang/openEuler-portal-mcp)
- [npm 包](https://www.npmjs.com/package/openeuler-portal-mcp)

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 作者

sig-OpenDesign

---

如有问题或建议，欢迎在 [GitHub Issues](https://github.com/gzbang/openEuler-portal-mcp/issues) 中反馈。
