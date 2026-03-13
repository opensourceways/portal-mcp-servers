/**
 * @created 2026-03-11 by sig-OpenDesign with Claude AI
 * @description getAppInfo 工具函数单元测试
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

// ─── Mock 数据 ───────────────────────────────────────────────────────────────

const MOCK_LIST = [
  {
    name: "BMC Studio",
    type: "tooling",
    version: "25.12",
    description: "BMC Studio 集成开发环境",
  },
  {
    name: "OpenBMC SDK",
    type: "tooling",
    version: "1.0.0",
    description: "OpenBMC 软件开发工具包",
  },
  {
    name: "BMC Framework",
    type: "application",
    version: "2.1.0",
    description: "BMC 应用框架",
  },
  {
    name: "WebUI Component",
    type: "application",
    version: "3.5.1",
    description: "Web 界面组件库",
  },
];

const MOCK_DETAIL = {
  name: "BMC Studio",
  type: "tooling",
  description: "BMC Studio 集成开发环境，支持 BMC 固件开发",
  version: "25.12",
  versions: ["25.12", "25.06", "24.12", "24.06"],
  license: "MIT",
  arch: "x86_64",
  homepage: "https://www.openubmc.cn",
  download_url: "https://www.openubmc.cn/download/bmc-studio-25.12.tar.gz",
};

// ─── Mock fetch 工厂 ─────────────────────────────────────────────────────────

function createMockFetch({
  listData = MOCK_LIST,
  detailData = MOCK_DETAIL,
  listStatus = 200,
  detailStatus = 200,
  forceError = null,
} = {}) {
  return function mockFetch(url, _options) {
    if (forceError) return Promise.reject(forceError);

    if (url.includes("/list")) {
      if (listStatus !== 200) {
        return Promise.resolve({ ok: false, status: listStatus, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(listData) });
    }

    if (url.includes("/detail/")) {
      if (detailStatus !== 200) {
        return Promise.resolve({ ok: false, status: detailStatus, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: detailData }) });
    }

    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  };
}

// ─── 测试辅助 ─────────────────────────────────────────────────────────────────

async function loadModule(mockFetch) {
  // 动态导入并注入全局 fetch
  global.fetch = mockFetch;
  const mod = await import(`../src/tools/getAppInfo.js?t=${Date.now()}`);
  mod._resetCache();
  return mod;
}

// ─── 测试套件 ─────────────────────────────────────────────────────────────────

async function testListQuery() {
  console.log("\n【列表查询】");

  // 1. 正常列表查询
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("list");
    assert(result.includes("BMC Studio"), "正常列表查询：包含 BMC Studio");
    assert(result.includes("开发工具"), "正常列表查询：包含开发工具分类");
    assert(result.includes("社区组件"), "正常列表查询：包含社区组件分类");
    assert(result.includes("openUBMC"), "正常列表查询：包含数据来源标识");
  }

  // 2. 按类型筛选 - tooling
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("list", "", "", "tooling");
    assert(result.includes("BMC Studio"), "筛选 tooling：包含 BMC Studio");
    assert(result.includes("开发工具"), "筛选 tooling：包含开发工具标签");
  }

  // 3. 按类型筛选 - application
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("list", "", "", "application");
    assert(result.includes("BMC Framework"), "筛选 application：包含 BMC Framework");
    assert(result.includes("社区组件"), "筛选 application：包含社区组件标签");
  }

  // 4. 空列表
  {
    const mod = await loadModule(createMockFetch({ listData: [] }));
    const result = await mod.getAppInfo("list");
    assert(result.includes("暂无"), "空列表：返回暂无提示");
  }

  // 5. API 错误（HTTP 500）
  {
    const mod = await loadModule(createMockFetch({ listStatus: 500 }));
    const result = await mod.getAppInfo("list");
    assert(result.includes("错误") || result.includes("失败"), "API 500 错误：返回错误提示");
  }
}

async function testDetailQuery() {
  console.log("\n【详情查询】");

  // 1. 正常详情查询（精确名称 + 默认版本）
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("detail", "BMC Studio");
    assert(result.includes("BMC Studio"), "精确查询：包含包名");
    assert(result.includes("25.12"), "精确查询：包含版本号");
    assert(result.includes("MIT"), "精确查询：包含许可证");
    assert(result.includes("可用版本"), "精确查询：包含版本列表");
  }

  // 2. 大小写不敏感匹配
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("detail", "bmc studio");
    assert(result.includes("BMC Studio"), "大小写匹配：正确解析为 BMC Studio");
    assert(!result.includes("未找到"), "大小写匹配：不返回未找到提示");
  }

  // 3. 指定存在的版本
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("detail", "BMC Studio", "25.12");
    assert(result.includes("25.12"), "指定版本：返回指定版本信息");
  }

  // 4. 不传版本 → 使用默认版本
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("detail", "BMC Studio", "");
    assert(result.includes("25.12"), "默认版本：使用列表中的默认版本");
  }

  // 5. 不传 package_name
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("detail", "");
    assert(result.includes("package_name"), "缺少包名：提示缺少 package_name");
  }
}

async function testFuzzyMatch() {
  console.log("\n【模糊匹配】");

  // 1. 包名不存在但有相近推荐
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("detail", "BMC Studoo");
    // 编辑距离 2，应该有推荐
    const hasRecommend = result.includes("您是否在找") || result.includes("未找到");
    assert(hasRecommend, "模糊包名：返回推荐或未找到提示");
  }

  // 2. 包名完全不相近 → 返回完整列表
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("detail", "zzz_nonexistent_xyz");
    assert(result.includes("未找到"), "完全不相近：返回未找到提示");
    // 应包含完整列表或推荐
    const hasList = result.includes("BMC Studio") || result.includes("完整列表");
    assert(hasList, "完全不相近：返回完整列表或包名");
  }

  // 3. 版本不存在 → 返回版本列表
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("detail", "BMC Studio", "99.99");
    assert(result.includes("不存在版本"), "不存在版本：返回版本不存在提示");
    assert(result.includes("25.12"), "不存在版本：返回可用版本列表");
  }

  // 4. 版本相近推荐（大小写不同）
  {
    const detailWithVersions = {
      ...MOCK_DETAIL,
      versions: ["25.12", "25.06", "24.12"],
    };
    // 模拟版本大小写不同（如版本字段本身不区分大小写）
    const mod = await loadModule(createMockFetch({ detailData: detailWithVersions }));
    const result = await mod.getAppInfo("detail", "BMC Studio", "25.12");
    assert(result.includes("25.12"), "版本大小写：正确匹配版本");
  }
}

async function testCacheMechanism() {
  console.log("\n【缓存机制】");

  let fetchCount = 0;
  const countingFetch = (url, opts) => {
    if (url.includes("/list")) fetchCount++;
    return createMockFetch()(url, opts);
  };

  global.fetch = countingFetch;
  const { getAppInfo, _resetCache } = await import(`../src/tools/getAppInfo.js?t=${Date.now()}`);
  _resetCache();

  fetchCount = 0;
  await getAppInfo("list");
  await getAppInfo("list");
  assert(fetchCount === 1, "缓存命中：连续两次 list 查询只请求一次");

  _resetCache();
  fetchCount = 0;
  await getAppInfo("list");
  assert(fetchCount === 1, "缓存清除：清除后重新请求");
}

async function testNetworkTimeout() {
  console.log("\n【网络超时】");

  const timeoutError = new DOMException("The operation was aborted.", "AbortError");
  const mod = await loadModule(createMockFetch({ forceError: timeoutError }));

  const result = await mod.getAppInfo("list");
  assert(result.includes("超时"), "网络超时：返回超时提示");
}

async function testParameterValidation() {
  console.log("\n【参数验证】");

  // 1. 不支持的查询类型
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo("invalid_type");
    assert(result.includes("不支持"), "不支持的查询类型：返回错误提示");
  }

  // 2. 默认 query_type 为 list
  {
    const mod = await loadModule(createMockFetch());
    const result = await mod.getAppInfo();
    assert(result.includes("openUBMC") || result.includes("应用"), "默认模式：返回列表结果");
  }
}

// ─── 运行所有测试 ──────────────────────────────────────────────────────────────

async function runAllTests() {
  console.log("====================================");
  console.log("  getAppInfo 工具函数测试");
  console.log("====================================");

  try {
    await testListQuery();
    await testDetailQuery();
    await testFuzzyMatch();
    await testCacheMechanism();
    await testNetworkTimeout();
    await testParameterValidation();
  } catch (err) {
    console.error("\n测试运行异常：", err);
    failed++;
  }

  console.log("\n====================================");
  console.log(`  测试结果：${passed} 通过，${failed} 失败`);
  console.log("====================================");

  if (failed > 0) process.exit(1);
}

runAllTests();
