# Server 架构与 Agent 交互模式

理解 MCP Server 如何与 LLM Agent 协作，是设计高质量工具的基础。

---

## MCP 协议基础

MCP（Model Context Protocol）定义了 LLM 与外部工具之间的标准通信协议：

```
用户提问
    │
    ▼
LLM（Claude 等）
    │ 1. 读取工具列表（ListTools）
    │ 2. 根据 description 决定是否调用
    │ 3. 填写参数，发起 CallTool 请求
    │
    ▼
MCP Server（你开发的）
    │ 4. 路由到对应工具函数
    │ 5. 执行查询，格式化结果
    │ 6. 返回 { content: [{ type: "text", text: "..." }] }
    │
    ▼
LLM 将结果整合进回答
    │
    ▼
用户看到最终答案
```

**关键洞察：** LLM 在步骤 2 完全依赖 `description` 字段决策。你的工具实现再好，描述写差了也不会被调用。

---

## 双传输模式架构

生产级 MCP Server 应同时支持两种传输模式：

### Stdio 模式（本地 IDE 集成）

```
Cursor / Claude Code
      ↕ stdin/stdout
  MCP Server 进程
```

- **适用：** 开发者本地使用，Cursor、VS Code、Claude Desktop
- **特点：** 进程级隔离，简单可靠，无需端口管理
- **配置方式（Cursor `mcp.json`）：**
  ```json
  {
    "mcpServers": {
      "my-community": {
        "command": "node",
        "args": ["/path/to/src/index.js"]
      }
    }
  }
  ```

### SSE 模式（远程部署）

```
远程 Claude Agent / 任意 MCP 客户端
      ↕ HTTP SSE 长连接
  MCP Server（部署在服务器）
```

- **适用：** 多用户共享、CI/CD、远程 Agent 服务
- **特点：** 支持多并发连接，需要保活心跳
- **保活心跳（必须，防止 30s 代理超时）：**
  ```javascript
  setInterval(() => {
    Object.values(transports).forEach((t) => {
      try { t.res?.write(":keepalive\n\n"); } catch {}
    });
  }, 25000); // 25s，比标准代理 30s 超时短
  ```

### 单进程双模式切换

```javascript
// 通过命令行参数或环境变量切换
const useSSE = process.argv.includes("--sse") || process.env.TRANSPORT === "sse";

if (useSSE) {
  startSSEServer();
} else {
  await startStdioServer();
}
```

---

## LLM 调用工具的完整流程

理解这个流程有助于设计正确的工具行为：

### 1. 工具发现（ListTools）

LLM 启动时会请求工具列表。你的 Server 返回：

```json
{
  "tools": [
    {
      "name": "get_sig_info",
      "description": "查询 SIG 信息...",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sig_name": { "type": "string", "description": "..." }
        }
      }
    }
  ]
}
```

**设计要点：** `description` 在这里只传 metadata 层（~100 词），LLM 会选择性地深入阅读。

### 2. 参数推断和填写

LLM 根据用户问题和工具描述，推断需要填哪些参数：

```
用户："查一下 bmc SIG 最近谁贡献最多"
LLM 推断：
  - 工具：get_sig_info（因为 description 提到了 SIG 和贡献）
  - sig_name: "bmc"（从用户问题提取）
  - query_type: "contribute"（因为用户问"谁贡献最多"）
```

**设计要点：** `enum` 参数必须在 description 中解释每个值的含义，否则 LLM 会猜。

### 3. 工具调用（CallTool）

LLM 发送：

```json
{
  "name": "get_sig_info",
  "arguments": {
    "sig_name": "bmc",
    "query_type": "contribute"
  }
}
```

**设计要点：** LLM 可能不填可选参数（依赖你的默认值），也可能填错 enum 值——工具必须有容错处理。

### 4. 结果消费

LLM 接收工具返回的 Markdown 文本，整合进最终回答。

**设计要点：** 工具返回的内容会直接嵌入 LLM 上下文，要控制长度（< 2000 词为宜），避免占满上下文窗口。

---

## Agent 与工具的交互模式

### 模式 1：单次查询

用户问简单问题，LLM 调一次工具，返回答案。这是最常见情况。

```
用户："Infrastructure SIG 有哪些 maintainer？"
→ LLM 调用 get_sig_info(sig_name="Infrastructure")
→ 返回结果
→ LLM 直接回答
```

### 模式 2：多步查询（工具链）

LLM 根据第一次工具结果决定是否继续调用工具：

```
用户："查一下最近 7 天有会议的 SIG"
→ LLM 调用 get_meeting_info(query_type="date", date="2025-01-15")
  → 返回会议列表（含 SIG 名称）
→ LLM 自动调用 get_sig_info(sig_name="Infrastructure")  # 跟进查询
  → 返回 SIG 详情
→ LLM 综合两次结果回答
```

**设计要点：** 工具返回的数据应该包含"后续查询所需的 ID/名称"，让 LLM 可以自然地进行链式调用。

### 模式 3：工具失败优雅降级

当工具返回"未找到"，LLM 会根据推荐自动重试：

```
用户："查一下 bmc sig"
→ LLM 调用 get_sig_info(sig_name="bmc")
  → 返回"未找到 bmc，相似名称：BMC、BMC-Drivers"
→ LLM 再次调用 get_sig_info(sig_name="BMC")  # 使用推荐名称重试
  → 返回正确结果
→ LLM 回答，可能说"我找到了 BMC SIG（注意大写）"
```

**设计要点：** 推荐消息格式要清晰，LLM 必须能从中提取出可以直接用的候选名称（用反引号 \`name\` 标记）。

---

## 工具返回内容设计原则

### 内容量控制

| 场景 | 建议长度 | 原因 |
|---|---|---|
| 单条详情 | 200-500 词 | 足够信息，不占用上下文 |
| 列表结果 | 最多 20 条 | 超过后 LLM 难以处理 |
| 文档内容 | ≤ 8000 字符 | 超出后截断并提示 |
| 错误消息 | 1-3 句话 | 简洁明确 |

### Markdown 格式的作用

工具返回 Markdown，有几个好处：
1. LLM 可以直接理解结构（标题、列表、代码块）
2. 用户最终看到的也是 Markdown 渲染结果
3. 减少 LLM 二次处理的工作量

```javascript
// ✅ 正确：返回结构化 Markdown
return `## Infrastructure SIG\n\n**维护者：** alice, bob\n**仓库数：** 5\n`;

// ❌ 错误：返回原始 JSON
return JSON.stringify({ name: "Infrastructure", maintainers: ["alice"] });
```

### 为链式调用提供锚点

当工具结果中包含 ID 或名称，要以 LLM 容易提取的格式展示：

```markdown
## Infrastructure SIG

**SIG 名称：** `Infrastructure`   ← 反引号包裹，LLM 容易提取
**贡献排行 Top 3：**
1. `alice`（PR: 42, Issue: 15）
2. `bob`（PR: 31, Issue: 8）
```

---

## 生产部署检查清单

### 安全
- [ ] 实现域名白名单（URL 类工具必须）
- [ ] 不在响应中暴露内部 API 地址
- [ ] 不在响应中暴露错误堆栈
- [ ] 所有用户输入经过基本清洗（防止注入）

### 性能
- [ ] 所有外部请求设置 15s 超时
- [ ] 高频数据实现 15 分钟缓存
- [ ] 并行化独立的多 API 请求
- [ ] 列表结果限制 20 条以内

### 可靠性
- [ ] 网络错误返回友好消息，不崩溃
- [ ] SSE 模式实现 25s 保活心跳
- [ ] 测试所有工具在网络断开时的行为

### 可观察性
- [ ] 使用 `console.error` 记录关键错误（stderr，不污染 stdio 通信）
- [ ] 缓存命中/失效可追踪（可选）

---

## 常见陷阱

### 陷阱 1：stdout 输出破坏 stdio 通信

在 stdio 模式下，MCP Server 通过 stdout 和 LLM 通信。如果你在工具函数中 `console.log()`，会污染协议流导致通信异常。

```javascript
// ❌ 错误
console.log("查询到数据：", data); // 污染 stdout

// ✅ 正确
console.error("查询到数据：", data); // stderr 不影响协议
```

### 陷阱 2：同步阻塞操作

所有 I/O 必须是异步的：

```javascript
// ❌ 错误（同步文件读取，阻塞事件循环）
const data = fs.readFileSync(DATA_PATH, "utf-8");

// ✅ 正确（一次性读取缓存的情况下 readFileSync 可接受）
// 但如果读取大文件或频繁调用，用 fs.promises.readFile
const data = await fs.promises.readFile(DATA_PATH, "utf-8");
```

### 陷阱 3：抛出异常而不是返回错误消息

MCP 框架会捕获工具抛出的异常，但最好在工具内部处理：

```javascript
// ❌ 会导致 MCP 框架级错误响应，格式不友好
export async function getSigInfo(name) {
  const data = await fetch(...); // 如果抛出，LLM 收到的是框架错误
}

// ✅ 在工具内捕获，返回友好消息
export async function getSigInfo(name) {
  try {
    const data = await fetch(...);
    return formatResult(data);
  } catch (e) {
    if (e.name === "AbortError") return "网络请求超时，请稍后重试。";
    return `查询失败：${e.message}`;
  }
}
```

### 陷阱 4：工具过多导致 LLM 选错

当 MCP Server 工具超过 8 个，LLM 选择正确工具的准确率会下降。
- **首选：** 合并相关工具（用 `query_type` 参数区分）
- **次选：** 优化 description 增加排除条件
- **最后手段：** 拆分成多个 MCP Server（按领域分组）

---

## 业界最佳实践参考

| 实践 | 来源 | 说明 |
|---|---|---|
| 工具描述是"说明书而非标签" | Anthropic MCP 文档 | description 要像同事说明书，不是简短标签 |
| 优先 idempotent（幂等）工具 | MCP 设计规范 | 同样参数多次调用结果相同，便于重试 |
| 工具结果包含完整上下文 | Claude 最佳实践 | 不要让 LLM 猜测，直接在结果中提供后续操作提示 |
| 限制工具数量（< 10 个） | 实践经验 | 工具越多，LLM 选择越准确，维护也越容易 |
| 输出为纯文本/Markdown | MCP 规范 | 避免结构化 JSON，LLM 直接消费文本 |
| 小心 streaming 工具 | MCP SDK 注意事项 | SSE 流式返回会增加客户端复杂度，非必要不用 |
