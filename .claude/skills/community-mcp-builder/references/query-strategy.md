# 智能查询策略设计

MCP 工具面对的是自然语言输入，用户不一定记得精确名称。好的查询策略应该"宽进严出"：
宽容地接受模糊输入，精确地返回有用信息。

---

## 核心原则：四层降级策略

```
用户输入
    │
    ▼ 层 1：精准匹配
    │ 命中 → 立即返回详细结果
    │
    ▼ 层 2：规范化匹配（大小写 / 去空格 / 别名）
    │ 命中 → 返回结果 + 提示"已自动纠正为 XXX"
    │
    ▼ 层 3：模糊匹配（子串 / 编辑距离）
    │ 有候选 → 返回推荐列表："您是否在查询：A、B、C？"
    │
    ▼ 层 4：全量列表兜底
    │ 无候选 → 返回分类/分组的全量列表
    │           + 引导提示："请从以下 XX 个结果中选择"
```

**关键：永远不要返回空白错误页面。** 即使完全匹配失败，也要给用户一个"下一步"。

---

## 实现示例：SIG 名称解析

```javascript
/**
 * 将用户输入解析为规范 SIG 名称。
 * 演示四层降级的完整实现。
 */
async function resolveSigName(input) {
  const allNames = await fetchAllSigNames(); // 从 API 获取规范名称列表

  // 层 1：精准匹配
  if (allNames.includes(input)) return { name: input, suggestions: [] };

  // 层 2：大小写不敏感
  const lower = input.toLowerCase();
  const caseMatch = allNames.find((n) => n.toLowerCase() === lower);
  if (caseMatch) return { name: caseMatch, suggestions: [] };

  // 层 3：子串或编辑距离 ≤ 3
  const fuzzy = allNames
    .map((n) => ({
      name: n,
      contains: n.toLowerCase().includes(lower),
      dist: editDistance(lower, n.toLowerCase()),
    }))
    .filter(({ contains, dist }) => contains || dist <= 3)
    .sort((a, b) => (a.contains !== b.contains ? (a.contains ? -1 : 1) : a.dist - b.dist))
    .slice(0, 5)
    .map(({ name }) => name);

  if (fuzzy.length > 0) return { name: null, suggestions: fuzzy };

  // 层 4：返回全量列表
  return { name: null, suggestions: allNames };
}

// 在主函数中使用
export async function getSigInfo(sigName, queryType = "sig") {
  const { name, suggestions } = await resolveSigName(sigName);

  if (!name) {
    if (suggestions.length <= 5) {
      // 少量候选 → 直接提示用户选择
      const list = suggestions.map((s) => `\`${s}\``).join("、");
      return `未找到 SIG "${sigName}"，您是否在查询：${list}？`;
    } else {
      // 大量候选（全量兜底）→ 分组展示
      return formatSigList(suggestions, sigName);
    }
  }

  // 找到精确名称，继续查询详情
  return await fetchAndFormatSigDetail(name);
}
```

---

## 日期智能查询（会议场景）

针对"查某天的会议"这类查询，当目标日期无结果时，推荐附近有会议的日期：

```javascript
async function getMeetingsByDate(date) {
  const meetings = await fetchMeetings(date);

  if (meetings.length > 0) return formatMeetings(meetings, date);

  // 当天没有会议 → 查询附近 7 天有会议的日期
  const nearbyDates = await fetchMeetingDates(date, 7);

  if (nearbyDates.length === 0) {
    return `${date} 及附近 7 天均无已安排的会议。`;
  }

  const dateList = nearbyDates.slice(0, 5).map((d) => `- ${d}`).join("\n");
  return `${date} 没有会议，以下日期有会议安排：\n\n${dateList}\n\n请指定其中一个日期重新查询。`;
}
```

---

## 分类浏览 + 关键词过滤组合

当工具同时支持"浏览"和"搜索"两种使用场景时，用 `query_type` 参数统一接口：

```javascript
export async function getAppInfo(queryType = "list", keyword = "", category = "") {
  const allApps = await fetchAppList();

  if (queryType === "list") {
    // 浏览模式：可按分类过滤
    const filtered = category
      ? allApps.filter((a) => a.type === category)
      : allApps;

    return formatGroupedList(filtered); // 按 type 分组显示
  }

  if (queryType === "detail") {
    // 详情模式：精准或模糊匹配包名
    const { match, suggestions } = findBestMatch(keyword, allApps, (a) => a.name);

    if (match) return formatAppDetail(await fetchAppDetail(match.name));
    if (suggestions.length > 0) {
      return `未找到"${keyword}"，相似包名：${suggestions.map((s) => `\`${s.name}\``).join("、")}`;
    }
    return `未找到包"${keyword}"，请使用 query_type="list" 查看所有可用包。`;
  }

  if (queryType === "search") {
    // 搜索模式：全文匹配名称和描述
    const results = allApps.filter((a) =>
      `${a.name} ${a.description}`.toLowerCase().includes(keyword.toLowerCase())
    );
    return results.length > 0
      ? formatGroupedList(results)
      : `未找到包含"${keyword}"的应用，建议尝试更简短的关键词。`;
  }
}
```

---

## 文档搜索兜底：本地→API 两阶段

```javascript
export async function getDocInfo(queryType, keyword, lang = "all") {
  if (queryType === "search") {
    const docData = getDocData(); // 解析 llms.txt（永久缓存）

    // 阶段 1：本地索引搜索
    const localResults = searchEntries(docData.sections, keyword, lang);

    if (localResults.length > 0) {
      return formatSearchResults(localResults, keyword);
    }

    // 阶段 2：调用远程搜索 API
    const cacheKey = `${keyword}:${lang}`;
    const cached = getCachedApiResult(cacheKey);
    if (cached) return formatApiResults(cached, keyword);

    const apiResults = await searchDocsByApi(keyword, lang);
    if (apiResults.length > 0) {
      setCachedApiResult(cacheKey, apiResults);
      return formatApiResults(apiResults, keyword);
    }

    // 两阶段均无结果
    return [
      `未找到包含"${keyword}"的文档。`,
      ``,
      `**建议：**`,
      `- 尝试更简短的关键词（如将"如何配置网络"改为"网络配置"）`,
      `- 使用 query_type="toc" 浏览文档目录`,
      `- 确认关键词拼写是否正确`,
    ].join("\n");
  }
}
```

---

## 推荐消息的写作规范

推荐消息应该让用户立刻知道"下一步做什么"：

```
❌ 差：未找到 sig。
✅ 好：未找到 SIG "bmc"，相似名称：`BMC`、`BMC-Drivers`。
        请使用准确名称重试，或输入 "list" 查看所有 SIG。

❌ 差：无结果。
✅ 好：2025-01-15 没有会议安排。以下日期有会议：
        - 2025-01-16（3 场）
        - 2025-01-17（1 场）
        请指定其中一个日期重新查询。

❌ 差：包不存在。
✅ 好：未找到包 "busytox"，您是否在查询：
        `busybox`（编辑距离 3）、`busytop`（编辑距离 2）？
```

---

## 查询性能优化

### 并行化独立请求

```javascript
// 需要聚合多类数据时，并行而不是串行
const [sigInfo, contributions, meetings] = await Promise.all([
  fetchSigDetail(sigName),
  fetchContributions(sigName),
  fetchRecentMeetings(sigName),
]);
```

### 预热缓存

如果某类数据几乎每次都会被用到（如 SIG 名称列表），可以在工具首次调用时就预热：

```javascript
// 在模块顶层（非函数内）异步预热，不阻塞
// 注意：只在 node.js 环境中运行，不要在顶层 await
setTimeout(() => {
  fetchAllSigNames().catch(() => {}); // 静默失败，只是预热
}, 100);
```

### 避免重复查询

用 `Promise` 防止并发请求重复触发同一 API：

```javascript
let _fetchingPromise = null;

async function fetchSigList() {
  const now = Date.now();
  if (cachedList && now < listCacheExpiry) return cachedList;

  // 避免并发的多个调用各自发一个请求
  if (_fetchingPromise) return _fetchingPromise;

  _fetchingPromise = fetch(LIST_URL, { signal: AbortSignal.timeout(15000) })
    .then((r) => r.json())
    .then((json) => {
      cachedList = json.data;
      listCacheExpiry = now + CACHE_DURATION;
      _fetchingPromise = null;
      return cachedList;
    })
    .catch((e) => {
      _fetchingPromise = null;
      throw e;
    });

  return _fetchingPromise;
}
```
