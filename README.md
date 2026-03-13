# Portal MCP Servers

一个面向开源社区门户的 **Model Context Protocol (MCP) Server** 集合，为 Claude、Cursor 等 AI 工具提供各开源社区官网信息的结构化查询能力。

## 什么是 MCP？

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 是一种开放协议，允许 AI 助手通过标准化接口调用外部工具和数据源。本仓库中的每个 MCP Server 都封装了对应社区官网的数据查询能力，AI 工具可直接调用，无需手动检索。

## 子包列表

| 包名 | 描述 | 状态 |
|------|------|------|
| [mindspore-portal-mcp](./packages/mindspore-portal-mcp/) | MindSpore 官网信息查询，提供模型库、数据集、论文、SIG、生态等 12 个工具 | 已发布 [![npm](https://img.shields.io/npm/v/mindspore-portal-mcp.svg)](https://www.npmjs.com/package/mindspore-portal-mcp) |
| [openEuler-portal-mcp](./packages/openEuler-portal-mcp/) | openEuler 社区官网信息查询 | 开发中 |
| [openUBMC-portal-mcp](./packages/opeUBMC-portal-mcp/) | openUBMC 社区官网信息查询 | 开发中 |

## 快速开始

各子包均支持通过 `npx` 直接使用，无需手动安装。以 MindSpore 为例，在 MCP 客户端配置文件中添加：

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

更多安装与配置方式，请参阅各子包的 README。

## 项目结构

```
portal-mcp-servers/
├── packages/
│   ├── mindspore-portal-mcp/     # MindSpore Portal MCP Server
│   ├── openEuler-portal-mcp/     # openEuler Portal MCP Server
│   └── opeUBMC-portal-mcp/       # openUBMC Portal MCP Server
├── docs/
│   ├── openEuler-design.md       # openEuler MCP Server 设计文档
│   └── openUBMC-design.md        # openUBMC MCP Server 设计文档
└── README.md
```

## 支持的客户端

所有 MCP Server 均兼容以下 AI 工具：

- [Claude Code](https://claude.ai/code) (终端 CLI)
- [Claude Desktop](https://claude.ai/download)
- [Cursor](https://www.cursor.com/)
- [Cline](https://github.com/cline/cline) (VS Code 插件)
- [Trae-CN](https://www.trae.com.cn/)
- 其他支持 MCP 协议的客户端

## 贡献指南

欢迎为现有子包添加新功能，或贡献新的社区 Portal MCP Server。

### 开发新的子包

1. 在 `packages/` 目录下创建新目录，命名规则：`<社区名>-portal-mcp`
2. 参考 [mindspore-portal-mcp](./packages/mindspore-portal-mcp/) 的结构实现
3. 在 `docs/` 目录下添加设计文档
4. 更新本 README 的子包列表

### 为已有子包贡献

请参阅对应子包目录下的 README 和贡献说明。

## 许可证

本仓库中各子包均采用 [MIT License](./packages/mindspore-portal-mcp/LICENSE)。

## 相关链接

- [Model Context Protocol 官网](https://modelcontextprotocol.io/)
- [openEuler 官网](https://www.openeuler.org/)
- [MindSpore 官网](https://www.mindspore.cn/)
- [openUBMC 官网](https://www.openubmc.cn/)
