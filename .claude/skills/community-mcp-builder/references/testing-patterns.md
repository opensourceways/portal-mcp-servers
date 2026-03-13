# MCP 工具测试规范

MCP 工具测试的核心挑战：工具依赖外部 API，测试必须隔离网络。使用 mock fetch 是标准方案。

---

## 测试框架选择

本项目使用**原生 Node.js**（无需安装 Jest/Vitest），直接 `node tests/xxx.test.js` 运行：
- 零依赖，`package.json` 不需要测试框架
- 足够简单的断言帮助函数
- 适合 CI 环境和 MCP server 这类轻量工具

如果项目已有 Jest/Vitest，优先用框架，测试逻辑相同，语法稍有不同。

---

## 标准测试文件结构

```javascript
/**
 * @file getSigInfo.test.js
 * @created YYYY-MM-DD by [Author] with Claude AI
 * @description getSigInfo 工具函数单元测试
 *
 * 测试覆盖：
 * - 精准名称查询
 * - 大小写容错
 * - 未找到时的推荐
 * - 全量列表查询
 * - 缓存命中验证
 * - 网络超时处理
 * - API 错误处理
 */

import { strict as assert } from "assert";

// ── 测试工具函数 ─────────────────────────────────────────
let passed = 0;
let failed = 0;

function log(msg) { process.stdout.write(msg + "\n"); }

/**
 * 断言函数，打印通过/失败并计数
 */
function assertThat(condition, message) {
  if (condition) {
    log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    log(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

/**
 * 打印测试报告并退出
 */
function printSummary() {
  log(`\n${"═".repeat(50)}`);
  log(`测试结果：${passed} 通过，${failed} 失败`);
  if (failed > 0) {
    process.exit(1); // CI 中标记为失败
  }
}

// ── Mock 工厂：创建 URL 感知的 fetch mock ────────────────
/**
 * 根据请求 URL 返回不同响应的 fetch mock。
 * 这是关键工具：让同一次测试中不同 API 返回不同数据。
 */
function createMockFetch({ handlers, defaultError = null }) {
  return function mockFetch(url, options) {
    // 检查是否模拟超时
    if (options?.signal) {
      // 实际测试中 signal 不会真正触发，只测超时逻辑时需特殊处理
    }

    for (const [pattern, handler] of Object.entries(handlers)) {
      if (url.includes(pattern)) {
        const { status = 200, data } = typeof handler === "function"
          ? handler(url)
          : handler;

        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          json: () => Promise.resolve(data),
        });
      }
    }

    if (defaultError) return Promise.reject(new Error(defaultError));
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  };
}

/**
 * 创建超时 mock（模拟 AbortSignal.timeout 触发）
 */
function createTimeoutFetch() {
  return function () {
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    return Promise.reject(error);
  };
}

// ── 测试用 mock 数据 ──────────────────────────────────────
const MOCK_SIG_LIST = {
  code: 1,
  data: ["Infrastructure", "BMC", "Security", "Networking"],
};

const MOCK_SIG_DETAIL = {
  code: 1,
  data: {
    name: "Infrastructure",
    description: "基础设施 SIG，负责社区 CI/CD 建设",
    maintainers: [{ gitee_id: "alice", email: "alice@example.com" }],
    repos: ["infra/ci-scripts", "infra/tools"],
  },
};

// ── 测试用例 ──────────────────────────────────────────────

/**
 * 测试 1：精准名称查询
 */
async function testExactMatch() {
  log("\n▶ 测试 1: 精准名称查询");

  global.fetch = createMockFetch({
    handlers: {
      "stat/sig/info": { data: MOCK_SIG_LIST },
      "openubmc/sig/info": { data: MOCK_SIG_DETAIL },
    },
  });

  // 动态导入确保每次测试都能重置模块状态
  const { getSigInfo, _resetCache } = await import("../src/tools/getSigInfo.js");
  _resetCache();

  const result = await getSigInfo("Infrastructure", "sig");

  assertThat(result.includes("Infrastructure"), "结果包含 SIG 名称");
  assertThat(result.includes("基础设施"), "结果包含 SIG 描述");
  assertThat(result.includes("alice"), "结果包含维护者信息");
  assertThat(!result.includes("未找到"), "结果不包含错误提示");
}

/**
 * 测试 2：大小写容错
 */
async function testCaseInsensitive() {
  log("\n▶ 测试 2: 大小写容错");

  global.fetch = createMockFetch({
    handlers: {
      "stat/sig/info": { data: MOCK_SIG_LIST },
      "openubmc/sig/info": { data: MOCK_SIG_DETAIL },
    },
  });

  const { getSigInfo, _resetCache } = await import("../src/tools/getSigInfo.js");
  _resetCache();

  const result = await getSigInfo("infrastructure"); // 小写输入

  assertThat(!result.includes("未找到"), "小写输入能匹配到 Infrastructure");
  assertThat(result.includes("Infrastructure"), "返回规范化名称");
}

/**
 * 测试 3：未找到时返回推荐
 */
async function testNotFoundWithSuggestions() {
  log("\n▶ 测试 3: 未找到时返回推荐");

  global.fetch = createMockFetch({
    handlers: {
      "stat/sig/info": { data: MOCK_SIG_LIST },
    },
  });

  const { getSigInfo, _resetCache } = await import("../src/tools/getSigInfo.js");
  _resetCache();

  const result = await getSigInfo("infra"); // 近似词

  assertThat(result.includes("Infrastructure"), "推荐包含近似名称");
  // 不应该直接报错，应该给推荐
  assertThat(!result.includes("查询失败"), "不是硬错误");
}

/**
 * 测试 4：空名称返回全量列表
 */
async function testEmptyNameReturnsList() {
  log("\n▶ 测试 4: 空名称返回全量列表");

  global.fetch = createMockFetch({
    handlers: {
      "stat/sig/info": { data: MOCK_SIG_LIST },
    },
  });

  const { getSigInfo, _resetCache } = await import("../src/tools/getSigInfo.js");
  _resetCache();

  const result = await getSigInfo("", "sig");

  assertThat(result.includes("Infrastructure"), "列表包含第一个 SIG");
  assertThat(result.includes("BMC"), "列表包含其他 SIG");
}

/**
 * 测试 5：缓存命中（fetch 只被调用一次）
 */
async function testCacheHit() {
  log("\n▶ 测试 5: 缓存命中");

  let fetchCallCount = 0;
  global.fetch = function (url) {
    if (url.includes("stat/sig/info")) {
      fetchCallCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_SIG_LIST),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_SIG_DETAIL),
    });
  };

  const { getSigInfo, _resetCache } = await import("../src/tools/getSigInfo.js");
  _resetCache(); // 清除缓存

  await getSigInfo("Infrastructure"); // 第一次调用，应发请求
  await getSigInfo("BMC");            // 第二次调用，应命中缓存

  assertThat(fetchCallCount === 1, `SIG 列表只应请求一次（实际：${fetchCallCount}）`);
}

/**
 * 测试 6：网络超时
 */
async function testNetworkTimeout() {
  log("\n▶ 测试 6: 网络超时");

  global.fetch = createTimeoutFetch();

  const { getSigInfo, _resetCache } = await import("../src/tools/getSigInfo.js");
  _resetCache();

  const result = await getSigInfo("Infrastructure");

  assertThat(result.includes("超时"), "超时时返回超时提示");
  assertThat(!result.includes("AbortError"), "不暴露内部错误类型名");
}

/**
 * 测试 7：API 返回错误状态码
 */
async function testApiError() {
  log("\n▶ 测试 7: API 错误");

  global.fetch = createMockFetch({
    handlers: {
      "stat/sig/info": { status: 500, data: { error: "Internal Server Error" } },
    },
  });

  const { getSigInfo, _resetCache } = await import("../src/tools/getSigInfo.js");
  _resetCache();

  const result = await getSigInfo("Infrastructure");

  assertThat(result.includes("失败") || result.includes("错误"), "返回错误提示");
  assertThat(!result.includes("500"), "不暴露 HTTP 状态码给用户");
}

// ── 运行所有测试 ──────────────────────────────────────────
const originalFetch = global.fetch;

log("═".repeat(50));
log("getSigInfo 单元测试");
log("═".repeat(50));

try {
  await testExactMatch();
  await testCaseInsensitive();
  await testNotFoundWithSuggestions();
  await testEmptyNameReturnsList();
  await testCacheHit();
  await testNetworkTimeout();
  await testApiError();
} finally {
  global.fetch = originalFetch; // 恢复原始 fetch
}

printSummary();
```

---

## 测试覆盖矩阵

每个工具至少覆盖以下 6 类测试：

| 测试类型 | 测试什么 | 关键断言 |
|---|---|---|
| 精准匹配 | 输入准确名称 | 返回正确详情，不含"未找到" |
| 大小写容错 | 输入错误大小写 | 能匹配到正确结果 |
| 模糊匹配推荐 | 输入近似词 | 返回候选列表，含正确推荐 |
| 空/列表模式 | 空输入或 list 模式 | 返回所有条目 |
| **缓存命中** | 两次调用 | fetch 只调一次 |
| **网络超时** | fetch 抛 AbortError | 返回中文超时提示 |
| API 错误 | HTTP 500 | 返回友好错误，不暴露内部信息 |
| 贡献/详情模式 | query_type 切换 | 返回对应模式的数据 |

---

## 测试 llms.txt 解析（无网络依赖）

本地文件解析不需要 mock fetch，直接测试解析逻辑：

```javascript
// 使用内联 mock 数据，不读取真实文件
const MOCK_LLMS = `# openUBMC Documentation
> Community documentation index

## Quick Start / 快速入门
- [构建你的BMC](https://openubmc.cn/docs/zh/quick-start)
- [Build Your BMC](https://openubmc.cn/docs/en/quick-start)

## Architecture / 架构
- [系统架构](https://openubmc.cn/docs/zh/arch)
`;

// 复制 parseLlms 函数到测试文件，或从工具文件导出它（推荐后者）
async function testParseLlms() {
  log("\n▶ 测试: llms.txt 解析");

  // 如果 parseLlms 是导出的，可以直接 import 并测试
  // 如果是私有函数，在测试文件中维护一份相同逻辑用于测试

  const data = parseLlms(MOCK_LLMS);

  assertThat(data.sections.length === 2, "应有 2 个章节");
  assertThat(data.sections[0].name === "Quick Start / 快速入门", "第一章节名称");
  assertThat(data.sections[0].entries.length === 2, "快速入门有 2 篇文档");
  assertThat(data.sections[0].entries[0].lang === "zh", "第一篇是中文文档");
  assertThat(data.sections[0].entries[1].lang === "en", "第二篇是英文文档");
}
```

---

## 运行测试

```bash
# 运行单个测试
node tests/getSigInfo.test.js

# 运行所有测试
node tests/getSigInfo.test.js && \
node tests/getMeetingInfo.test.js && \
node tests/getAppInfo.test.js && \
node tests/getDocInfo.test.js

# 或者在 package.json 中配置
# "test": "node tests/getSigInfo.test.js && node tests/getMeetingInfo.test.js"
```

---

## 常见测试陷阱

### 陷阱 1：模块缓存导致测试互相干扰

Node.js 会缓存 `import` 的模块。如果工具模块有模块级缓存变量，测试 A 的缓存会影响测试 B。

**解决方案：** 工具函数导出 `_resetCache()`，每个测试用例调用一次：

```javascript
const { getSigInfo, _resetCache } = await import("../src/tools/getSigInfo.js");
_resetCache(); // ← 每个测试用例开头必须调用
```

### 陷阱 2：动态 import 不会重新执行模块

ESM 模块只会初始化一次。如果你用 `import` 在顶部引入，模块级变量不会在测试间重置。用 `_resetCache()` 而不是重新 import。

### 陷阱 3：只测"成功路径"

很多 bug 藏在错误处理中。强制覆盖：
- 超时（AbortError）
- HTTP 非 2xx（response.ok = false）
- JSON 格式错误（json.data 为 null）
- 空结果（data = []）

### 陷阱 4：断言太宽泛

```
❌ assertThat(result.length > 0, "有结果")  // 返回错误消息也会通过
✅ assertThat(result.includes("Infrastructure"), "包含 SIG 名称")
✅ assertThat(!result.includes("未找到"), "不是错误消息")
```
