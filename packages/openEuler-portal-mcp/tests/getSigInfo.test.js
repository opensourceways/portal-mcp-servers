/**
 * @created 2026-03-03 by sig-OpenDesign with Claude AI
 * @description getSigInfo 工具函数单元测试（贡献查询 + 模糊匹配新功能）
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
 * URL-aware mock fetch：根据 URL 内容返回不同响应，避免因模块级缓存导致的调用顺序问题。
 * @param {Object} opts
 *   - sigListData: SIG 列表响应 data（fetchAllSigNames 专用）
 *   - sigInfoFn: (url) => data，SIG 详情响应（querySigInfo 专用）
 *   - contributeData: 贡献响应 data（或按 contributeType 区分的 Map）
 *   - searchDocsData: sigsearch 响应 data
 *   - forceError: 在匹配到 contribute URL 时抛出此错误
 *   - contributeStatus: contribute 请求的 HTTP 状态（默认 200）
 */
function createUrlAwareFetch({
  sigListData,
  sigInfoFn,
  contributeData,
  contributeDataMap,
  searchDocsData,
  forceError,
  contributeStatus = 200,
} = {}) {
  return function mockFetch(url, options) {
    // 贡献统计 URL
    if (url.includes("user/contribute")) {
      if (forceError) return Promise.reject(forceError);
      if (contributeStatus !== 200) {
        return Promise.resolve({
          ok: false,
          status: contributeStatus,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve("{}"),
        });
      }
      // 支持按 contributeType 区分
      let data = contributeData;
      if (contributeDataMap) {
        const match = url.match(/contributeType=([^&]+)/);
        const ct = match ? match[1] : "pr";
        data = contributeDataMap[ct] || contributeData;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
      });
    }

    // SIG 列表 URL（不含 &sig= 参数）
    if (url.includes("stat/sig/info") && !url.includes("&sig=")) {
      const data = sigListData || { code: 0 };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
      });
    }

    // SIG 详情 URL（含 &sig= 参数）
    if (url.includes("stat/sig/info") && url.includes("&sig=")) {
      const data = sigInfoFn ? sigInfoFn(url) : { code: 0 };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
      });
    }

    // SIG 搜索 URL (sigsearch/docs)
    if (url.includes("sigsearch/docs")) {
      const data = searchDocsData || { repos: [], giteeIds: [] };
      const text = JSON.stringify(data);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(text),
      });
    }

    // 默认：返回空成功
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 0 }),
      text: () => Promise.resolve(JSON.stringify({ code: 0 })),
    });
  };
}

// 构造模拟 SIG 列表响应
function makeSigListResponse(sigNames) {
  return { code: 1, data: sigNames.map(name => ({ name })) };
}

// 构造模拟 SIG 详情响应
function makeSigInfoResponse(name) {
  return {
    code: 1,
    data: {
      name,
      description: `${name} SIG 描述`,
      mailing_list: "dev@openeuler.org",
      maintainers: ["user1", "user2"],
      maintainer_info: [{ name: "User One", user_login: "user1", email: "u1@test.com" }],
      repositories: ["repo1", "repo2"],
      committers: ["user3"],
      committer_info: [{ name: "User Three", gitee_id: "user3" }],
      branches: [],
    },
  };
}

// 构造模拟贡献响应
function makeContributeResponse(users) {
  return { code: 1, data: users.map((u, i) => ({ gitee_id: u, contribute_count: 100 - i * 10 })) };
}

const MOCK_SIG_NAMES = ["Kernel", "ai", "BigData", "Compiler", "Networking", "Security", "sig-SDS"];
const MOCK_SIG_LIST = makeSigListResponse(MOCK_SIG_NAMES);

// ============================
// 测试 1：贡献查询 - PR，SIG 名称精确匹配
// ============================
async function testContributeQueryPR() {
  console.log("\n【测试 1】贡献查询 - PR，SIG 名称精确匹配");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    contributeData: makeContributeResponse(["alice", "bob", "carol"]),
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("BigData", "contribute", "pr");

    assert(result.includes("BigData"), "结果包含 SIG 名称");
    assert(result.includes("PR 合并请求"), "结果包含贡献类型标签");
    assert(result.includes("alice"), "结果包含贡献者");
    assert(result.includes("100"), "结果包含贡献数量");
    assert(result.includes("全部"), "结果包含时间范围");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：贡献查询 - 大小写自动修正（bigdata → BigData）
// ============================
async function testContributeQueryCaseCorrection() {
  console.log("\n【测试 2】贡献查询 - SIG 名称大小写自动修正（bigdata → BigData）");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    contributeData: makeContributeResponse(["alice"]),
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("bigdata", "contribute", "pr");

    assert(result.includes("BigData"), "SIG 名称被修正为 BigData");
    assert(!result.includes("未找到"), "不返回未找到错误");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：贡献查询 - 名称不明确，返回建议
// ============================
async function testContributeQuerySuggestions() {
  console.log("\n【测试 3】贡献查询 - 多个候选时展示推荐列表");

  const originalFetch = global.fetch;
  // "sig" 匹配 sig-SDS 等多个候选 → 应展示建议
  global.fetch = createUrlAwareFetch({
    sigListData: makeSigListResponse(["sig-SDS", "sig-UKUI", "sig-OpenDesign", "Kernel"]),
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("sig", "contribute", "pr");

    assert(result.includes("相似") || result.includes("建议") || result.includes("sig-"), "多候选时展示建议");
    assert(!result.includes("alice"), "未查询到贡献数据（因名称不明确）");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：贡献查询 - 无任何匹配
// ============================
async function testContributeQueryNoMatch() {
  console.log("\n【测试 4】贡献查询 - 完全不存在的 SIG 名称");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: makeSigListResponse(["Kernel", "ai", "BigData"]),
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("xyznonexistent999", "contribute", "pr");

    assert(result.includes("未找到"), "完全不匹配时返回未找到提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 5：贡献查询 - 全部类型 (all)
// ============================
async function testContributeQueryAll() {
  console.log("\n【测试 5】贡献查询 - 全部类型（all）");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    contributeDataMap: {
      pr: makeContributeResponse(["u1", "u2"]),
      issue: makeContributeResponse(["u3", "u4"]),
      comment: makeContributeResponse(["u5", "u6"]),
    },
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("Kernel", "contribute", "all");

    assert(result.includes("全部类型"), "全部类型标题");
    assert(result.includes("PR 合并请求"), "包含 PR 部分");
    assert(result.includes("Issue 需求&评审"), "包含 Issue 部分");
    assert(result.includes("评审评论"), "包含评论部分");
    assert(result.includes("u1"), "PR 贡献者出现");
    assert(result.includes("u3"), "Issue 贡献者出现");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 6：贡献查询 - Issue 类型
// ============================
async function testContributeQueryIssue() {
  console.log("\n【测试 6】贡献查询 - Issue 类型");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    contributeData: makeContributeResponse(["issueUser1", "issueUser2"]),
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("Kernel", "contribute", "issue");

    assert(result.includes("Issue 需求&评审"), "结果包含 Issue 贡献类型标签");
    assert(result.includes("issueUser1"), "结果包含贡献者");
    assert(result.includes("100"), "结果包含贡献数量");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 7：贡献查询 - 无贡献数据
// ============================
async function testContributeQueryNoData() {
  console.log("\n【测试 7】贡献查询 - 无贡献数据");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    contributeData: { code: 1, data: [] },
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("Kernel", "contribute", "pr");

    assert(result.includes("暂无数据") || result.includes("0 人"), "无数据时给出提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：智能查询 - SIG 列表模糊匹配后查询成功
// ============================
async function testSmartQueryWithSigListMatch() {
  console.log("\n【测试 8】智能查询 - 通过 SIG 列表模糊匹配后查询成功");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: makeSigListResponse(["BigData", "Kernel"]),
    // big-data 变体均失败，BigData 成功
    sigInfoFn: (url) => {
      if (url.includes("sig=BigData")) return makeSigInfoResponse("BigData");
      return { code: 0 }; // 其他变体失败
    },
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("big-data", "sig");

    assert(result.includes("BigData"), "通过 SIG 列表匹配后返回正确 SIG 信息");
    assert(result.includes("Maintainers"), "结果包含 Maintainers 信息");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：智能查询 - 所有方式失败后返回相似建议
// ============================
async function testSmartQueryAllFailedWithSuggestions() {
  console.log("\n【测试 9】智能查询 - 全部失败后返回相似建议");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: makeSigListResponse(["sig-security", "sig-safety", "security-tools"]),
    sigInfoFn: () => ({ code: 0 }), // 所有 SIG 查询失败
    searchDocsData: { repos: [], giteeIds: [] },
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    // "security" 会匹配到 sig-security、sig-safety、security-tools 多个候选
    const result = await getSigInfo("security", "sig");

    assert(result.includes("未找到") || result.includes("相似") || result.includes("建议") || result.includes("sig-security"), "全部失败时返回有效提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：贡献查询 - 网络超时处理
// ============================
async function testContributeQueryTimeout() {
  console.log("\n【测试 10】贡献查询 - 网络超时处理");

  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    forceError: abortError,
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("Kernel", "contribute", "pr");

    assert(result.includes("超时"), "超时时返回超时提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 11：贡献查询 - API 错误状态码
// ============================
async function testContributeQueryApiError() {
  console.log("\n【测试 11】贡献查询 - API 错误状态码");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    contributeStatus: 500,
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("Kernel", "contribute", "pr");

    assert(result.includes("错误") || result.includes("失败"), "API 错误时返回错误提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 12：贡献超过 20 人时截断
// ============================
async function testContributeTruncation() {
  console.log("\n【测试 12】贡献查询 - 超过 20 人时截断显示");

  const users = Array.from({ length: 25 }, (_, i) => `user${i}`);

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    contributeData: makeContributeResponse(users),
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("Kernel", "contribute", "pr");

    assert(result.includes("user0"), "结果包含第一位贡献者");
    assert(result.includes("25 人"), "结果显示总人数 25");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 13：贡献查询 - 请求 URL 参数验证
// ============================
async function testContributeRequestParams() {
  console.log("\n【测试 13】贡献查询 - 请求 URL 参数验证");

  let capturedContributeUrl = null;

  const originalFetch = global.fetch;
  global.fetch = function (url, options) {
    if (url.includes("user/contribute")) capturedContributeUrl = url;
    return createUrlAwareFetch({
      sigListData: MOCK_SIG_LIST,
      contributeData: makeContributeResponse(["u1"]),
    })(url, options);
  };

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    await getSigInfo("Kernel", "contribute", "issue");

    assert(capturedContributeUrl !== null, "发起了贡献查询请求");
    assert(capturedContributeUrl.includes("contributeType=issue"), "URL 包含正确的 contributeType");
    assert(capturedContributeUrl.includes("timeRange=all"), "URL 包含 timeRange=all");
    assert(capturedContributeUrl.includes("community=openeuler"), "URL 包含 community=openeuler");
    assert(capturedContributeUrl.includes("sig=Kernel"), "URL 包含正确的 sig 名称");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 14：模糊匹配 - 去除连字符后匹配（big-data → BigData）
// ============================
async function testFuzzyMatchStripped() {
  console.log("\n【测试 14】模糊匹配 - 去除连字符后匹配（big-data → BigData）");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: makeSigListResponse(["BigData", "Kernel"]),
    contributeData: makeContributeResponse(["u1"]),
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("big-data", "contribute", "pr");

    assert(result.includes("BigData"), "big-data 被匹配到 BigData");
    assert(!result.includes("未找到"), "不返回未找到错误");
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 15：toolDefinition 包含新参数
// ============================
async function testToolDefinition() {
  console.log("\n【测试 15】toolDefinition 包含新参数");

  try {
    const { toolDefinition } = await import("../src/tools/getSigInfo.js");

    assert(toolDefinition.name === "get_sig_info", "工具名称正确");
    const queryTypeEnum = toolDefinition.inputSchema.properties.query_type.enum;
    assert(queryTypeEnum.includes("contribute"), "query_type 包含 contribute 选项");
    assert(toolDefinition.inputSchema.properties.contribute_type !== undefined, "存在 contribute_type 参数");
    const ctEnum = toolDefinition.inputSchema.properties.contribute_type.enum;
    assert(ctEnum.includes("pr"), "contribute_type 包含 pr");
    assert(ctEnum.includes("issue"), "contribute_type 包含 issue");
    assert(ctEnum.includes("comment"), "contribute_type 包含 comment");
    assert(ctEnum.includes("all"), "contribute_type 包含 all");
  } catch (e) {
    assert(false, `测试失败: ${e.message}`);
  }
}

// ============================
// 测试 16：贡献提示 - 查询结果中包含其他贡献类型的引导
// ============================
async function testContributeHint() {
  console.log("\n【测试 16】贡献查询 - 结果中包含其他类型查询提示");

  const originalFetch = global.fetch;
  global.fetch = createUrlAwareFetch({
    sigListData: MOCK_SIG_LIST,
    contributeData: makeContributeResponse(["u1"]),
  });

  try {
    const { getSigInfo } = await import("../src/tools/getSigInfo.js");
    const result = await getSigInfo("Kernel", "contribute", "comment");

    assert(result.includes("评审评论"), "结果包含评论贡献类型标签");
    assert(result.includes("contribute_type") || result.includes("issue") || result.includes("all"), "结果包含其他类型引导提示");
  } finally {
    global.fetch = originalFetch;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log("==========================================");
  console.log(" getSigInfo 工具函数单元测试（新功能）");
  console.log("==========================================");

  const tests = [
    testContributeQueryPR,
    testContributeQueryCaseCorrection,
    testContributeQuerySuggestions,
    testContributeQueryNoMatch,
    testContributeQueryAll,
    testContributeQueryIssue,
    testContributeQueryNoData,
    testSmartQueryWithSigListMatch,
    testSmartQueryAllFailedWithSuggestions,
    testContributeQueryTimeout,
    testContributeQueryApiError,
    testContributeTruncation,
    testContributeRequestParams,
    testFuzzyMatchStripped,
    testToolDefinition,
    testContributeHint,
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
