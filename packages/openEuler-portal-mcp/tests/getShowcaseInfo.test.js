/**
 * @created 2026-03-02 by sig-OpenDesign with Claude AI
 * @description getShowcaseInfo 工具函数单元测试
 */

// 测试辅助工具：模拟 fetch
function createMockFetch(responses) {
  let callCount = 0;
  return function mockFetch(url, options) {
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    if (response.error) {
      return Promise.reject(response.error);
    }
    const bodyText = JSON.stringify(response.data);
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      text: () => Promise.resolve(bodyText),
      json: () => Promise.resolve(response.data),
    });
  };
}

// 测试统计
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

// 构造模拟案例数据
function makeMockItem(overrides = {}) {
  return {
    title: "工商银行核心系统迁移案例",
    company: "中国工商银行",
    industry: "金融",
    summary: "工商银行将核心业务系统迁移至 openEuler，实现了稳定高效的运行。",
    path: "/showcase/icbc-migration",
    ...overrides,
  };
}

// ============================
// 测试 1：正常查询 - 有关键词和行业
// ============================
async function testQueryWithKeywordAndIndustry() {
  console.log("\n【测试 1】正常查询 - 关键词+行业筛选");

  const mockItems = [
    makeMockItem(),
    makeMockItem({ title: "工行信贷系统案例", company: "中国工商银行", summary: "信贷管理平台迁移" }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: mockItems }]);

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    const result = await getShowcaseInfo("工商银行", "zh", "金融");

    assert(result.includes("工商银行"), "结果包含关键词");
    assert(result.includes("金融"), "结果包含行业");
    assert(result.includes("2 个用户案例") || result.includes("共找到 2"), "结果显示案例总数");
    assert(result.includes("中国工商银行"), "结果包含公司名称");
    assert(result.includes("openeuler.openatom.cn") || result.includes("/showcase/"), "结果包含案例链接");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：正常查询 - 空关键词返回所有
// ============================
async function testQueryWithNoKeyword() {
  console.log("\n【测试 2】正常查询 - 无关键词（返回所有）");

  const mockItems = Array.from({ length: 25 }, (_, i) =>
    makeMockItem({ title: `案例 ${i + 1}`, company: `企业 ${i + 1}` })
  );

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: mockItems }]);

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    const result = await getShowcaseInfo("", "zh", "");

    assert(result.includes("共找到 25"), "结果显示全部案例数量");
    assert(result.includes("显示前 20"), "超过20条时只显示前20条");
    assert(result.includes("仅显示前 20 条"), "有超出提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：查询结果为空
// ============================
async function testQueryWithNoResults() {
  console.log("\n【测试 3】查询结果为空");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: [] }]);

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    const result = await getShowcaseInfo("不存在的公司XYZ", "zh", "金融");

    assert(result.includes("未找到"), "结果说明无案例");
    assert(result.includes("提示"), "结果包含建议提示");
    assert(result.includes("可用行业"), "提示包含可用行业列表");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：英文查询
// ============================
async function testQueryInEnglish() {
  console.log("\n【测试 4】英文查询（lang=en）");

  const mockItems = [
    makeMockItem({ title: "ICBC Core System Migration", company: "ICBC", industry: "Finance" }),
  ];

  const originalFetch = global.fetch;
  // 验证请求体包含 lang=en
  let capturedBody = null;
  global.fetch = function (url, options) {
    capturedBody = JSON.parse(options.body);
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockItems)),
      json: () => Promise.resolve(mockItems),
    });
  };

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    const result = await getShowcaseInfo("ICBC", "en", "");

    assert(capturedBody !== null, "发送了 fetch 请求");
    assert(capturedBody.lang === "en", "请求体包含 lang=en");
    assert(capturedBody.keyword === "ICBC", "请求体包含正确关键词");
    assert(capturedBody.category === "showcase", "请求体包含固定 category");
    assert(capturedBody.page === 1, "请求体 page 固定为 1");
    assert(capturedBody.pageSize === 100, "请求体 pageSize 固定为 100");
    assert(result.includes("ICBC"), "结果包含案例数据");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 5：行业参数大小写兼容
// ============================
async function testIndustryValidation() {
  console.log("\n【测试 5】行业参数验证");

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");

    // 无效行业
    const result1 = await getShowcaseInfo("", "zh", "农业");
    assert(result1.includes("不支持"), "不支持的行业返回错误提示");
    assert(result1.includes("金融"), "错误提示包含可用行业列表");

    // 另一个无效行业
    const result2 = await getShowcaseInfo("", "zh", "互联网");
    assert(result2.includes("不支持"), "不支持互联网行业");
  } catch (e) {
    assert(false, `行业验证测试失败: ${e.message}`);
  }
}

// ============================
// 测试 6：API 响应格式兼容 - data 字段包装
// ============================
async function testResponseFormatDataWrapper() {
  console.log("\n【测试 6】API 响应格式兼容 - data 字段包装");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: {
      data: [makeMockItem({ title: "data字段包装案例" })],
    },
  }]);

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    // 使用唯一 keyword 避免命中前面测试的缓存
    const uniqueKw = `fmt_data_${Date.now()}`;
    const result = await getShowcaseInfo(uniqueKw, "zh", "");

    assert(result.includes("data字段包装案例"), "支持 { data: [...] } 格式响应");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 7：API 响应格式兼容 - records 字段
// ============================
async function testResponseFormatRecords() {
  console.log("\n【测试 7】API 响应格式兼容 - records 字段");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: {
      data: {
        records: [makeMockItem({ title: "records字段案例" })],
      },
    },
  }]);

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    const uniqueKw = `fmt_records_${Date.now()}`;
    const result = await getShowcaseInfo(uniqueKw, "zh", "");

    assert(
      result.includes("records字段案例") || result.includes("1 个用户案例"),
      "支持 { data: { records: [...] } } 格式响应"
    );
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：网络超时处理
// ============================
async function testNetworkTimeout() {
  console.log("\n【测试 8】网络超时处理");

  const originalFetch = global.fetch;
  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";
  global.fetch = createMockFetch([{ error: abortError }]);

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    const result = await getShowcaseInfo("测试", "zh", "");

    assert(result.includes("超时"), "超时时返回超时提示");
    assert(!result.includes("AbortError"), "不暴露内部错误名称");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：API 返回错误状态码
// ============================
async function testApiErrorResponse() {
  console.log("\n【测试 9】API 返回错误状态码");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ ok: false, status: 500, data: {} }]);

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    // 使用唯一 keyword 避免命中缓存
    const uniqueKw = `api_error_${Date.now()}`;
    const result = await getShowcaseInfo(uniqueKw, "zh", "");

    assert(result.includes("错误"), "API 错误时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：摘要超长截断
// ============================
async function testSummaryTruncation() {
  console.log("\n【测试 10】摘要超长自动截断");

  const longSummary = "这是一段用于测试截断功能的示例摘要文字，超过一百二十个字符才能触发截断逻辑。".repeat(4) + "不应该出现在最终输出结果中。";
  const mockItems = [makeMockItem({ summary: longSummary })];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: mockItems }]);

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    // 使用唯一 keyword 避免命中缓存
    const uniqueKw = `truncation_${Date.now()}`;
    const result = await getShowcaseInfo(uniqueKw, "zh", "");

    assert(result.includes("..."), "超长摘要包含省略号");
    assert(!result.includes("不应该出现在最终输出结果中"), "截断后多余内容不显示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 11：缓存机制验证
// ============================
async function testCacheMechanism() {
  console.log("\n【测试 11】缓存机制验证");

  let fetchCallCount = 0;
  const mockItems = [makeMockItem({ title: "缓存测试案例" })];

  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    fetchCallCount++;
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockItems)),
      json: () => Promise.resolve(mockItems),
    });
  };

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    // 使用一个不太可能被之前测试缓存的 key
    const uniqueKeyword = `cache_test_${Date.now()}`;
    await getShowcaseInfo(uniqueKeyword, "zh", "");
    const countAfterFirst = fetchCallCount;
    await getShowcaseInfo(uniqueKeyword, "zh", "");

    assert(countAfterFirst === 1, "第一次查询发起 1 次 fetch");
    assert(fetchCallCount === 1, "第二次查询使用缓存，不再发起 fetch");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 12：请求体固定参数验证
// ============================
async function testFixedRequestParams() {
  console.log("\n【测试 12】请求体固定参数验证");

  let capturedBody = null;
  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    capturedBody = JSON.parse(options.body);
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve("[]"),
      json: () => Promise.resolve([]),
    });
  };

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    await getShowcaseInfo("测试关键词", "zh", "金融");

    assert(capturedBody.page === 1, "page 固定为 1");
    assert(capturedBody.pageSize === 100, "pageSize 固定为 100");
    assert(capturedBody.category === "showcase", "category 固定为 showcase");
    assert(capturedBody.keyword === "测试关键词", "keyword 正确传递");
    assert(capturedBody.industry === "金融", "industry 正确传递");
    assert(capturedBody.lang === "zh", "lang 正确传递");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 13：无 industry 时请求体不包含该字段
// ============================
async function testNoIndustryInRequest() {
  console.log("\n【测试 13】无行业筛选时请求体不含 industry 字段");

  let capturedBody = null;
  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    capturedBody = JSON.parse(options.body);
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve("[]"),
      json: () => Promise.resolve([]),
    });
  };

  try {
    const { getShowcaseInfo } = await import("../src/tools/getShowcaseInfo.js");
    // 使用另一个唯一 keyword 避免缓存命中
    await getShowcaseInfo(`no_industry_${Date.now()}`, "zh", "");

    assert(!("industry" in capturedBody), "不传 industry 时请求体不含该字段");
  } finally {
    global.fetch = originalFetch;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log("==========================================");
  console.log(" getShowcaseInfo 工具函数单元测试");
  console.log("==========================================");

  const tests = [
    testQueryWithKeywordAndIndustry,
    testQueryWithNoKeyword,
    testQueryWithNoResults,
    testQueryInEnglish,
    testIndustryValidation,
    testResponseFormatDataWrapper,
    testResponseFormatRecords,
    testNetworkTimeout,
    testApiErrorResponse,
    testSummaryTruncation,
    testCacheMechanism,
    testFixedRequestParams,
    testNoIndustryInRequest,
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

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error("测试运行失败:", e);
  process.exit(1);
});
