---
name: community-mcp-builder
description: >
  全流程指导为开源社区构建高质量 MCP (Model Context Protocol) Server。
  当用户需要为开源社区门户网站构建 MCP 工具、查询 AI Agent、将社区 API/文档/数据暴露给
  LLM 工具时，触发此 skill。覆盖数据源接入（REST API、llms.txt、静态数据）、
  工具函数设计、智能查询策略、测试规范、工具描述优化，以及 Server↔Agent 交互模式。
  适用场景：openEuler / openUBMC / MindSpore 等开源社区的 MCP Server 从零到上线。
---

# Community MCP Builder

为开源社区构建生产级 MCP Server 的完整指南。

## 快速定位

| 你想做什么 | 读哪个文件 |
|---|---|
| 接入 REST API / llms.txt / 静态数据 | `references/data-sources.md` |
| 写一个新工具函数（含完整模板） | `references/tool-template.md` |
| 设计"精准查询→推荐兜底"的查询逻辑 | `references/query-strategy.md` |
| 写让 LLM 正确调用的工具描述 | `references/tool-description.md` |
| 编写测试脚本 | `references/testing-patterns.md` |
| 理解 Server↔Agent 交互、Server 架构 | `references/server-setup.md` |

---

## 一、项目脚手架

### 目录结构

```
my-community-mcp/
├── src/
│   ├── index.js          # 服务器入口：注册工具、路由请求
│   └── tools/
│       ├── _template.js  # 工具函数模板（复制此文件开始新工具）
│       ├── getSigInfo.js # 示例：单文件单功能
│       └── getDocInfo.js # 示例：本地文件 + API 混合
├── data/
│   └── llms.txt          # 社区文档索引（llms.txt 标准格式，可选）
├── tests/
│   └── getSigInfo.test.js
├── package.json
└── README.md
```

**核心原则：一个 `.js` 文件 = 一个工具函数 = 一个独立职责。**

### package.json 最小配置

```json
{
  "name": "my-community-mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.js",
  "bin": { "my-community-mcp": "src/index.js" },
  "scripts": {
    "start": "node src/index.js",
    "start:sse": "node src/index.js --sse"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0"
  }
}
```

`"type": "module"` 启用 ESM，工具文件使用 `import/export`。

---

## 二、开发流程（六步）

```
1. 明确数据源  →  2. 设计工具接口  →  3. 实现工具函数
       ↓
6. 发布上线   ←   5. 注册到 Server  ←  4. 编写测试
```

### Step 1：明确数据源

参见 `references/data-sources.md`。决定每个工具用哪种数据源：
- **REST API**：实时数据、需缓存
- **llms.txt**：社区文档索引、本地解析最快
- **静态 JSON/CSV**：版本列表、分类数据、永久缓存

### Step 2：设计工具接口（最重要）

在写代码之前，先想清楚：

```
工具名称：get_sig_info（snake_case 动词-名词）
核心参数：
  - sig_name (string, 必需)：SIG 名称，支持模糊输入
  - query_type (enum: "sig"|"contribute", 默认 "sig")：查询类型

返回格式：Markdown 字符串（不返回 JSON）
失败时：返回友好中文错误消息（不抛出异常）
```

**工具接口设计原则：**
- 参数数量 ≤ 4（LLM 填参数出错率随参数增加显著上升）
- 使用 `enum` 约束有限选项（防止 LLM 乱填）
- 提供有意义的默认值（让 zero-shot 调用就能工作）
- 支持模糊输入（用户不一定记得精确名称）

### Step 3：实现工具函数

复制 `references/tool-template.md` 中的模板，填入具体逻辑。

关键要求：
- 超时控制：`AbortSignal.timeout(15000)`（强制）
- 缓存：API 数据 15 分钟，静态数据永久
- 输出：Markdown 格式，限制条数（列表 ≤ 20 条）
- 错误：catch AbortError 单独处理，返回中文提示

### Step 4：编写测试

参见 `references/testing-patterns.md`。每个工具至少 6 个测试用例：

| 测试类型 | 说明 |
|---|---|
| 精准匹配 | 输入准确名称，验证返回正确内容 |
| 大小写容错 | 输入错误大小写，验证自动纠正 |
| 未找到 | 输入不存在的内容，验证友好错误消息 |
| 模糊匹配 | 输入近似词，验证推荐列表 |
| 缓存命中 | 两次调用验证缓存生效（fetch 只调一次） |
| 网络超时 | 模拟超时，验证返回中文超时提示 |

### Step 5：注册到 Server

三步注册（见下方 index.js 模式）：
1. `import` 函数和 toolDefinition
2. 加入 `tools` 数组
3. 加入 `toolHandlers` 映射

### Step 6：文档更新检查清单

- [ ] README.md：更新工具数量、工具列表表格、详细说明
- [ ] package.json：更新版本号（新增工具 → minor bump）
- [ ] CHANGELOG.md：记录新增功能

---

## 三、index.js 注册模式

```javascript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";

// ── 导入工具 ──────────────────────────────────────────────
import { getSigInfo, toolDefinition as getSigInfoDef } from "./tools/getSigInfo.js";
import { getDocInfo, toolDefinition as getDocInfoDef } from "./tools/getDocInfo.js";
// 新工具在此 import

// ── 工具注册 ──────────────────────────────────────────────
const tools = [
  getSigInfoDef,
  getDocInfoDef,
  // 新工具 toolDefinition 加这里
];

// ── 路由映射（工具名 → 处理函数）─────────────────────────
const toolHandlers = {
  get_sig_info: (args) => getSigInfo(args.sig_name || "", args.query_type || "sig"),
  get_doc_info: (args) => getDocInfo(args.query_type || "toc", args.keyword || "", args.lang || "all"),
  // 新工具加这里
};

// ── Server 核心 ───────────────────────────────────────────
const server = new Server(
  { name: "my-community-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = toolHandlers[name];
  if (!handler) {
    throw new Error(`未知工具：${name}`);
  }
  const result = await handler(args || {});
  return { content: [{ type: "text", text: result }] };
});

// ── 启动（stdio / SSE 双模式）────────────────────────────
const useSSE = process.argv.includes("--sse") || process.env.TRANSPORT === "sse";

if (useSSE) {
  // SSE 模式：部署到服务器，供远程 Agent 访问
  const PORT = parseInt(process.env.PORT || "3000");
  const httpServer = http.createServer();
  const transports = {};

  httpServer.on("request", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    if (req.url === "/sse") {
      const transport = new SSEServerTransport("/messages", res);
      transports[transport.sessionId] = transport;
      await server.connect(transport);
    } else if (req.url?.startsWith("/messages")) {
      const sessionId = new URL(req.url, `http://localhost`).searchParams.get("sessionId");
      const transport = transports[sessionId];
      if (transport) await transport.handlePostMessage(req, res);
      else { res.writeHead(404); res.end(); }
    }
  });

  // 保活心跳（防止代理 30s 断连）
  setInterval(() => {
    Object.values(transports).forEach((t) => {
      try { t.res?.write(":keepalive\n\n"); } catch {}
    });
  }, 25000);

  httpServer.listen(PORT, () => console.error(`SSE 已启动：http://localhost:${PORT}`));
} else {
  // Stdio 模式：本地 IDE（Cursor、Claude Code）
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

**路由映射建议：** 用对象 `toolHandlers` 替代 `switch/case`，新增工具只需加一行。参数解包在 handler 箭头函数内做，保持 switch 体整洁。

---

## 四、工具描述质量是成败关键

LLM 完全依赖 `toolDefinition.description` 决定"是否调用"和"如何调用"。
参见 `references/tool-description.md` 获取完整指南。

**三秒检验法：** 把 description 念给一个不了解这个工具的同事听，他能立刻知道什么时候用这个工具、不能用这个工具做什么吗？如果能——描述合格。

---

## 五、核心约束速查

| 项目 | 要求 |
|---|---|
| API 超时 | 必须 `AbortSignal.timeout(15000)` |
| 缓存时间 | API 数据 15 分钟，静态数据永久 |
| 返回格式 | Markdown 字符串，不返回原始 JSON |
| 列表限制 | 最多显示 20 条，注明总数 |
| 错误消息 | 中文，不暴露内部 URL 或堆栈 |
| 工具参数 | ≤ 4 个，有限选项用 enum |
| 函数长度 | 单函数 ≤ 50 行（不含注释） |
| 测试要求 | 每工具 ≥ 6 个测试用例，无测试不提交 |
