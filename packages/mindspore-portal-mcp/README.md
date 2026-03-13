# MindSpore Portal MCP Server

[![npm version](https://img.shields.io/npm/v/mindspore-portal-mcp.svg)](https://www.npmjs.com/package/mindspore-portal-mcp)

MindSpore Model Context Protocol (MCP) Server，为 Claude 等 AI 工具提供 MindSpore 官网相关信息的查询能力。

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
npm install -g mindspore-portal-mcp
```

**优点：**

- 启动速度更快（无需下载）
- 可以固定版本
- 离线也能使用

### 方式 3：本地开发

克隆源码进行开发和调试。

```bash
# 克隆仓库
git clone https://github.com/sig-OpenDesign/mindspore-mcp.git
cd mindspore-mcp

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
    "mindspore-portal": {
      "command": "npx",
      "args": ["-y", "mindspore-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "mindspore-portal": {
      "command": "mindspore-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "mindspore-portal": {
      "command": "node",
      "args": ["/path/to/mindspore-mcp/src/index.js"]
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
    "mindspore-portal": {
      "command": "npx",
      "args": ["-y", "mindspore-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "mindspore-portal": {
      "command": "mindspore-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "mindspore-portal": {
      "command": "node",
      "args": ["/path/to/mindspore-mcp/src/index.js"]
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
    "mindspore-portal": {
      "command": "npx",
      "args": ["-y", "mindspore-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "mindspore-portal": {
      "command": "mindspore-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "mindspore-portal": {
      "command": "node",
      "args": ["/path/to/mindspore-mcp/src/index.js"]
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
    "mindspore-portal": {
      "command": "npx",
      "args": ["-y", "mindspore-portal-mcp"]
    }
  }
}
```

**使用全局安装：**

```json
{
  "mcpServers": {
    "mindspore-portal": {
      "command": "mindspore-portal-mcp"
    }
  }
}
```

**使用本地路径：**

```json
{
  "mcpServers": {
    "mindspore-portal": {
      "command": "node",
      "args": ["/path/to/mindspore-mcp/src/index.js"]
    }
  }
}
```

## 功能

提供 12 个工具函数，根据问题自动选择合适的工具函数。

### 工具列表

| 工具名称 | 函数名 | 功能描述 | 主要参数 | 使用场景 |
|---------|--------|---------|---------|---------|
| 产品信息查询 | `get_product_info` | 获取 MindSpore 的产品信息，返回分类和产品列表 | 无 | 了解 MindSpore 可用的产品信息、获取产品的详细信息 |
| SIG 信息查询 | `get_sig_info` | 获取 MindSpore 的 SIG 信息，返回 SIG 列表及其详细信息 | 无 | 查询 SIG 基本信息、维护者、管理的仓库 |
| 搜索信息查询 | `get_search_info` | 获取 MindSpore 的搜索结果 | `keyword` (必需), `limit` (必需) | 搜索 MindSpore 相关的文档和内容 |
| 搜索组件查询 | `get_search_components` | 获取 MindSpore 可搜索的组件列表 | 无 | 了解 MindSpore 可搜索的组件列表 |
| 生态资源查询 | `get_ecosystem_info` | 获取 MindSpore 的生态资源信息，包括三方开发库、教程和模型 | `type` (可选) | 了解 MindSpore 生态中的三方资源 |
| 应用案例查询 | `get_case_info` | 获取 MindSpore 的应用案例信息，包括企业、开发者和高校案例 | `type` (可选), `category` (可选) | 了解 MindSpore 在不同领域的应用案例 |
| 学术论文查询 | `get_paper_info` | 获取 MindSpore 相关学术论文信息 | `domain` (可选), `year` (可选) | 了解 MindSpore 相关的学术研究 |
| 共享看板数据 | `get_dashboard_info` | 获取 MindSpore 社区的共享看板数据 | 无 | 了解 MindSpore 社区的活跃度和发展情况 |
| 实习任务查询 | `get_internship_task_info` | 获取 MindSpore 的实习任务信息 | 无 | 了解 MindSpore 社区的实习任务 |
| 安装教程查询 | `get_installation_guide` | 获取 MindSpore 指定版本的安装教程 | `version` (可选) | 了解 MindSpore 的安装和升级步骤 |
| 模型库查询 | `get_model_info` | 查询 MindSpore 模型库信息 | `page_num`, `count_per_page`, `sort_by`, `name`, `task`, `industry`, `license` | 了解 MindSpore 模型库中的模型、搜索特定模型、按不同维度排序和筛选模型 |
| 数据集库查询 | `get_dataset_info` | 查询 MindSpore 数据集库信息 | `page_num`, `count_per_page`, `sort_by`, `name`, `task`, `industry`, `license` | 了解 MindSpore 数据集库中的数据集、搜索特定数据集、按不同维度排序和筛选数据集 |

### 详细说明

#### 1. 产品信息查询 (`get_product_info`)

获取 MindSpore 的产品信息，返回分类和产品列表。

**何时使用：**
- 用户想了解 MindSpore 可用的产品信息
- 用户需要获取产品的名称、描述、仓库地址、版本信息等详细信息
- 用户为产品管理和使用提供参考依据

**参数：**
无必填参数

**返回信息：**
- 类别：产品分类（如核心框架、大模型套件等）
- 名称：产品名称
- 描述：产品的功能描述
- 仓库：产品的代码仓库地址
- 版本：产品的版本信息

**示例问题：**
- "MindSpore 有哪些产品？"
- "MindSpore 大模型套件的详细信息"
- "MindSpore 的核心框架版本是什么？"

#### 2. SIG 信息查询 (`get_sig_info`)

获取 MindSpore 的 SIG 信息，返回 SIG 列表及其详细信息。

**何时使用：**
- 用户查询某个技术 SIG 的基本信息（名称、描述、邮件列表）
- 用户想了解 SIG 的代码维护者（Maintainers）和活跃贡献者（Committers）
- 用户查看 SIG 管理的 Git 代码仓库列表
- 用户获取 SIG 的分支管理和开发信息
- 用户查询某个仓库属于哪些 SIG 组
- 用户查询某个 maintainer 参与了哪些 SIG 组

**参数：**
无必填参数

**返回信息：**
- 名称：SIG 名称
- 描述：SIG 描述
- 邮箱：SIG 邮箱地址
- 创建时间：SIG 创建时间
- Maintainer：SIG 维护者列表
- 仓库：SIG 管理的仓库列表，包括仓库地址和 committers

**示例问题：**
- "MindSpore 有哪些 SIG？"
- "AI SIG 的维护者是谁？"
- "某个仓库属于哪些 SIG 组？"

#### 3. 搜索信息查询 (`get_search_info`)

获取 MindSpore 的搜索结果。

**何时使用：**
- 用户搜索 MindSpore 相关的文档和内容
- 用户获取特定关键词的搜索结果
- 用户为用户提供 MindSpore 相关信息的搜索能力

**参数：**
- `keyword` (string, 必需)：搜索关键词
- `limit` (array, 必需)：过滤条件，对象数组，例如：[{"components":"MindSpore","version":"r2.8.0"}]

**返回信息：**
- 标题：搜索结果标题
- 内容：搜索结果内容摘要
- 链接：搜索结果链接
- 组件：相关组件
- 版本：相关版本

**示例问题：**
- "搜索 MindSpore 的安装指南"
- "查找 MindSpore 的教程资源"

#### 4. 搜索组件查询 (`get_search_components`)

获取 MindSpore 可搜索的组件列表。

**何时使用：**
- 用户了解 MindSpore 可搜索的组件列表
- 用户为搜索功能提供组件选项
- 用户辅助用户进行更精确的搜索

**参数：**
无必填参数

**返回信息：**
- 可搜索的组件名称列表
- 每个组件的版本信息

**示例问题：**
- "MindSpore 有哪些可搜索的组件？"
- "某个组件的版本信息"

#### 5. 生态资源查询 (`get_ecosystem_info`)

获取 MindSpore 的生态资源信息，包括三方开发库、三方教程和三方模型。

**何时使用：**
- 用户了解 MindSpore 生态中的三方开发库
- 用户查询 MindSpore 相关的教程资源
- 用户查找 MindSpore 生态中的三方模型

**参数：**
- `type` (string, 可选)：资源类型，可选值为 lib（三方开发库）、tutorial（三方教程）、model（三方模型）

**返回信息：**
- 名称：资源名称
- 简介：资源简介
- 链接：资源链接

**示例问题：**
- "MindSpore 有哪些三方开发库？"
- "查找 MindSpore 的教程资源"
- "MindSpore 生态中的三方模型"

#### 6. 应用案例查询 (`get_case_info`)

获取 MindSpore 的应用案例信息，包括企业案例、开发者案例和高校案例。

**何时使用：**
- 用户了解 MindSpore 在不同领域的应用案例
- 用户查询特定类型的应用案例
- 用户查找特定分类的应用案例

**参数：**
- `type` (string, 可选)：案例类型，可选值为 企业案例、开发者案例、高校案例
- `category` (string, 可选)：案例分类，如 互联网、医疗、政府等

**返回信息：**
- 类型：案例类型
- 分类：案例分类
- 标题：案例标题
- 描述：案例描述
- tag：案例tag
- 链接：案例链接（仅当链接不为空时显示）

**示例问题：**
- "MindSpore 的企业应用案例"
- "医疗领域的 MindSpore 应用案例"
- "高校使用 MindSpore 的案例"

#### 7. 学术论文查询 (`get_paper_info`)

获取 MindSpore 相关学术论文信息。

**何时使用：**
- 用户了解 MindSpore 相关的学术研究
- 用户查询特定领域的学术论文
- 用户查找特定年份的学术论文

**参数：**
- `domain` (string, 可选)：论文领域，如 计算视觉、知识图谱等
- `year` (string, 可选)：发表年份，格式为 YYYY，如 2024

**返回信息：**
- 标题：论文标题
- 描述：论文描述
- 领域：论文领域
- 作者：论文作者
- 发表日期：论文发表日期
- 论文链接：论文链接
- 代码链接：代码链接

**示例问题：**
- "MindSpore 相关的学术论文"
- "2024 年 MindSpore 的学术论文"
- "计算视觉领域的 MindSpore 论文"

#### 8. 共享看板数据 (`get_dashboard_info`)

获取 MindSpore 社区的共享看板数据。

**何时使用：**
- 用户了解 MindSpore 社区的活跃度和发展情况
- 用户分析 MindSpore 社区的贡献者和代码提交情况
- 用户监控 MindSpore 社区的下载量和问题处理情况

**参数：**
无必填参数

**返回信息：**
- 社区下载量：MindSpore 社区的总下载量
- 贡献者数量：MindSpore 社区的贡献者总数
- 单位会员数量：MindSpore 社区的单位会员数量
- 合并请求 PR 数量：MindSpore 社区的合并 PR 总数
- 需求&问题 Issue 数量：MindSpore 社区的 Issue 总数
- 评审 Comment 数量：MindSpore 社区的评审 Comment 总数

**示例问题：**
- "MindSpore 社区的活跃度如何？"
- "MindSpore 有多少贡献者？"
- "MindSpore 的下载量是多少？"

#### 9. 实习任务查询 (`get_internship_task_info`)

获取 MindSpore 的实习任务信息。

**何时使用：**
- 用户了解 MindSpore 社区的实习任务
- 用户查询不同类型的实习任务
- 用户查找具体任务的详细信息和链接

**参数：**
无必填参数

**返回信息：**
- 任务类型名称：任务的类型名称
- 任务名称：具体任务的名称
- 任务描述：任务的详细描述
- 链接：任务的链接地址

**示例问题：**
- "MindSpore 有哪些实习任务？"
- "某个类型的实习任务详情"

#### 10. 安装教程查询 (`get_installation_guide`)

获取 MindSpore 指定版本的安装教程。

**何时使用：**
- 用户了解 MindSpore 的安装和升级步骤
- 用户查询特定版本的安装指南
- 用户获取安装过程中的注意事项

**参数：**
- `version` (string, 可选)：MindSpore 版本号，格式为 rX.X.X，默认为 r2.8.0

**返回信息：**
- 安装教程的详细步骤和说明

**示例问题：**
- "MindSpore 的安装教程"
- "MindSpore r2.8.0 的安装指南"
- "如何升级 MindSpore？"

#### 11. 模型库查询 (`get_model_info`)

查询 MindSpore 模型库信息，支持分页、排序和搜索功能。

**何时使用：**
- 用户了解 MindSpore 模型库中的模型
- 用户搜索特定名称的模型
- 用户按不同维度排序模型
- 用户按任务类型、行业、许可证筛选模型

**参数：**
- `page_num` (number, 可选)：页码，默认为 1
- `count_per_page` (number, 可选)：每页数量，可取值为 16、32、64，默认为 16
- `sort_by` (string, 可选)：排序方式，可取值为 global_score（综合排序）、download_count（下载量）、update_time（最新更新）、first_letter（首字母）
- `name` (string, 可选)：搜索的模型名称关键词
- `task` (string, 可选)：任务类型，从 MODEL_TASKS 中取值，最多传递一个
- `industry` (array, 可选)：行业，从 INDUSTRY 中取值，可以传递多个
- `license` (string, 可选)：许可证，从 LICENSES 中取值，只能传递一个

**返回信息：**
- 模型名称、描述、标签
- 下载量、收藏量、更新时间
- 模型链接

**示例问题：**
- "MindSpore 模型库中有哪些模型？"
- "搜索图像分类相关的模型"
- "按下载量排序的模型"

#### 12. 数据集库查询 (`get_dataset_info`)

查询 MindSpore 数据集库信息，支持分页、排序和搜索功能。

**何时使用：**
- 用户了解 MindSpore 数据集库中的数据集
- 用户搜索特定名称的数据集
- 用户按不同维度排序数据集
- 用户按任务类型、行业、许可证筛选数据集

**参数：**
- `page_num` (number, 可选)：页码，默认为 1
- `count_per_page` (number, 可选)：每页数量，可取值为 16、32、64，默认为 16
- `sort_by` (string, 可选)：排序方式，可取值为 global_score（综合排序）、download_count（下载量）、update_time（最新更新）、first_letter（首字母）
- `name` (string, 可选)：搜索的数据集名称关键词
- `task` (string, 可选)：任务类型，从 DATASET_TASKS 中取值，最多传递一个
- `industry` (array, 可选)：行业，从 INDUSTRY 中取值，可以传递多个
- `license` (string, 可选)：许可证，从 LICENSES 中取值，只能传递一个

**返回信息：**
- 数据集名称、描述、标签
- 下载量、收藏量、更新时间
- 数据集链接

**示例问题：**
- "MindSpore 数据集库中有哪些数据集？"
- "搜索图像分类相关的数据集"
- "按下载量排序的数据集"

> 💡 **提示：** 会根据工具的描述自动选择合适的工具。

## 高级用法

### SSE 模式（远程连接）

如果需要通过 HTTP 远程访问 MCP server：

```bash
# 使用 npx
npx mindspore-portal-mcp --sse

# 或指定端口
PORT=3000 npx mindspore-portal-mcp --sse

# 或使用全局安装
mindspore-portal-mcp --sse
```

SSE 模式提供以下端点：
- `http://localhost:3000/sse` - SSE 连接端点
- `http://localhost:3000/message` - 消息处理端点
- `http://localhost:3000/health` - 健康检查端点

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/sig-OpenDesign/mindspore-mcp.git
cd mindspore-mcp

# 安装依赖
npm install

# 启动开发服务器（Stdio 模式）
npm start

# 或启动 SSE 模式
npm run start:sse
```

## 项目结构

```
mindspore-mcp/
├── src/
│   ├── index.js                    # 主入口文件
│   ├── config/                     # 配置文件目录
│   │   ├── query.js                # 查询相关配置
│   │   ├── model-task.js           # 模型任务类型
│   │   ├── dataset-task.js         # 数据集任务类型
│   │   ├── industry.js             # 行业类型
│   │   └── license.js              # 许可证类型
│   └── tools/                      # 工具函数目录
│       ├── getProductInfo.js       # 产品信息查询
│       ├── getSigInfo.js           # SIG 信息查询
│       ├── getSearchInfo.js        # 搜索信息查询
│       ├── getSearchComponents.js  # 搜索组件查询
│       ├── getEcosystemInfo.js     # 生态资源查询
│       ├── getCaseInfo.js          # 应用案例查询
│       ├── getPaperInfo.js         # 学术论文查询
│       ├── getDashboardInfo.js     # 共享看板数据
│       ├── getInternshipTaskInfo.js # 实习任务查询
│       ├── getInstallationGuide.js # 安装教程查询
│       ├── getModelInfo.js         # 模型库查询
│       └── getDatasetInfo.js       # 数据集库查询
├── package.json
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
- [MindSpore 官网](https://www.mindspore.cn/)
- [GitHub 仓库](https://github.com/sig-OpenDesign/mindspore-mcp)
- [npm 包](https://www.npmjs.com/package/mindspore-portal-mcp)

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 作者

sig-OpenDesign

---

如有问题或建议，欢迎在 [GitHub Issues](https://github.com/sig-OpenDesign/mindspore-mcp/issues) 中反馈。