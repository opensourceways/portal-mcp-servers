/**
 * @created 2026-03-03 by sig-OpenDesign with Claude AI
 * @description getSearchInfo 工具函数单元测试
 */

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

// 构造模拟 fetch（顺序返回）
function createMockFetch(responses) {
  let callCount = 0;
  return function mockFetch(url, options) {
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    if (response.error) return Promise.reject(response.error);
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      json: () => Promise.resolve(response.data),
      text: () => Promise.resolve(JSON.stringify(response.data)),
    });
  };
}

// 构造模拟搜索记录
function makeMockRecord(overrides = {}) {
  return {
    title: "第六期Linux内核源码结构",
    textContent: "作者：测试作者，本文介绍了 <span>kernel</span> 的基本结构。",
    type: "blog",
    path: "zh/blog/test/index",
    date: "2026-01-01",
    tags: ["Linux", "内核"],
    author: ["测试作者"],
    score: 0.8,
    lang: "zh",
    category: "blog",
    ...overrides,
  };
}

// 构造模拟成功响应体（文本，含双JSON）
function makeMockSuccessText(records) {
  const main = { status: 200, msg: "查询成功", obj: { records } };
  const extra = { status: 201, msg: "内容不存在", obj: null };
  // 模拟 API 的双 JSON 拼接格式
  return JSON.stringify(main) + JSON.stringify(extra);
}

// 构造模拟无结果响应体
function makeMockEmptyText() {
  return JSON.stringify({ status: 201, msg: "内容不存在", obj: null });
}

// 注意：getSearchInfo 使用 response.text()，所以 mock 需要提供 text 方法
function createTextMockFetch(textResponses) {
  let callCount = 0;
  return function mockFetch(url, options) {
    const response = textResponses[callCount] || textResponses[textResponses.length - 1];
    callCount++;
    if (response.error) return Promise.reject(response.error);
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      text: () => Promise.resolve(response.text),
    });
  };
}

// ============================
// 测试 1：正常查询 - 有结果
// ============================
async function testNormalQueryWithResults() {
  console.log("\n【测试 1】正常查询 - 有结果");

  const records = [
    makeMockRecord({ title: "openEuler <span>kernel</span> 介绍", type: "blog" }),
    makeMockRecord({ title: "kernel issue #1", type: "issue", path: "https://gitcode.com/openeuler/kernel/issues/1", tags: [], author: [] }),
    makeMockRecord({ title: "kernel 代码", type: "gitcode", path: "https://gitcode.com/openeuler/kernel", tags: [], author: [] }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ text: makeMockSuccessText(records) }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("kernel", "zh");

    assert(result.includes("openEuler 门户搜索结果"), "结果包含搜索结果标题");
    assert(result.includes("kernel"), "结果包含搜索关键词");
    assert(result.includes("中文"), "结果包含语言标签");
    assert(result.includes("3 条结果"), "结果显示总条数");
    assert(result.includes("openEuler kernel 介绍"), "HTML 标签被清理，标题正确显示");
    assert(result.includes("博客文章"), "结果包含博客类型标签");
    assert(result.includes("Issue"), "结果包含 Issue 类型标签");
    assert(result.includes("代码仓库"), "结果包含代码仓库类型标签");
    assert(result.includes("openeuler.openatom.cn"), "博客链接包含门户域名");
    assert(result.includes("2026-01-01"), "结果包含日期");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：英文查询
// ============================
async function testEnglishQuery() {
  console.log("\n【测试 2】英文查询");

  const records = [
    makeMockRecord({ title: "openEuler kernel introduction", lang: "en" }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ text: makeMockSuccessText(records) }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("kernel", "en");

    assert(result.includes("英文"), "英文查询结果包含英文语言标签");
    assert(!result.includes("中文"), "英文查询不显示中文标签");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：无结果时的提示
// ============================
async function testNoResults() {
  console.log("\n【测试 3】无结果时的友好提示");

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ text: makeMockEmptyText() }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("xyznonexistent999", "zh");

    assert(result.includes("未在 openEuler 门户中找到"), "无结果时给出未找到提示");
    assert(result.includes("💡"), "无结果时包含提示图标");
    assert(result.includes("get_docs_search_content"), "无结果时推荐其他工具");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：空关键词处理
// ============================
async function testEmptyKeyword() {
  console.log("\n【测试 4】空关键词处理");

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("", "zh");

    assert(result.includes("请提供搜索关键词"), "空关键词时给出提示");
  } catch (e) {
    assert(false, `测试失败: ${e.message}`);
  }
}

// ============================
// 测试 5：全 URL 路径不加前缀
// ============================
async function testFullUrlPath() {
  console.log("\n【测试 5】全 URL 路径不加门户前缀");

  const records = [
    makeMockRecord({
      type: "issue",
      path: "https://gitcode.com/openeuler/kernel/issues/1",
      tags: [],
      author: [],
    }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ text: makeMockSuccessText(records) }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("issue_test", "zh");

    assert(result.includes("https://gitcode.com"), "全 URL 直接使用，不加前缀");
    assert(!result.includes("openeuler.openatom.cn/https://"), "不会错误拼接前缀");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 6：相对路径添加门户前缀
// ============================
async function testRelativePathGetsPrefix() {
  console.log("\n【测试 6】相对路径自动添加门户基础 URL");

  const records = [
    makeMockRecord({
      type: "blog",
      path: "zh/blog/test/index",
    }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ text: makeMockSuccessText(records) }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("blog_test", "zh");

    assert(result.includes("https://www.openeuler.openatom.cn/zh/blog/test/index"), "相对路径正确拼接前缀");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 7：HTML 标签清理
// ============================
async function testHtmlStripInTitle() {
  console.log("\n【测试 7】HTML 标签清理（标题和摘要）");

  const records = [
    makeMockRecord({
      title: "关于 <span>kernel</span> 的文章",
      textContent: "这是一篇关于 <span>kernel</span> 的 <b>技术</b> 博客。",
    }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ text: makeMockSuccessText(records) }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("kernel_html", "zh");

    assert(result.includes("关于 kernel 的文章"), "标题中 HTML 标签被清理");
    assert(!result.includes("<span>"), "标题不包含 span 标签");
    assert(!result.includes("<b>"), "摘要不包含 b 标签");
    assert(result.includes("这是一篇关于 kernel 的 技术 博客"), "摘要 HTML 标签被清理");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：摘要超过 120 字符截断
// ============================
async function testExcerptTruncation() {
  console.log("\n【测试 8】摘要超过 120 字符时截断");

  const longText = "A".repeat(200) + "不应该出现";
  const records = [makeMockRecord({ textContent: longText })];

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ text: makeMockSuccessText(records) }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("trunc_test", "zh");

    assert(result.includes("..."), "超长摘要包含省略号");
    assert(!result.includes("不应该出现"), "超出部分不显示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：网络超时处理
// ============================
async function testNetworkTimeout() {
  console.log("\n【测试 9】网络超时处理");

  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ error: abortError }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("timeout_test", "zh");

    assert(result.includes("超时"), "超时时返回超时提示");
    assert(!result.includes("AbortError"), "不暴露内部错误名称");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：API 返回错误状态码
// ============================
async function testApiError() {
  console.log("\n【测试 10】API 返回错误状态码");

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ ok: false, status: 500, text: "" }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo(`api_err_${Date.now()}`, "zh");

    assert(result.includes("错误") || result.includes("失败"), "API 错误时返回错误提示");
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
  const records = [makeMockRecord()];

  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    fetchCallCount++;
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(makeMockSuccessText(records)),
    });
  };

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const uniqueKeyword = `cache_test_${Date.now()}`;
    await getSearchInfo(uniqueKeyword, "zh");
    const countAfterFirst = fetchCallCount;
    await getSearchInfo(uniqueKeyword, "zh");

    assert(countAfterFirst === 1, "第一次查询发起 1 次 fetch");
    assert(fetchCallCount === 1, "第二次查询使用缓存，不再发起 fetch");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 12：请求体参数验证
// ============================
async function testRequestParams() {
  console.log("\n【测试 12】请求体参数验证");

  let capturedUrl = null;
  let capturedBody = null;

  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    capturedUrl = url;
    capturedBody = options && options.body ? JSON.parse(options.body) : null;
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(makeMockEmptyText()),
    });
  };

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    await getSearchInfo(`param_test_${Date.now()}`, "en");

    assert(capturedUrl.includes("docsng"), "使用正确的 API 端点");
    assert(capturedBody !== null, "发起了 POST 请求体");
    assert(capturedBody.page === 1, "page 固定为 1");
    assert(capturedBody.pageSize === 12, "pageSize 固定为 12");
    assert(capturedBody.lang === "en", "lang 参数正确传递");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 13：etherpad 类型正确标签
// ============================
async function testEtherpadType() {
  console.log("\n【测试 13】etherpad 类型显示正确标签");

  const records = [
    makeMockRecord({
      type: "etherpad",
      path: "https://etherpad.openeuler.org/p/test",
      tags: [],
      author: [],
    }),
  ];

  const originalFetch = global.fetch;
  global.fetch = createTextMockFetch([{ text: makeMockSuccessText(records) }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("etherpad_test", "zh");

    assert(result.includes("会议文档"), "etherpad 类型显示为会议文档");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 14：toolDefinition 校验
// ============================
async function testToolDefinition() {
  console.log("\n【测试 14】toolDefinition 校验");

  try {
    const { toolDefinition } = await import("../src/tools/getSearchInfo.js");

    assert(toolDefinition.name === "get_search_info", "工具名称正确");
    assert(toolDefinition.inputSchema.required.includes("keyword"), "keyword 为必填参数");
    assert(toolDefinition.inputSchema.properties.lang !== undefined, "存在 lang 参数");
    assert(toolDefinition.inputSchema.properties.lang.enum.includes("zh"), "lang 支持 zh");
    assert(toolDefinition.inputSchema.properties.lang.enum.includes("en"), "lang 支持 en");
    assert(toolDefinition.description.includes("兜底"), "描述中说明兜底用途");
  } catch (e) {
    assert(false, `测试失败: ${e.message}`);
  }
}

// ============================
// 测试 15：双 JSON 拼接格式解析
// ============================
async function testConcatenatedJsonParsing() {
  console.log("\n【测试 15】双 JSON 拼接格式正确解析");

  const records = [makeMockRecord({ title: "拼接测试文章" })];

  const originalFetch = global.fetch;
  // 模拟双 JSON 拼接（主响应 + 状态响应）
  const concatenated = JSON.stringify({ status: 200, msg: "查询成功", obj: { records } })
    + JSON.stringify({ status: 201, msg: "内容不存在", obj: null });
  global.fetch = createTextMockFetch([{ text: concatenated }]);

  try {
    const { getSearchInfo } = await import("../src/tools/getSearchInfo.js");
    const result = await getSearchInfo("concat_test", "zh");

    assert(result.includes("拼接测试文章"), "双 JSON 拼接格式下正确解析第一个对象");
    assert(!result.includes("内容不存在"), "不解析第二个 JSON 的内容");
  } finally {
    global.fetch = originalFetch;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log("==========================================");
  console.log(" getSearchInfo 工具函数单元测试");
  console.log("==========================================");

  const tests = [
    testNormalQueryWithResults,
    testEnglishQuery,
    testNoResults,
    testEmptyKeyword,
    testFullUrlPath,
    testRelativePathGetsPrefix,
    testHtmlStripInTitle,
    testExcerptTruncation,
    testNetworkTimeout,
    testApiError,
    testCacheMechanism,
    testRequestParams,
    testEtherpadType,
    testToolDefinition,
    testConcatenatedJsonParsing,
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
