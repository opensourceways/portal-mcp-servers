# 数据源接入指南

MCP 工具的数据来源决定了工具的性能上限和实现复杂度。根据数据特性选择合适的接入模式。

---

## 模式一：REST API（实时数据）

**适用场景：** 会议记录、贡献统计、CVE 漏洞、Issue 列表等随时更新的数据。

### 标准接入模式

```javascript
// ── 常量定义 ─────────────────────────────────────────────
const BASE_URL = "https://api.mycommunity.org";
const LIST_API = `${BASE_URL}/v1/sig/list`;
const DETAIL_API = `${BASE_URL}/v1/sig/detail`;

// ── 缓存配置 ─────────────────────────────────────────────
let cachedList = null;
let listCacheExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 分钟

// ── 获取函数 ─────────────────────────────────────────────
async function fetchSigList() {
  const now = Date.now();
  if (cachedList && now < listCacheExpiry) return cachedList;

  const response = await fetch(LIST_API, {
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000), // ← 必须
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  // 检查业务状态码（很多社区 API code=0 才是成功）
  if (json.code !== 0 && json.code !== 1) {
    throw new Error(`API 错误：${json.msg || json.message}`);
  }

  cachedList = json.data;
  listCacheExpiry = now + CACHE_DURATION;
  return cachedList;
}
```

### POST 请求模式（部分社区 API 用 POST 查询）

```javascript
async function searchPackages(keyword, page = 1) {
  const response = await fetch(SEARCH_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, page, pageSize: 20 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).data;
}
```

### 并行请求（提高响应速度）

当一个工具需要聚合多个 API 的数据时，用 `Promise.all` 并行：

```javascript
// 同时获取 PR、Issue、Comment 三类贡献数据
const [prData, issueData, commentData] = await Promise.all([
  fetchContribute(sigName, "pr"),
  fetchContribute(sigName, "issue"),
  fetchContribute(sigName, "comment"),
]);
```

---

## 模式二：llms.txt（社区文档索引）

**适用场景：** 社区文档检索、文档目录浏览、关键词搜索跳转。

### 什么是 llms.txt

`llms.txt` 是一个新兴标准（见 [llmstxt.org](https://llmstxt.org)），专为 AI Agent 消费设计：
- Markdown 格式，结构简单
- `## Section` 分章节，`- [title](url)` 列文档条目
- 托管在社区网站根目录（如 `https://docs.mycommunity.org/llms.txt`）
- 也可以打包进 MCP 服务器的 `data/` 目录作为本地文件

### 解析实现

```javascript
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// 使用 import.meta.url 获取可移植的绝对路径（ESM 必须这样做）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = join(__dirname, "../../data/llms.txt");

// 永久内存缓存（文件内容不变，解析一次足够）
let _parsed = null;

function getDocData() {
  if (_parsed) return _parsed;
  const content = readFileSync(DATA_FILE, "utf-8");
  _parsed = parseLlms(content);
  return _parsed;
}

function parseLlms(content) {
  const lines = content.split("\n");
  const sections = [];
  let currentSection = null;

  // 提取首行 meta（title、description）
  const meta = {};
  let metaDone = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过 meta 区域（文件头部 # 标题和 > 描述）
    if (!metaDone) {
      if (trimmed.startsWith("# ")) { meta.title = trimmed.slice(2); continue; }
      if (trimmed.startsWith("> ")) continue;
      if (trimmed === "") continue;
      metaDone = true;
    }

    // 章节标题
    if (trimmed.startsWith("## ")) {
      currentSection = { name: trimmed.slice(3), entries: [] };
      sections.push(currentSection);
      continue;
    }

    // 文档条目：- [title](url)
    const match = trimmed.match(/^-\s+\[(.+?)\]\((.+?)\)/);
    if (match && currentSection) {
      const [, title, url] = match;
      // 语言检测：URL 中含 /zh/ → zh，/en/ → en
      const lang = url.includes("/zh/") ? "zh" : url.includes("/en/") ? "en" : "all";
      currentSection.entries.push({ title, url, lang });
    }
  }

  return { meta, sections };
}
```

### 搜索策略

```javascript
// 多关键词搜索：所有词必须同时匹配（AND 逻辑）
function searchEntries(sections, keyword, lang = "all") {
  const keywords = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];

  for (const section of sections) {
    const matched = section.entries.filter((entry) => {
      if (lang !== "all" && entry.lang !== lang && entry.lang !== "all") return false;
      const text = `${entry.title} ${entry.url}`.toLowerCase();
      return keywords.every((kw) => text.includes(kw));
    });
    if (matched.length > 0) {
      results.push({ sectionName: section.name, entries: matched });
    }
  }

  return results; // 按章节分组返回
}
```

---

## 模式三：结构化静态数据

**适用场景：** 版本生命周期表、架构说明、分类标签等相对稳定的数据。

### 内嵌到工具文件（小型数据 < 50 条）

```javascript
// 直接内嵌，无需 fetch，永远不过期
const RELEASE_LIFECYCLE = {
  "22.03-LTS": { releaseDate: "2022-03-30", eolDate: "2024-03-30", status: "EOL" },
  "22.03-LTS-SP3": { releaseDate: "2023-12-30", eolDate: "2026-03-30", status: "active" },
  "24.03-LTS": { releaseDate: "2024-03-22", eolDate: "2026-03-22", status: "active" },
};
```

### 读取本地 JSON 文件（中型数据 50~1000 条）

```javascript
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const DATA_PATH = join(dirname(__filename), "../../data/packages.json");

let _data = null;
function getData() {
  if (!_data) _data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  return _data;
}
```

### 远程 JSON + 长周期缓存（动态但低频更新）

```javascript
// 版本列表等数据，每天更新一次即可
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 小时

let cachedData = null;
let cacheExpiry = 0;

async function getVersionList() {
  const now = Date.now();
  if (cachedData && now < cacheExpiry) return cachedData;

  const response = await fetch(VERSION_API, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  cachedData = await response.json();
  cacheExpiry = now + CACHE_DURATION;
  return cachedData;
}
```

---

## 模式四：本地文件 + API 混合（getDocInfo 模式）

**适用场景：** 本地索引做快速搜索，API 作为兜底，分层缓存。

```
用户 query
    │
    ▼
本地 llms.txt 索引搜索  ──有结果──►  返回
    │
    │ 无结果
    ▼
远程搜索 API            ──有结果──►  返回（缓存 5 分钟）
    │
    │ 无结果
    ▼
返回"未找到，建议关键词"
```

**Map 缓存（多 key 场景）：**

```javascript
// 每个 (keyword, lang) 组合独立缓存
const apiCache = new Map(); // key → { data, expiry }
const API_CACHE_DURATION = 5 * 60 * 1000;

function getCachedApiResult(key) {
  const entry = apiCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  return null;
}

function setCachedApiResult(key, data) {
  apiCache.set(key, { data, expiry: Date.now() + API_CACHE_DURATION });
  // 防止 Map 无限增长（保留最近 100 条）
  if (apiCache.size > 100) {
    const firstKey = apiCache.keys().next().value;
    apiCache.delete(firstKey);
  }
}
```

---

## 数据源选择决策树

```
数据多久更新一次？
├── 实时/每小时 ──► REST API + 15 分钟缓存
├── 每天 ──────► REST API + 24 小时缓存 或 静态 JSON
├── 每周/每月 ──► 内嵌静态数据 或 本地文件
└── 文档内容 ──► llms.txt（本地索引）+ 页面内容按需 fetch

数据量多大？
├── < 50 条 ────► 内嵌到 JS 文件
├── 50~1000 条 ► 本地 JSON 文件
└── > 1000 条 ──► 远程 API + 分页
```
