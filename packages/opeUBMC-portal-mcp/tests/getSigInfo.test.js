/**
 * @created 2026-03-09 by sig-OpenDesign with Claude AI
 * @modified 2026-03-13 by sig-OpenDesign with Claude AI
 * @description getSigInfo 工具函数单元测试
 *   更新：列表 API 已包含完整 SIG 数据，无需再调详情 API
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

/**
 * URL-aware mock fetch：根据 URL 内容返回不同响应。
 * 新架构只需要 sigListData（含完整 SIG 对象）和 contributeData。
 */
function createUrlAwareFetch({
  sigListData,
  contributeData,
  contributeDataMap,
  contributeStatus = 200,
  forceError,
} = {}) {
  return function mockFetch(url, options) {
    // 贡献统计 URL
    if (url.includes("stat_new/sig/user/contribute")) {
      if (forceError) return Promise.reject(forceError);
      if (contributeStatus !== 200) {
        return Promise.resolve({ ok: false, status: contributeStatus, json: () => Promise.resolve({}) });
      }
      let data = contributeData;
      if (contributeDataMap) {
        const match = url.match(/contributeType=([^&]+)/);
        const ct = match ? match[1] : "pr";
        data = contributeDataMap[ct] || contributeData;
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    }

    // SIG 列表 URL
    if (url.includes("stat/sig/info")) {
      const data = sigListData || { code: 0 };
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    }

    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  };
}

// 构造标准 SIG 对象 mock（匹配真实 API 返回格式）
function makeSig(name, extra = {}) {
  return {
    name,
    description: `${name} SIG 描述`,
    mailing_list: `${name.toLowerCase()}@openubmc.cn`,
    maintainers: [{ gitee_id: "alice" }, { gitee_id: "bob" }],
    repositories: ["repo1", "repo2"],
    committers: [{ gitee_id: "charlie" }],
    ...extra,
  };
}

// ============================
// 测试 1：精确匹配 SIG 名称，返回详情
// ============================
async function testSigExactMatch() {
  console.log('\n【测试 1】精确匹配 SIG 名称，返回详情');

  const mockSigList = {
    code: 1,
    data: [
      makeSig("infrastructure", { description: "基础设施 SIG", mailing_list: "infra@openubmc.cn" }),
      makeSig("BMC"),
      makeSig("Security"),
    ],
  };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("infrastructure");

    assert(result.includes("infrastructure"), "结果包含 SIG 名称");
    assert(result.includes("基础设施 SIG"), "结果包含 SIG 描述");
    assert(result.includes("infra@openubmc.cn"), "结果包含邮件列表");
    assert(result.includes("alice"), "结果包含 maintainer");
    assert(result.includes("repo1"), "结果包含仓库");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：大小写不同时自动修正
// ============================
async function testSigCaseAutoCorrect() {
  console.log('\n【测试 2】大小写不同时自动修正');

  const mockSigList = {
    code: 1,
    data: [makeSig("infrastructure"), makeSig("BMC"), makeSig("Security")],
  };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    // 输入 "Infrastructure"（首字母大写），应自动修正为 "infrastructure"
    const result = await getSigInfo("Infrastructure");

    assert(result.includes("infrastructure"), "大小写修正后返回正确 SIG 详情");
    assert(!result.includes("未找到") && !result.includes("SIG 列表"), "大小写仅不同时不返回列表");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：名称不在列表中，返回完整 SIG 列表
// ============================
async function testSigNotFoundReturnsList() {
  console.log('\n【测试 3】名称不在列表中，返回完整 SIG 列表');

  const mockSigList = {
    code: 1,
    data: [makeSig("infrastructure"), makeSig("BMC"), makeSig("Security"), makeSig("Networking")],
  };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("nonexistent-sig");

    assert(result.includes("infrastructure"), "列表包含 infrastructure");
    assert(result.includes("BMC"), "列表包含 BMC");
    assert(result.includes("Security"), "列表包含 Security");
    assert(result.includes("Networking"), "列表包含 Networking");
    assert(result.includes("nonexistent-sig"), "结果说明哪个名称未找到");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：SIG 列表为空时，返回提示
// ============================
async function testSigListEmpty() {
  console.log('\n【测试 4】SIG 列表为空时返回提示');

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: { code: 0 } });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("BMC");

    // 列表为空时 sig=null，list=[]，返回"未找到"提示
    assert(result.includes("未找到") || result.includes("SIG 列表"), "SIG 列表为空时返回提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 5：贡献查询 - PR 模式
// ============================
async function testContributeQueryPR() {
  console.log('\n【测试 5】贡献查询 - PR 模式');

  const mockSigList = { code: 1, data: [makeSig("infrastructure"), makeSig("BMC")] };
  const mockContributeData = {
    code: 1,
    data: [
      { gitee_id: "alice", contribute_count: 42 },
      { gitee_id: "bob", contribute_count: 28 },
    ],
  };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList, contributeData: mockContributeData });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("infrastructure", "contribute", "pr");

    assert(result.includes("infrastructure"), "结果包含 SIG 名称");
    assert(result.includes("alice"), "结果包含贡献者");
    assert(result.includes("42"), "结果包含贡献次数");
    assert(result.includes("PR"), "结果标注贡献类型");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 6：贡献查询 - all 类型
// ============================
async function testContributeQueryAll() {
  console.log('\n【测试 6】贡献查询 - all 类型');

  const mockSigList = { code: 1, data: [makeSig("infrastructure")] };
  const mockContributeData = {
    code: 1,
    data: [{ gitee_id: "alice", contribute_count: 10 }],
  };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList, contributeData: mockContributeData });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("infrastructure", "contribute", "all");

    assert(result.includes("PR"), "结果包含 PR 贡献");
    assert(result.includes("Issue"), "结果包含 Issue 贡献");
    assert(result.includes("评审"), "结果包含评审评论贡献");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 7：贡献查询 - 名称不在列表，返回列表
// ============================
async function testContributeQuerySigNotFound() {
  console.log('\n【测试 7】贡献查询 - 名称不在列表，返回列表');

  const mockSigList = { code: 1, data: [makeSig("infrastructure"), makeSig("BMC")] };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("NoExistSIG", "contribute", "pr");

    assert(result.includes("infrastructure") || result.includes("SIG 列表"), "未匹配时返回 SIG 列表");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：网络超时处理
// ============================
async function testNetworkTimeout() {
  console.log('\n【测试 8】网络超时处理');

  const originalFetch = global.fetch;
  const abortError = new Error('The operation was aborted');
  abortError.name = 'AbortError';
  global.fetch = () => Promise.reject(abortError);

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("infrastructure");

    assert(result.includes("超时"), "超时时返回超时提示");
    assert(!result.includes("AbortError"), "不暴露内部错误名称");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：SIG 数据包含所有扩展字段时均能正常展示
// ============================
async function testSigAllFieldsDisplayed() {
  console.log('\n【测试 9】SIG 包含扩展字段时全部展示');

  const mockSigList = {
    code: 1,
    data: [{
      name: "infrastructure",
      description: "基础设施 SIG（中文）",
      description_en: "Infrastructure SIG",
      mailing_list: "infra@openubmc.cn",
      created_on: "2023-01-01",
      meeting_url: "https://meeting.openubmc.cn/infra",
      discuss_url: "https://discuss.openubmc.cn/infra",
      maintainers: [{ gitee_id: "alice", email: "alice@example.com" }],
      committers: [{ gitee_id: "charlie" }, { gitee_id: "dave" }],
      repositories: ["repo-a", "repo-b"],
      meeting_agenda: [{ topic: "Weekly sync", date: "2026-03-10" }],
    }],
  };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("infrastructure");

    assert(result.includes("Infrastructure SIG"), "展示英文描述");
    assert(result.includes("2023-01-01"), "展示创建时间");
    assert(result.includes("meeting.openubmc.cn"), "展示会议链接");
    assert(result.includes("discuss.openubmc.cn"), "展示讨论链接");
    assert(result.includes("charlie"), "展示 committer");
    assert(result.includes("Weekly sync"), "展示会议议程");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：贡献查询 API 错误状态
// ============================
async function testContributeApiError() {
  console.log('\n【测试 10】贡献查询 API 错误状态');

  const mockSigList = { code: 1, data: [makeSig("infrastructure")] };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList, contributeStatus: 503 });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("infrastructure", "contribute", "pr");

    assert(result.includes("错误") || result.includes("失败"), "API 错误时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 11：缓存命中（列表 API 只调用一次）
// ============================
async function testCacheHit() {
  console.log('\n【测试 11】缓存命中（列表 API 只调用一次）');

  const mockSigList = { code: 1, data: [makeSig("infrastructure"), makeSig("BMC")] };
  let listFetchCount = 0;

  const originalFetch = global.fetch;
  global.fetch = function (url, opts) {
    if (url.includes("stat/sig/info")) {
      listFetchCount++;
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockSigList) });
  };

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    await getSigInfo("infrastructure");
    await getSigInfo("BMC");

    assert(listFetchCount === 1, "两次查询只调用一次列表 API（缓存命中）");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 12：SIG 列表 API 请求失败时降级处理
// ============================
async function testSigListApiFail() {
  console.log('\n【测试 12】SIG 列表 API 请求失败时降级处理');

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: { code: 0 } }); // list api 返回无效

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("BMC");

    // sig=null，list=[]，formatSigList 输出包含"未找到"
    assert(result.includes("未找到") || result.includes("SIG 列表"), "SIG 列表获取失败时返回友好提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('==========================================');
  console.log(' getSigInfo 工具函数单元测试');
  console.log('==========================================');

  const tests = [
    testSigExactMatch,
    testSigCaseAutoCorrect,
    testSigNotFoundReturnsList,
    testSigListEmpty,
    testContributeQueryPR,
    testContributeQueryAll,
    testContributeQuerySigNotFound,
    testNetworkTimeout,
    testSigAllFieldsDisplayed,
    testContributeApiError,
    testCacheHit,
    testSigListApiFail,
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (e) {
      console.error(`  ❌ 测试异常: ${e.message}`);
      failed++;
    }
  }

  console.log('\n==========================================');
  console.log(` 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log('==========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(e => {
  console.error('测试运行失败:', e);
  process.exit(1);
});
