/**
 * @created 2026-03-03 by sig-OpenDesign with Claude AI
 * @description getBugNoticeInfo 工具函数单元测试
 */

// 测试辅助：模拟 fetch
function createMockFetch(responses) {
  let callCount = 0;
  return function mockFetch(url, options) {
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    if (response.error) {
      return Promise.reject(response.error);
    }
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
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

// 构造模拟列表响应
function makeMockListResponse(notices, total) {
  return {
    code: 0,
    msg: "",
    result: {
      totalCount: total || notices.length,
      securityNoticeList: notices,
    },
  };
}

// 构造模拟缺陷公告对象
function makeMockNotice(overrides = {}) {
  return {
    id: 2001,
    securityNoticeNo: "openEuler-BA-2025-2001",
    summary: "kernel bug update",
    type: "Moderate",
    affectedComponent: "kernel",
    affectedProduct: "openEuler-22.03-LTS-SP4",
    announcementTime: "2025-12-01",
    updateTime: "2025-12-01 00:00:00",
    cveId: "BUG-2025-100;BUG-2025-101;",
    description: "This is a kernel bug fix for memory management issues.",
    referenceList: [
      { url: "https://bugzilla.openeuler.org/show_bug.cgi?id=100" },
    ],
    packageList: [],
    ...overrides,
  };
}

// ============================
// 测试 1：列表查询 - 有关键词
// ============================
async function testListQueryWithKeyword() {
  console.log("\n【测试 1】列表查询 - 有关键词");

  const mockNotices = [
    makeMockNotice(),
    makeMockNotice({ securityNoticeNo: "openEuler-BA-2025-2002", summary: "kernel bug update #2" }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: makeMockListResponse(mockNotices, 2) }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("list", "kernel");

    assert(result.includes("kernel"), "结果包含关键词");
    assert(result.includes("openEuler-BA-2025-2001"), "结果包含第一条公告编号");
    assert(result.includes("openEuler-BA-2025-2002"), "结果包含第二条公告编号");
    assert(result.includes("中等 (Moderate)"), "结果包含严重等级");
    assert(result.includes("BUG-2025-100"), "结果包含缺陷 ID");
    assert(result.includes("2025-12-01"), "结果包含发布时间");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：列表查询 - 无关键词（返回全部）
// ============================
async function testListQueryWithoutKeyword() {
  console.log("\n【测试 2】列表查询 - 无关键词");

  const mockNotices = Array.from({ length: 25 }, (_, i) =>
    makeMockNotice({ securityNoticeNo: `openEuler-BA-2025-${3000 + i}`, affectedComponent: `pkg-${i}` })
  );

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: makeMockListResponse(mockNotices, 201) }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("list", "");

    assert(result.includes("201 条缺陷公告") || result.includes("共找到 201"), "结果显示总数");
    assert(result.includes("显示最新 20"), "超过20条时只显示前20条");
    assert(result.includes("仅显示最新 20 条") || result.includes("共 201 条"), "有超出提示");
    assert(result.includes("全部"), "无关键词时说明查询条件为全部");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：列表查询 - 无结果
// ============================
async function testListQueryNoResults() {
  console.log("\n【测试 3】列表查询 - 无结果");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: { code: 0, msg: "", result: { totalCount: 0, securityNoticeList: [] } },
  }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("list", "不存在的组件XYZ");

    assert(result.includes("未找到"), "结果说明无公告");
    assert(result.includes("提示") || result.includes("💡"), "结果包含提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：详情查询 - 正常
// ============================
async function testDetailQuery() {
  console.log("\n【测试 4】详情查询 - 正常");

  const mockNotice = makeMockNotice({
    description: "A memory management bug in the Linux kernel causes unexpected behavior.",
  });

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: { code: 0, msg: "", result: mockNotice },
  }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("detail", "", "openEuler-BA-2025-2001");

    assert(result.includes("openEuler-BA-2025-2001"), "结果包含公告编号");
    assert(result.includes("kernel bug update"), "结果包含摘要");
    assert(result.includes("中等 (Moderate)"), "结果包含严重等级");
    assert(result.includes("BUG-2025-100"), "结果包含关联缺陷 ID");
    assert(result.includes("BUG-2025-101"), "结果包含全部关联缺陷 ID");
    assert(result.includes("A memory management bug"), "结果包含详细描述");
    assert(result.includes("bugzilla.openeuler.org"), "结果包含参考链接");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 5：详情查询 - 未提供公告编号
// ============================
async function testDetailQueryMissingId() {
  console.log("\n【测试 5】详情查询 - 未提供公告编号");

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("detail", "", "");

    assert(result.includes("请提供"), "未提供编号时给出提示");
    assert(result.includes("openEuler-BA"), "提示中包含格式示例");
  } catch (e) {
    assert(false, `测试失败: ${e.message}`);
  }
}

// ============================
// 测试 6：详情查询 - 公告不存在
// ============================
async function testDetailQueryNotFound() {
  console.log("\n【测试 6】详情查询 - 公告不存在");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: { code: 1, msg: "未找到公告", result: null },
  }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("detail", "", "openEuler-BA-9999-9999");

    assert(result.includes("错误") || result.includes("不存在") || result.includes("失败"), "公告不存在时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 7：网络超时处理
// ============================
async function testNetworkTimeout() {
  console.log("\n【测试 7】网络超时处理");

  const originalFetch = global.fetch;
  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";
  global.fetch = createMockFetch([{ error: abortError }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("list", "timeout_test");

    assert(result.includes("超时"), "超时时返回超时提示");
    assert(!result.includes("AbortError"), "不暴露内部错误名称");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：API 返回错误状态码
// ============================
async function testApiErrorResponse() {
  console.log("\n【测试 8】API 返回错误状态码");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ ok: false, status: 500, data: {} }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("list", `api_err_${Date.now()}`);

    assert(result.includes("错误") || result.includes("失败"), "API 错误时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：缺陷 ID 数量超过3个的省略显示
// ============================
async function testBugIdListTruncation() {
  console.log("\n【测试 9】缺陷 ID 超过3个时省略显示");

  const mockNotices = [
    makeMockNotice({
      cveId: "BUG-2025-001;BUG-2025-002;BUG-2025-003;BUG-2025-004;BUG-2025-005;",
    }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: makeMockListResponse(mockNotices, 1) }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("list", `trunc_${Date.now()}`);

    assert(result.includes("BUG-2025-001"), "结果包含前几个缺陷 ID");
    assert(result.includes("5 个") || result.includes("等共 5"), "超出数量时显示总计数");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：详情描述超长截断
// ============================
async function testDescriptionTruncation() {
  console.log("\n【测试 10】详情描述超长截断");

  const longDesc = "B".repeat(600) + "不应该出现";
  const mockNotice = makeMockNotice({ description: longDesc });

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: { code: 0, msg: "", result: mockNotice },
  }]);

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const result = await getBugNoticeInfo("detail", "", "openEuler-BA-2025-trunc");

    assert(result.includes("..."), "超长描述包含省略号");
    assert(!result.includes("不应该出现"), "超出部分不显示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 11：缓存机制验证 - 列表
// ============================
async function testListCacheMechanism() {
  console.log("\n【测试 11】缓存机制验证 - 列表查询");

  let fetchCallCount = 0;
  const mockNotice = makeMockNotice();

  const originalFetch = global.fetch;
  global.fetch = function () {
    fetchCallCount++;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeMockListResponse([mockNotice], 1)),
    });
  };

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    const uniqueKeyword = `cache_list_${Date.now()}`;
    await getBugNoticeInfo("list", uniqueKeyword);
    const countAfterFirst = fetchCallCount;
    await getBugNoticeInfo("list", uniqueKeyword);

    assert(countAfterFirst === 1, "第一次查询发起 1 次 fetch");
    assert(fetchCallCount === 1, "第二次查询使用缓存，不再发起 fetch");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 12：缓存机制验证 - 详情
// ============================
async function testDetailCacheMechanism() {
  console.log("\n【测试 12】缓存机制验证 - 详情查询");

  let fetchCallCount = 0;
  const mockNotice = makeMockNotice({ securityNoticeNo: "openEuler-BA-2025-cache-detail" });

  const originalFetch = global.fetch;
  global.fetch = function () {
    fetchCallCount++;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 0, msg: "", result: mockNotice }),
    });
  };

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    await getBugNoticeInfo("detail", "", "openEuler-BA-2025-cache-detail");
    const countAfterFirst = fetchCallCount;
    await getBugNoticeInfo("detail", "", "openEuler-BA-2025-cache-detail");

    assert(countAfterFirst === 1, "第一次详情查询发起 1 次 fetch");
    assert(fetchCallCount === 1, "第二次详情查询使用缓存，不再发起 fetch");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 13：请求体参数验证
// ============================
async function testRequestParams() {
  console.log("\n【测试 13】请求体参数验证");

  let capturedUrl = null;
  let capturedBody = null;

  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    capturedUrl = url;
    capturedBody = options && options.body ? JSON.parse(options.body) : null;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeMockListResponse([], 0)),
    });
  };

  try {
    const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
    await getBugNoticeInfo("list", `req_params_${Date.now()}`);

    assert(capturedUrl.includes("securitynotice/findAll"), "列表查询使用正确的 URL");
    assert(capturedBody !== null, "发起了 POST 请求体");
    assert(capturedBody.pages && capturedBody.pages.page === 1, "page 固定为 1");
    assert(capturedBody.pages && capturedBody.pages.size === 100, "size 固定为 100");
    assert(capturedBody.noticeType === "bug", "noticeType 固定为 bug");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 14：High/Low 等级标签
// ============================
async function testSeverityLabels() {
  console.log("\n【测试 14】严重等级标签");

  const testCases = [
    { type: "High", expected: "高 (High)" },
    { type: "Moderate", expected: "中等 (Moderate)" },
    { type: "Low", expected: "低 (Low)" },
  ];

  for (const tc of testCases) {
    const mockNotices = [makeMockNotice({ type: tc.type, cveId: "BUG-2025-999;" })];
    const originalFetch = global.fetch;
    global.fetch = createMockFetch([{ data: makeMockListResponse(mockNotices, 1) }]);

    try {
      const { getBugNoticeInfo } = await import("../src/tools/getBugNoticeInfo.js");
      const result = await getBugNoticeInfo("list", `severity_${tc.type}_${Date.now()}`);
      assert(result.includes(tc.expected), `类型 ${tc.type} 显示为 "${tc.expected}"`);
    } finally {
      global.fetch = originalFetch;
    }
  }
}

// 运行所有测试
async function runAllTests() {
  console.log("==========================================");
  console.log(" getBugNoticeInfo 工具函数单元测试");
  console.log("==========================================");

  const tests = [
    testListQueryWithKeyword,
    testListQueryWithoutKeyword,
    testListQueryNoResults,
    testDetailQuery,
    testDetailQueryMissingId,
    testDetailQueryNotFound,
    testNetworkTimeout,
    testApiErrorResponse,
    testBugIdListTruncation,
    testDescriptionTruncation,
    testListCacheMechanism,
    testDetailCacheMechanism,
    testRequestParams,
    testSeverityLabels,
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
