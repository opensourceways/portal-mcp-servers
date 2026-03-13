/**
 * @created 2026-03-03 by sig-OpenDesign with Claude AI
 * @description getSecurityNoticeInfo 工具函数单元测试
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

// 构造模拟公告对象
function makeMockNotice(overrides = {}) {
  return {
    id: 1001,
    securityNoticeNo: "openEuler-SA-2026-1001",
    summary: "kernel security update",
    type: "High",
    affectedComponent: "kernel",
    affectedProduct: "openEuler-22.03-LTS-SP4",
    announcementTime: "2026-03-01",
    updateTime: "2026-03-01 00:00:00",
    cveId: "CVE-2026-1001;CVE-2026-1002;",
    description: "The Linux Kernel security update fixes multiple vulnerabilities.",
    referenceList: [
      { url: "https://nvd.nist.gov/vuln/detail/CVE-2026-1001" },
      { url: "https://nvd.nist.gov/vuln/detail/CVE-2026-1002" },
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
    makeMockNotice({ securityNoticeNo: "openEuler-SA-2026-1002", summary: "kernel security update #2" }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: makeMockListResponse(mockNotices, 2) }]);

  try {
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("list", "kernel");

    assert(result.includes("kernel"), "结果包含关键词");
    assert(result.includes("openEuler-SA-2026-1001"), "结果包含第一条公告编号");
    assert(result.includes("openEuler-SA-2026-1002"), "结果包含第二条公告编号");
    assert(result.includes("高危 (High)"), "结果包含危险等级");
    assert(result.includes("CVE-2026-1001"), "结果包含 CVE 编号");
    assert(result.includes("2026-03-01"), "结果包含发布时间");
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
    makeMockNotice({ securityNoticeNo: `openEuler-SA-2026-${2000 + i}`, affectedComponent: `pkg-${i}` })
  );

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: makeMockListResponse(mockNotices, 300) }]);

  try {
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("list", "");

    assert(result.includes("300 条安全公告") || result.includes("共找到 300"), "结果显示总数");
    assert(result.includes("显示最新 20"), "超过20条时只显示前20条");
    assert(result.includes("仅显示最新 20 条") || result.includes("共 300 条"), "有超出提示");
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
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("list", "不存在的组件XYZ");

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
    description: "A heap-based buffer overflow vulnerability in the Linux kernel.",
  });

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: { code: 0, msg: "", result: mockNotice },
  }]);

  try {
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("detail", "", "openEuler-SA-2026-1001");

    assert(result.includes("openEuler-SA-2026-1001"), "结果包含公告编号");
    assert(result.includes("kernel security update"), "结果包含摘要");
    assert(result.includes("高危 (High)"), "结果包含危险等级");
    assert(result.includes("CVE-2026-1001"), "结果包含关联 CVE");
    assert(result.includes("CVE-2026-1002"), "结果包含全部关联 CVE");
    assert(result.includes("A heap-based buffer overflow"), "结果包含详细描述");
    assert(result.includes("nvd.nist.gov"), "结果包含参考链接");
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
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("detail", "", "");

    assert(result.includes("请提供"), "未提供编号时给出提示");
    assert(result.includes("openEuler-SA"), "提示中包含格式示例");
  } catch (e) {
    assert(false, `测试失败: ${e.message}`);
  }
}

// ============================
// 测试 6：详情查询 - API 返回不存在
// ============================
async function testDetailQueryNotFound() {
  console.log("\n【测试 6】详情查询 - 公告不存在");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: { code: 1, msg: "未找到公告", result: null },
  }]);

  try {
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("detail", "", "openEuler-SA-9999-9999");

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
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("list", "timeout_test");

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
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("list", `api_err_${Date.now()}`);

    assert(result.includes("错误") || result.includes("失败"), "API 错误时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：CVE 数量超过3个的省略显示
// ============================
async function testCveListTruncation() {
  console.log("\n【测试 9】CVE 数量超过3个的省略显示");

  const mockNotices = [
    makeMockNotice({
      cveId: "CVE-2026-0001;CVE-2026-0002;CVE-2026-0003;CVE-2026-0004;CVE-2026-0005;",
    }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: makeMockListResponse(mockNotices, 1) }]);

  try {
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("list", `cve_trunc_${Date.now()}`);

    assert(result.includes("CVE-2026-0001"), "结果包含前几个 CVE");
    assert(result.includes("5 个") || result.includes("等共 5"), "超出数量时显示总计数");
    assert(!result.includes("CVE-2026-0004") || result.includes("5 个"), "第4个以后的 CVE 不展开显示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：详情描述超长截断
// ============================
async function testDescriptionTruncation() {
  console.log("\n【测试 10】详情描述超长截断");

  const longDesc = "A".repeat(600) + "不应该出现";
  const mockNotice = makeMockNotice({ description: longDesc });

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: { code: 0, msg: "", result: mockNotice },
  }]);

  try {
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const result = await getSecurityNoticeInfo("detail", "", "openEuler-SA-2026-trunc");

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
  global.fetch = function (url, options) {
    fetchCallCount++;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeMockListResponse([mockNotice], 1)),
    });
  };

  try {
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    const uniqueKeyword = `cache_list_${Date.now()}`;
    await getSecurityNoticeInfo("list", uniqueKeyword);
    const countAfterFirst = fetchCallCount;
    await getSecurityNoticeInfo("list", uniqueKeyword);

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
  const mockNotice = makeMockNotice({ securityNoticeNo: "openEuler-SA-2026-cache-detail" });

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
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    await getSecurityNoticeInfo("detail", "", "openEuler-SA-2026-cache-detail");
    const countAfterFirst = fetchCallCount;
    await getSecurityNoticeInfo("detail", "", "openEuler-SA-2026-cache-detail");

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
    const { getSecurityNoticeInfo } = await import("../src/tools/getSecurityNoticeInfo.js");
    await getSecurityNoticeInfo("list", `req_params_${Date.now()}`);

    assert(capturedUrl.includes("securitynotice/findAll"), "列表查询使用正确的 URL");
    assert(capturedBody !== null, "发起了 POST 请求体");
    assert(capturedBody.pages && capturedBody.pages.page === 1, "page 固定为 1");
    assert(capturedBody.pages && capturedBody.pages.size === 100, "size 固定为 100");
    assert(capturedBody.noticeType === "cve", "noticeType 固定为 cve");
  } finally {
    global.fetch = originalFetch;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log("==========================================");
  console.log(" getSecurityNoticeInfo 工具函数单元测试");
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
    testCveListTruncation,
    testDescriptionTruncation,
    testListCacheMechanism,
    testDetailCacheMechanism,
    testRequestParams,
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
