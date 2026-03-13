# 工具函数完整模板

复制此模板开始新工具。注释中标注了 **必须** 和 **可选** 的部分。

---

## 完整模板代码

```javascript
/**
 * @file getXxxInfo.js
 * @created YYYY-MM-DD by [Your Name] with Claude AI
 * @description [一句话说明这个工具做什么]
 *
 * 数据源：[API URL 或 "本地文件 data/xxx.json"]
 * 缓存策略：[15 分钟 / 永久 / 无]
 * 查询模式：[list | detail | search | ...]
 */

// ── 常量（必须：BASE_URL 使用常量，不硬编码在函数内） ────
const BASE_URL = "https://api.mycommunity.org";
const LIST_URL = `${BASE_URL}/v1/xxx/list`;
const DETAIL_URL = `${BASE_URL}/v1/xxx/detail`;

// ── 缓存（必须：API 工具必须实现缓存） ──────────────────
let cachedList = null;
let listCacheExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 分钟

// 测试用：暴露 reset 函数（测试文件会调用它）
export function _resetCache() {
  cachedList = null;
  listCacheExpiry = 0;
}

// ── 私有函数：数据获取 ────────────────────────────────────
async function fetchList() {
  const now = Date.now();
  if (cachedList && now < listCacheExpiry) return cachedList;

  const response = await fetch(LIST_URL, {
    signal: AbortSignal.timeout(15000), // 必须：超时 15s
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  // 检查业务状态码（根据具体 API 调整）
  if (!json.data) throw new Error(`API 返回无效数据：${JSON.stringify(json)}`);

  cachedList = json.data;
  listCacheExpiry = now + CACHE_DURATION;
  return cachedList;
}

async function fetchDetail(id) {
  const url = `${DETAIL_URL}/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).data;
}

// ── 私有函数：模糊匹配（可选，查询工具推荐实现） ─────────
function findBestMatch(input, items, keyFn = (x) => x) {
  const inputLower = input.toLowerCase();

  // 1. 精准匹配
  const exact = items.find((i) => keyFn(i) === input);
  if (exact) return { match: exact, suggestions: [] };

  // 2. 大小写不敏感
  const caseMatch = items.find((i) => keyFn(i).toLowerCase() === inputLower);
  if (caseMatch) return { match: caseMatch, suggestions: [] };

  // 3. 子串包含 + 编辑距离兜底
  const suggestions = items
    .map((i) => {
      const key = keyFn(i).toLowerCase();
      return { item: i, contains: key.includes(inputLower), dist: editDistance(inputLower, key) };
    })
    .filter(({ contains, dist }) => contains || dist <= 3)
    .sort((a, b) => (a.contains !== b.contains ? (a.contains ? -1 : 1) : a.dist - b.dist))
    .slice(0, 5)
    .map(({ item }) => item);

  return { match: null, suggestions };
}

function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

// ── 私有函数：格式化输出（必须：返回 Markdown，不返回 JSON） ─
function formatList(items, query) {
  if (!items || items.length === 0) return `未找到与"${query}"相关的结果。`;

  const displayItems = items.slice(0, 20); // 限制显示条数
  let result = `### 查询结果（共 ${items.length} 条，显示前 ${displayItems.length} 条）\n\n`;

  for (const item of displayItems) {
    result += `- **${item.name}**：${item.description || "暂无描述"}\n`;
  }

  if (items.length > 20) {
    result += `\n> 结果较多，请使用更具体的关键词缩小范围。\n`;
  }

  return result;
}

function formatDetail(item) {
  if (!item) return "未找到该条目的详细信息。";

  return [
    `## ${item.name}`,
    "",
    item.description ? `> ${item.description}` : "",
    "",
    `| 属性 | 值 |`,
    `|---|---|`,
    `| 版本 | ${item.version || "未知"} |`,
    `| 维护者 | ${item.maintainer || "未知"} |`,
    `| 状态 | ${item.status || "未知"} |`,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// ── 主函数（必须：导出，供 index.js 调用） ───────────────
/**
 * 查询 XXX 信息
 * @param {string} name - 查询名称（支持模糊输入）
 * @param {string} queryType - 查询类型："list"（列表）| "detail"（详情）
 * @returns {string} 格式化的 Markdown 字符串
 */
export async function getXxxInfo(name = "", queryType = "list") {
  try {
    const list = await fetchList();

    if (queryType === "list" || !name) {
      // 列表模式：name 作为过滤关键词（可选）
      const filtered = name
        ? list.filter((i) => i.name.toLowerCase().includes(name.toLowerCase()))
        : list;
      return formatList(filtered, name);
    }

    // 详情模式：先精准匹配，找不到给推荐
    const { match, suggestions } = findBestMatch(name, list, (i) => i.name);

    if (match) {
      const detail = await fetchDetail(match.id);
      return formatDetail(detail);
    }

    if (suggestions.length > 0) {
      const names = suggestions.map((s) => `\`${s.name}\``).join("、");
      return `未找到"${name}"，您是否在查询：${names}？\n\n请用精确名称重试。`;
    }

    return `未找到"${name}"，请检查名称是否正确，或使用 query_type="list" 查看全部条目。`;
  } catch (e) {
    if (e.name === "AbortError") return "⚠️ 网络请求超时，请稍后重试。";
    return `查询失败：${e.message}`; // 不暴露堆栈或内部 URL
  }
}

// ── 工具定义（必须：LLM 依赖此决定何时调用） ────────────
export const toolDefinition = {
  name: "get_xxx_info",  // snake_case，全局唯一

  // description 是最关键的字段，详见 references/tool-description.md
  description: `查询 [社区名称] 的 XXX 信息。

**何时使用：**
- 用户询问"XXX 是什么"、"查一下 XXX"
- 用户想了解 XXX 的详细信息（版本、维护者、状态）
- 用户列举所有可用的 XXX

**何时不用：**
- 用户询问 YYY 相关信息（请用 get_yyy_info）
- 用户想修改或创建 XXX（本工具只读）

**参数说明：**
- name：XXX 的名称，支持模糊输入，大小写不敏感
- query_type：list（列出所有，可用 name 过滤）或 detail（查某个的详情）

**示例问题：**
- "查一下 Infrastructure SIG 的详情"
- "列出所有可用的开发工具"`,

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "查询名称，支持模糊输入（如：infra → Infrastructure）",
      },
      query_type: {
        type: "string",
        enum: ["list", "detail"],
        description: "查询类型：list=列表，detail=详情（需同时提供 name）",
        default: "list",
      },
    },
    // 注：不一定需要 required，合理设默认值可让零 shot 直接工作
  },
};
```

---

## 模板要点说明

### 为什么需要 `_resetCache()`

测试需要在多个测试用例间重置缓存状态，否则缓存会导致测试相互干扰。命名以 `_` 开头表明是测试用途，不对外暴露。

### 模糊匹配的三层策略

1. **精准匹配**：完全相等，直接命中，无歧义
2. **大小写容错**：社区名称大小写不统一很常见（`bmc` vs `BMC`）
3. **子串 + 编辑距离**：处理缩写和拼写错误，编辑距离 ≤ 3 是经验阈值

### 为什么限制 20 条

LLM 上下文窗口有限，过多内容会导致：
- 关键信息被稀释，LLM 难以聚焦
- 响应生成变慢
- 用户体验变差

始终展示 top N 并提示总数，引导用户用更具体的关键词筛选。

### 错误消息原则

| 情况 | 返回 |
|---|---|
| 网络超时 | `"⚠️ 网络请求超时，请稍后重试。"` |
| 找不到记录 | `"未找到 X，您是否在查询：A、B、C？"` |
| API 错误 | `"查询失败：[原因]"`（不含内部 URL） |
| 参数错误 | `"请提供 xxx 参数"` |

永远不要把原始异常栈或内部 API 地址返回给用户。
