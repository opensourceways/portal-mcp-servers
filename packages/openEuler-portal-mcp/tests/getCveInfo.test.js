/**
 * @created 2026-03-03 by sig-OpenDesign with Claude AI
 * @description getCveInfo 工具函数单元测试
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
function makeMockListResponse(cves, total) {
  return {
    code: 0,
    msg: "",
    result: {
      totalCount: total || cves.length,
      cveDatabaseList: cves,
    },
  };
}

// 构造模拟 CVE 对象（列表用）
function makeMockCve(overrides = {}) {
  return {
    cveId: "CVE-2026-1001",
    packageName: "kernel",
    summary: "A buffer overflow vulnerability in the kernel.",
    cvsssCoreOE: "7.8",
    cvsssCoreNVD: "7.5",
    status: "已修复",
    announcementTime: "2026-01-01",
    updateTime: "2026-01-02 00:00:00",
    affectedProduct: "openEuler-22.03-LTS-SP4",
    securityNoticeNo: "openEuler-SA-2026-1001",
    ...overrides,
  };
}

// 构造模拟 CVE 详情对象
function makeMockCveDetail(overrides = {}) {
  return {
    cveId: "CVE-2026-23865",
    packageName: "freetype",
    status: "已修复",
    type: "Buffer Overflow",
    summary: "A heap-based buffer overflow in FreeType before 2.13.2 allows remote attackers to cause a denial of service.",
    cvsssCoreOE: "8.1",
    cvsssCoreNVD: "8.8",
    v4_scoreoe: "N/A",
    v4_scorenvd: "N/A",
    attackVectorOE: "Network",
    attackComplexityOE: "Low",
    privilegesRequiredOE: "None",
    userInteractionOE: "Required",
    scopeOE: "Unchanged",
    confidentialityOE: "High",
    integrityOE: "High",
    availabilityOE: "High",
    securityNoticeNo: "openEuler-SA-2026-1486",
    announcementTime: "2026-02-01",
    updateTime: "2026-02-01 00:00:00",
    ...overrides,
  };
}

// 构造模拟受影响产品列表
function makeMockProducts(overrides = []) {
  const defaults = [
    { productName: "openEuler-22.03-LTS-SP4", status: "已修复", securityNoticeNo: "openEuler-SA-2026-1486", releaseTime: "2026-02-01" },
    { productName: "openEuler-24.03-LTS", status: "已修复", securityNoticeNo: "openEuler-SA-2026-1486", releaseTime: "2026-02-01" },
  ];
  return overrides.length ? overrides : defaults;
}

// ============================
// 测试 1：列表查询 - 有关键词
// ============================
async function testListQueryWithKeyword() {
  console.log("\n【测试 1】列表查询 - 有关键词");

  const mockCves = [
    makeMockCve(),
    makeMockCve({ cveId: "CVE-2026-1002", summary: "Another kernel vulnerability." }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: makeMockListResponse(mockCves, 2) }]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("list", "kernel");

    assert(result.includes("kernel"), "结果包含关键词");
    assert(result.includes("CVE-2026-1001"), "结果包含第一条 CVE ID");
    assert(result.includes("CVE-2026-1002"), "结果包含第二条 CVE ID");
    assert(result.includes("7.8"), "结果包含 CVSS 评分");
    assert(result.includes("openEuler-SA-2026-1001"), "结果包含安全公告编号");
    assert(result.includes("2026-01-01"), "结果包含发布时间");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：列表查询 - 无结果
// ============================
async function testListQueryNoResults() {
  console.log("\n【测试 2】列表查询 - 无结果");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{
    data: { code: 0, msg: "", result: { totalCount: 0, cveDatabaseList: [] } },
  }]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("list", "不存在的组件XYZ");

    assert(result.includes("未找到"), "无结果时说明未找到");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：列表查询 - 分页提示
// ============================
async function testListQueryPagination() {
  console.log("\n【测试 3】列表查询 - 分页提示");

  const mockCves = Array.from({ length: 20 }, (_, i) =>
    makeMockCve({ cveId: `CVE-2026-${2000 + i}` })
  );

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: makeMockListResponse(mockCves, 100) }]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("list", "kernel", 1, 20);

    assert(result.includes("100 条"), "结果显示总数 100");
    assert(result.includes("共 5 页") || result.includes("5 页"), "结果提示共 5 页");
    assert(result.includes("query_type") && result.includes("detail"), "结果提示可查询详情");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：详情查询 - 正常
// ============================
async function testDetailQuery() {
  console.log("\n【测试 4】详情查询 - 正常");

  const mockDetail = makeMockCveDetail();
  const mockProducts = makeMockProducts();

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: { code: 0, msg: "", result: mockDetail } },  // detail endpoint
    { data: { code: 0, msg: "", result: mockProducts } }, // product endpoint
  ]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("detail", "", 1, 20, "CVE-2026-23865", "freetype");

    assert(result.includes("CVE-2026-23865"), "结果包含 CVE ID");
    assert(result.includes("freetype"), "结果包含软件包名");
    assert(result.includes("已修复"), "结果包含状态");
    assert(result.includes("8.1"), "结果包含 OE CVSS 评分");
    assert(result.includes("8.8"), "结果包含 NVD CVSS 评分");
    assert(result.includes("Network"), "结果包含攻击向量");
    assert(result.includes("heap-based buffer overflow"), "结果包含漏洞摘要");
    assert(result.includes("openEuler-22.03-LTS-SP4"), "结果包含受影响产品");
    assert(result.includes("openEuler-SA-2026-1486"), "结果包含关联安全公告");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 5：详情查询 - 未提供 cve_id
// ============================
async function testDetailMissingCveId() {
  console.log("\n【测试 5】详情查询 - 未提供 cve_id");

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("detail", "", 1, 20, "", "freetype");

    assert(result.includes("请提供"), "未提供 cve_id 时给出提示");
    assert(result.includes("cve_id") || result.includes("CVE 编号"), "提示中提到 cve_id");
  } catch (e) {
    assert(false, `测试失败: ${e.message}`);
  }
}

// ============================
// 测试 6：详情查询 - 未提供 package_name
// ============================
async function testDetailMissingPackageName() {
  console.log("\n【测试 6】详情查询 - 未提供 package_name");

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("detail", "", 1, 20, "CVE-2026-23865", "");

    assert(result.includes("请提供"), "未提供 package_name 时给出提示");
    assert(result.includes("package_name") || result.includes("软件包"), "提示中提到 package_name");
  } catch (e) {
    assert(false, `测试失败: ${e.message}`);
  }
}

// ============================
// 测试 7：详情查询 - CVE 不存在
// ============================
async function testDetailNotFound() {
  console.log("\n【测试 7】详情查询 - CVE 不存在");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: { code: 1, msg: "未找到", result: null } },
    { data: { code: 0, msg: "", result: [] } },
  ]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("detail", "", 1, 20, "CVE-9999-9999", "unknown-pkg");

    assert(result.includes("错误") || result.includes("失败") || result.includes("不存在"), "CVE 不存在时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：网络超时处理
// ============================
async function testNetworkTimeout() {
  console.log("\n【测试 8】网络超时处理");

  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ error: abortError }]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("list", "timeout_test");

    assert(result.includes("超时"), "超时时返回超时提示");
    assert(!result.includes("AbortError"), "不暴露内部错误名称");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：API 返回错误状态码（列表）
// ============================
async function testApiErrorList() {
  console.log("\n【测试 9】API 返回错误状态码（列表）");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ ok: false, status: 500, data: {} }]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("list", `api_err_${Date.now()}`);

    assert(result.includes("错误状态码") || result.includes("500"), "API 错误时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：API 返回错误状态码（详情）
// ============================
async function testApiErrorDetail() {
  console.log("\n【测试 10】API 返回错误状态码（详情）");

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { ok: false, status: 500, data: {} },
    { ok: true, status: 200, data: { code: 0, result: [] } },
  ]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    // 使用唯一 cve_id，避免与测试 4 的缓存冲突
    const result = await getCveInfo("detail", "", 1, 20, `CVE-2026-api-err-${Date.now()}`, "freetype");

    assert(result.includes("错误") || result.includes("失败"), "详情 API 错误时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 11：详情缓存机制验证
// ============================
async function testDetailCacheMechanism() {
  console.log("\n【测试 11】缓存机制验证 - 详情查询");

  let fetchCallCount = 0;
  const mockDetail = makeMockCveDetail({ cveId: "CVE-2026-cache-test" });
  const mockProducts = makeMockProducts();

  const originalFetch = global.fetch;
  global.fetch = function () {
    fetchCallCount++;
    if (fetchCallCount <= 2) {
      // 第 1 次：detail endpoint
      // 第 2 次：product endpoint
      const data = fetchCallCount === 1
        ? { code: 0, msg: "", result: mockDetail }
        : { code: 0, msg: "", result: mockProducts };
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    }
    // 后续调用不应发生（缓存命中）
    fetchCallCount++;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ code: 0, result: mockDetail }) });
  };

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    await getCveInfo("detail", "", 1, 20, "CVE-2026-cache-test", "freetype");
    const countAfterFirst = fetchCallCount;
    await getCveInfo("detail", "", 1, 20, "CVE-2026-cache-test", "freetype");

    assert(countAfterFirst === 2, "第一次详情查询发起 2 次 fetch（两个端点）");
    assert(fetchCallCount === 2, "第二次详情查询使用缓存，不再发起 fetch");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 12：摘要超长截断
// ============================
async function testSummaryTruncation() {
  console.log("\n【测试 12】摘要超长截断");

  const longSummary = "A".repeat(600) + "不应该出现";
  const mockDetail = makeMockCveDetail({ summary: longSummary, cveId: "CVE-2026-trunc" });

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: { code: 0, msg: "", result: mockDetail } },
    { data: { code: 0, msg: "", result: [] } },
  ]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("detail", "", 1, 20, "CVE-2026-trunc", "pkg");

    assert(result.includes("..."), "超长摘要包含省略号");
    assert(!result.includes("不应该出现"), "超出部分不显示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 13：产品超过 20 个时的省略提示
// ============================
async function testProductListTruncation() {
  console.log("\n【测试 13】受影响产品超过 20 个时的省略提示");

  const mockDetail = makeMockCveDetail({ cveId: "CVE-2026-many-products" });
  const mockProducts = Array.from({ length: 25 }, (_, i) => ({
    productName: `openEuler-product-${i}`,
    status: "已修复",
    securityNoticeNo: "openEuler-SA-2026-9999",
    releaseTime: "2026-02-01",
  }));

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: { code: 0, msg: "", result: mockDetail } },
    { data: { code: 0, msg: "", result: mockProducts } },
  ]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("detail", "", 1, 20, "CVE-2026-many-products", "pkg");

    assert(result.includes("25 个"), "结果显示总产品数 25");
    assert(result.includes("openEuler-product-0"), "结果包含第一个产品");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 14：详情查询 - 产品接口 404 时不影响主体显示
// ============================
async function testDetailProductEndpointFails() {
  console.log("\n【测试 14】详情查询 - 产品接口失败时不影响主体");

  const mockDetail = makeMockCveDetail({ cveId: "CVE-2026-prod-fail" });

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: { code: 0, msg: "", result: mockDetail } },         // detail OK
    { ok: false, status: 404, data: {} },                       // product fails
  ]);

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    const result = await getCveInfo("detail", "", 1, 20, "CVE-2026-prod-fail", "pkg");

    assert(result.includes("CVE-2026-prod-fail"), "产品接口失败时仍显示 CVE 详情");
    assert(!result.includes("受影响产品"), "产品接口失败时不显示产品列表");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 15：请求体参数验证（列表）
// ============================
async function testListRequestParams() {
  console.log("\n【测试 15】列表请求体参数验证");

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
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    await getCveInfo("list", "kernel", 2, 10);

    assert(capturedUrl.includes("findAll"), "列表查询使用正确的 URL");
    assert(capturedBody !== null, "发起了 POST 请求体");
    assert(capturedBody.pages && capturedBody.pages.page === 2, "page 参数正确传递");
    assert(capturedBody.pages && capturedBody.pages.size === 10, "size 参数正确传递");
    assert(capturedBody.noticeType === "cve", "noticeType 固定为 cve");
    assert(capturedBody.keyword === "kernel", "keyword 参数正确传递");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 16：详情查询 URL 参数验证
// ============================
async function testDetailRequestUrl() {
  console.log("\n【测试 16】详情查询 URL 参数验证");

  const capturedUrls = [];
  const mockDetail = makeMockCveDetail({ cveId: "CVE-2026-url-test" });

  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    capturedUrls.push(url);
    const isDetail = url.includes("getByCveId");
    const data = isDetail
      ? { code: 0, msg: "", result: mockDetail }
      : { code: 0, msg: "", result: [] };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  };

  try {
    const { getCveInfo } = await import("../src/tools/getCveInfo.js");
    await getCveInfo("detail", "", 1, 20, "CVE-2026-url-test", "freetype");

    assert(capturedUrls.length === 2, "详情查询发起 2 次请求");
    assert(capturedUrls.some(u => u.includes("getByCveIdAndPackageName")), "包含详情端点 URL");
    assert(capturedUrls.some(u => u.includes("getCVEProductPackageList")), "包含产品列表端点 URL");
    assert(capturedUrls.some(u => u.includes("CVE-2026-url-test")), "URL 包含 cveId 参数");
    assert(capturedUrls.some(u => u.includes("freetype")), "URL 包含 packageName 参数");
  } finally {
    global.fetch = originalFetch;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log("==========================================");
  console.log(" getCveInfo 工具函数单元测试");
  console.log("==========================================");

  const tests = [
    testListQueryWithKeyword,
    testListQueryNoResults,
    testListQueryPagination,
    testDetailQuery,
    testDetailMissingCveId,
    testDetailMissingPackageName,
    testDetailNotFound,
    testNetworkTimeout,
    testApiErrorList,
    testApiErrorDetail,
    testDetailCacheMechanism,
    testSummaryTruncation,
    testProductListTruncation,
    testDetailProductEndpointFails,
    testListRequestParams,
    testDetailRequestUrl,
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
