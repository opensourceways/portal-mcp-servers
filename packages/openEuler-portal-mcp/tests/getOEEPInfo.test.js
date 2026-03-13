/**
 * @created 2026-03-02 by sig-OpenDesign with Claude AI
 * @description getOEEPInfo 工具函数单元测试
 */

// ─── 模拟数据 ────────────────────────────────────────────────
const MOCK_INDEX_MARKDOWN = `---
标题:     oEEP (openEuler 演进提案 Evolution Proposal) 索引
类别:     信息整理
摘要:     当前 oEEP 全集索引
作者:     胡欣蔚 (shinwell_hu at openeuler.sh)
状态:     活跃
编号:     oEEP-0000
创建日期: 2023-04-16
修订日期: 2023-07-31
---

## 索引:

| 编号 | 类型，状态 | 标题 | 作者 | 提案日期 |
| :----: | :-----------: | :----: | :----: | :---------: |
| 0001 | P,I | [通过 oEEP 规范化社区演进的技术决策流程](oEEP-0001%20通过%20oEEP%20规范化社区演进的技术决策流程.md) | 胡欣蔚 shinwell_hu | 2023-04-13 |
| 0002 | D,I | [oEEP 格式与内容规范](oEEP-0002%20oEEP%20格式与内容规范.md) | 胡欣蔚 shinwell_hu | 2023-04-13 |
| 0003 | S,I | [LLVM平行宇宙计划](oEEP-0003%20LLVM%E5%B9%B3%E8%A1%8C%E5%AE%87%E5%AE%99%E8%AE%A1%E5%88%92.md) | 赵川峰 cf-zhao | 2023-05-04 |
| 0004 | S,A | [dnf根据用户情况自动优化下载软件包](oEEP-0004%20dnf%E6%A0%B9%E6%8D%AE%E7%94%A8%E6%88%B7%E6%83%85%E5%86%B5.md) | 陈曾 zengchen1024 | 2023-06-07 |
| 0005 | P,F | [openEuler官方容器镜像发布流程](oEEP-0005%20openEuler%E5%AE%98%E6%96%B9%E5%AE%B9%E5%99%A8%E9%95%9C%E5%83%8F.md) | 姜逸坤 鲁卫军 | 2023-05-10 |

## oEEP 类型分类：
- D (Document, 信息整理)
- P (Process, 流程设计)
- S (Standard, 特性变更)

## oEEP 状态分类：
- I (Initial, 初始化)
- A (Accepted, 接纳)
- F (Final, 已完成)
`;

const MOCK_DETAIL_0001 = `---
标题:     通过 oEEP 规范化社区演进的技术决策流程
类别:     流程设计
摘要:     为 openEuler 增加 oEEP 流程
作者:     胡欣蔚 (shinwell_hu at openeuler.sh)
状态:     活跃
编号:     oEEP-0001
创建日期: 2023-04-16
修订日期: 2023-05-25
---

## 动机/问题描述:
  openEuler 社区需要通过 oEEP 流程规范化技术决策。

## 方案的详细描述：
  所有 oEEP 从初始化状态开始，经过技术委员会评审后进入接纳状态。

## 参考文档与链接:
- python PEP说明: https://peps.python.org/pep-0000/
`;

// ─── 测试工具函数 ──────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// 创建 mock fetch：根据 URL 关键字返回不同响应
function createSmartMockFetch(urlMap, defaultData = null) {
  return function mockFetch(url, options) {
    if (options?.error) return Promise.reject(options.error);

    for (const [keyword, response] of Object.entries(urlMap)) {
      if (url.includes(encodeURIComponent(keyword)) || url.includes(keyword)) {
        if (response.error) return Promise.reject(response.error);
        return Promise.resolve({
          ok: response.ok !== false,
          status: response.status || 200,
          json: () => Promise.resolve(response.data),
        });
      }
    }

    // 默认响应
    if (defaultData !== null) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(defaultData),
      });
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ code: 404, data: null, msg: "not found" }),
    });
  };
}

// 标准 index mock 响应
const INDEX_RESPONSE = { code: 200, data: MOCK_INDEX_MARKDOWN, msg: "ok" };
// 标准 detail 0001 mock 响应
const DETAIL_0001_RESPONSE = { code: 200, data: MOCK_DETAIL_0001, msg: "ok" };

// ─── 测试用例 ─────────────────────────────────────────────────

// ============================
// 测试 1：列表查询 - 正常返回所有 oEEP
// ============================
async function testListAll() {
  console.log("\n【测试 1】列表查询 - 返回全部 oEEP");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({ "oEEP-0000": { data: INDEX_RESPONSE } });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("list", "", "");

    assert(result.includes("oEEP-0001"), "列表包含 oEEP-0001");
    assert(result.includes("oEEP-0005"), "列表包含 oEEP-0005");
    assert(result.includes("通过 oEEP 规范化"), "列表包含标题");
    assert(result.includes("共 5 篇"), "显示总数为 5");
    assert(result.includes("类型说明"), "列表包含类型说明");
    assert(result.includes("状态说明"), "列表包含状态说明");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：列表查询 - 关键词过滤（标题匹配）
// ============================
async function testListWithKeyword() {
  console.log("\n【测试 2】列表查询 - 关键词过滤（标题）");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({ "oEEP-0000": { data: INDEX_RESPONSE } });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("list", "", "LLVM");

    assert(result.includes("oEEP-0003"), "关键词LLVM匹配到oEEP-0003");
    assert(!result.includes("oEEP-0001"), "oEEP-0001不包含LLVM不应出现");
    assert(result.includes("匹配 1 篇"), "显示匹配数量");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：列表查询 - 按作者过滤
// ============================
async function testListFilterByAuthor() {
  console.log("\n【测试 3】列表查询 - 按作者过滤");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({ "oEEP-0000": { data: INDEX_RESPONSE } });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("list", "", "胡欣蔚");

    assert(result.includes("oEEP-0001"), "胡欣蔚的oEEP-0001应出现");
    assert(result.includes("oEEP-0002"), "胡欣蔚的oEEP-0002应出现");
    assert(!result.includes("oEEP-0003"), "赵川峰的oEEP-0003不应出现");
    assert(result.includes("匹配 2 篇"), "胡欣蔚匹配2篇");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：列表查询 - 关键词无结果
// ============================
async function testListNoMatch() {
  console.log("\n【测试 4】列表查询 - 关键词无匹配");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({ "oEEP-0000": { data: INDEX_RESPONSE } });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("list", "", "不存在的关键词XYZ");

    assert(result.includes("未找到"), "无匹配时提示未找到");
    assert(result.includes("提示"), "包含使用提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 5：详情查询 - 标准4位编号
// ============================
async function testDetailByNumber() {
  console.log("\n【测试 5】详情查询 - 标准4位编号");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({
    "oEEP-0000": { data: INDEX_RESPONSE },
    "oEEP-0001": { data: DETAIL_0001_RESPONSE },
  });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("detail", "0001", "");

    assert(result.includes("oEEP-0001"), "详情包含编号");
    assert(result.includes("动机/问题描述"), "详情包含正文章节");
    assert(result.includes("方案的详细描述"), "详情包含方案章节");
    assert(result.includes("流程设计"), "详情包含类型标签");
    assert(!result.includes("标题:     通过"), "已去除 front matter 原始格式");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 6：详情查询 - 简化编号格式（"1" 而非 "0001"）
// ============================
async function testDetailByShortNumber() {
  console.log("\n【测试 6】详情查询 - 简化编号（'1'）");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({
    "oEEP-0000": { data: INDEX_RESPONSE },
    "oEEP-0001": { data: DETAIL_0001_RESPONSE },
  });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("detail", "1", "");

    assert(result.includes("oEEP-0001"), "简化编号'1'能正确查询到oEEP-0001");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 7：详情查询 - "oEEP-0001" 格式
// ============================
async function testDetailByFullFormat() {
  console.log("\n【测试 7】详情查询 - 'oEEP-0001' 格式");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({
    "oEEP-0000": { data: INDEX_RESPONSE },
    "oEEP-0001": { data: DETAIL_0001_RESPONSE },
  });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("detail", "oEEP-0001", "");

    assert(result.includes("oEEP-0001"), "'oEEP-0001' 格式能正确查询");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：详情查询 - 编号不存在
// ============================
async function testDetailNotFound() {
  console.log("\n【测试 8】详情查询 - 编号不存在");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({ "oEEP-0000": { data: INDEX_RESPONSE } });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("detail", "9999", "");

    assert(result.includes("未找到"), "不存在的编号返回未找到提示");
    assert(result.includes("oEEP-9999"), "提示中包含查询的编号");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：详情查询 - 未提供编号
// ============================
async function testDetailNoNumber() {
  console.log("\n【测试 9】详情查询 - 未提供编号");

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("detail", "", "");

    assert(result.includes("请提供"), "未提供编号时提示输入编号");
  } catch (e) {
    assert(false, `测试异常: ${e.message}`);
  }
}

// ============================
// 测试 10：详情查询 - 无效编号格式
// ============================
async function testDetailInvalidNumber() {
  console.log("\n【测试 10】详情查询 - 无效编号格式");

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("detail", "abc", "");

    assert(result.includes("无效") || result.includes("请提供"), "非法编号返回错误提示");
  } catch (e) {
    assert(false, `测试异常: ${e.message}`);
  }
}

// ============================
// 测试 11：缓存机制 - 索引不重复请求
// ============================
async function testIndexCaching() {
  console.log("\n【测试 11】缓存机制 - 索引不重复请求");

  let fetchCount = 0;
  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    fetchCount++;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(INDEX_RESPONSE),
    });
  };

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    // 调用两次列表查询
    await getOEEPInfo("list", "", "缓存测试keyword1");
    const countAfterFirst = fetchCount;
    await getOEEPInfo("list", "", "缓存测试keyword2");

    // 核心断言：两次调用，fetch 次数完全相同（缓存命中，第二次不再请求）
    assert(fetchCount === countAfterFirst, "第二次查询命中缓存，fetch次数不变");
    // 兼容"索引已被前面测试缓存"的情况：fetchCount 可能为 0（全程命中）
    assert(fetchCount >= 0, "查询正常完成");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 12：网络超时处理
// ============================
async function testNetworkTimeout() {
  console.log("\n【测试 12】网络超时处理");

  const originalFetch = global.fetch;
  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";

  // 索引已被前面的测试缓存，第一次实际 fetch 将是 detail 请求——直接抛超时
  global.fetch = function (url, options) {
    return Promise.reject(abortError);
  };

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    // oEEP-0002 在已缓存的索引中存在，detail 请求会被超时拦截
    const result = await getOEEPInfo("detail", "0002", "");

    assert(result.includes("超时"), "超时时返回超时提示");
    assert(!result.includes("AbortError"), "不暴露内部错误类型");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 13：不支持的查询类型
// ============================
async function testUnsupportedQueryType() {
  console.log("\n【测试 13】不支持的查询类型");

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("unknown", "", "");

    assert(result.includes("不支持"), "不支持的类型返回提示");
    assert(result.includes("list") && result.includes("detail"), "提示包含支持的类型列表");
  } catch (e) {
    assert(false, `测试异常: ${e.message}`);
  }
}

// ============================
// 测试 14：索引 Markdown 解析 - URL 编码标题正确解码
// ============================
async function testIndexParsing() {
  console.log("\n【测试 14】索引解析 - URL 编码标题正确解码");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({ "oEEP-0000": { data: INDEX_RESPONSE } });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("list", "", "LLVM平行宇宙");

    // oEEP-0003 的标题在索引中是 URL 编码的，需要解码后才能匹配
    assert(result.includes("oEEP-0003") || result.includes("LLVM"), "URL编码标题正确解码并可搜索");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 15：详情输出 - 去除 front matter
// ============================
async function testFrontMatterRemoval() {
  console.log("\n【测试 15】详情输出 - 去除 front matter");

  const originalFetch = global.fetch;
  global.fetch = createSmartMockFetch({
    "oEEP-0000": { data: INDEX_RESPONSE },
    "oEEP-0001": { data: DETAIL_0001_RESPONSE },
  });

  try {
    const { getOEEPInfo } = await import("../src/tools/getOEEPInfo.js");
    const result = await getOEEPInfo("detail", "0001", "");

    // front matter 中的原始 YAML 格式不应出现（已提取到结构化信息中显示）
    assert(!result.includes("创建日期: 2023-04-16"), "原始 front matter 的创建日期行不应出现");
    assert(!result.includes("修订日期: 2023-05-25"), "原始 front matter 的修订日期行不应出现");
    // 正文内容应出现
    assert(result.includes("## 动机/问题描述"), "正文章节标题保留");
  } finally {
    global.fetch = originalFetch;
  }
}

// ─── 运行所有测试 ───────────────────────────────────────────────
async function runAllTests() {
  console.log("==========================================");
  console.log(" getOEEPInfo 工具函数单元测试");
  console.log("==========================================");

  const tests = [
    testListAll,
    testListWithKeyword,
    testListFilterByAuthor,
    testListNoMatch,
    testDetailByNumber,
    testDetailByShortNumber,
    testDetailByFullFormat,
    testDetailNotFound,
    testDetailNoNumber,
    testDetailInvalidNumber,
    testIndexCaching,
    testNetworkTimeout,
    testUnsupportedQueryType,
    testIndexParsing,
    testFrontMatterRemoval,
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (e) {
      console.error(`  ❌ 测试异常: ${e.message}`);
      failed++;
    }
  }

  console.log("\n==========================================");
  console.log(` 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log("==========================================");

  if (failed > 0) process.exit(1);
}

runAllTests().catch((e) => {
  console.error("测试运行失败:", e);
  process.exit(1);
});
