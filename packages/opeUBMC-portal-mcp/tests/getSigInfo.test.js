/**
 * @created 2026-03-09 by sig-OpenDesign with Claude AI
 * @modified 2026-03-09 by sig-OpenDesign with Claude AI
 * @description getSigInfo 工具函数单元测试
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
 */
function createUrlAwareFetch({
  sigListData,
  sigDetailData,
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

    // SIG 详情 URL（含 sigName= 参数）
    if (url.includes("openubmc/sig/info")) {
      const data = sigDetailData || { code: 0 };
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    }

    // SIG 列表 URL（stat/sig/info?community=openubmc，不含 sigName=）
    if (url.includes("stat/sig/info")) {
      const data = sigListData || { code: 0 };
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    }

    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  };
}

// ============================
// 测试 1：精确匹配 SIG 名称，返回详情
// ============================
async function testSigExactMatch() {
  console.log('\n【测试 1】精确匹配 SIG 名称，返回详情');

  const mockSigList = { code: 1, data: ["infrastructure", "BMC", "Security"] };
  const mockSigDetail = {
    code: 1,
    data: {
      name: "infrastructure",
      description: "基础设施 SIG",
      mailing_list: "infra@openubmc.cn",
      maintainers: ["alice", "bob"],
      repositories: ["repo1", "repo2"],
    },
  };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList, sigDetailData: mockSigDetail });

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

  const mockSigList = { code: 1, data: ["infrastructure", "BMC", "Security"] };
  const mockSigDetail = {
    code: 1,
    data: { name: "infrastructure", description: "基础设施 SIG", maintainers: ["alice"], repositories: [] },
  };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({ sigListData: mockSigList, sigDetailData: mockSigDetail });

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

  const mockSigList = { code: 1, data: ["infrastructure", "BMC", "Security", "Networking"] };

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

    // 列表为空时 resolved=null，list=[]，返回"未找到"提示（含空列表）
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

  const mockSigList = { code: 1, data: ["infrastructure", "BMC"] };
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

  const mockSigList = { code: 1, data: ["infrastructure"] };
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

  const mockSigList = { code: 1, data: ["infrastructure", "BMC"] };

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
// 测试 9：SIG 详情 API 返回无效数据
// ============================
async function testSigDetailInvalidData() {
  console.log('\n【测试 9】SIG 详情 API 返回无效数据');

  const mockSigList = { code: 1, data: ["infrastructure"] };

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: mockSigList,
    sigDetailData: { code: 0 }, // 详情查询失败
  });

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    const result = await getSigInfo("infrastructure");

    assert(result.includes("未能获取") || result.includes("错误"), "详情查询失败时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：贡献查询 API 错误状态
// ============================
async function testContributeApiError() {
  console.log('\n【测试 10】贡献查询 API 错误状态');

  const mockSigList = { code: 1, data: ["infrastructure"] };

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
// 测试 11：大小写修正后使用正确名称查询详情
// ============================
async function testCaseCorrectPassesToDetail() {
  console.log('\n【测试 11】大小写修正后使用正确名称查询详情');

  const mockSigList = { code: 1, data: ["BMC", "Security"] };
  let capturedUrl = '';

  const originalFetch = global.fetch;
  global.fetch = function (url, opts) {
    capturedUrl = url;
    if (url.includes("openubmc/sig/info")) {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ code: 1, data: { name: "BMC", maintainers: [], repositories: [] } }),
      });
    }
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(mockSigList),
    });
  };

  try {
    const { getSigInfo, _resetCache } = await import('../src/tools/getSigInfo.js');
    _resetCache();
    await getSigInfo("bmc"); // 输入小写

    assert(capturedUrl.includes("sigName=BMC"), "详情查询使用修正后的正确大小写名称");
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

    // resolved=null，list=[]，formatSigList 输出包含"未找到"
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
    testSigDetailInvalidData,
    testContributeApiError,
    testCaseCorrectPassesToDetail,
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
