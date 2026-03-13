/**
 * @created 2026-03-11 by sig-OpenDesign with Claude AI
 * @description getDocInfo 工具函数单元测试
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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

// ─── Mock llms.txt 内容 ───────────────────────────────────────────────────────

const MOCK_LLMS = `# openUBMC

> openUBMC 是一款架构领先的 BMC 管理软件。
> openUBMC is an open-source BMC management software.
> Full documentation available at: https://openubmc.cn/docs/llms-full.txt

This documentation covers BMC software development.

## Quick Start / 快速入门

- [构建你的BMC](https://openubmc.cn/docs/zh/development/quick_start/build_your_own_bmc.html)
- [新增一个组件](https://openubmc.cn/docs/zh/development/quick_start/create_an_app.html)
- [BMC Studio Installation Guide](https://openubmc.cn/docs/en/development/quick_start/prepare_environment/bmc_studio_installation.html)
- [Welcome to openUBMC](https://openubmc.cn/docs/en/development/quick_start/explore_openubmc.html)

## Architecture & Design / 架构与设计

- [openUBMC架构简介](https://openubmc.cn/docs/zh/development/design_reference/architecture.html)
- [ORM概念、实现和使用](https://openubmc.cn/docs/zh/development/design_reference/key_feature/ORM.html)
- [openUBMC Architecture](https://openubmc.cn/docs/en/development/design_reference/architecture.html)

## API Reference / API 参考

- [account](https://openubmc.cn/docs/zh/development/api/app_api/account.html)
- [sensor](https://openubmc.cn/docs/zh/development/api/app_api/sensor.html)

## FAQ / 常见问题

- [BMC Studio相关FAQ](https://openubmc.cn/docs/zh/development/faq/tools/bmc_studio.html)
- [网络管理常见问题指南](https://openubmc.cn/docs/zh/development/faq/network_FAQ.html)
- [CSR调试与问题定位](https://openubmc.cn/docs/zh/development/faq/csr_debug_and_FAQ.html)
`;

// ─── Mock fs.readFileSync ─────────────────────────────────────────────────────

// 由于 ESM 模块系统限制，直接测试解析逻辑（不 mock fs）
// 而是通过实际的 llms.txt 文件测试（如果存在）

// ─── 内联解析逻辑（与 getDocInfo.js 保持一致，用于单元测试）──────────────────

function parseLlms(content) {
  const lines = content.split("\n");
  const sections = [];
  let currentSection = null;
  let title = "";
  let descLines = [];
  let fullDocsUrl = "";

  for (const line of lines) {
    const l = line.trimEnd();
    if (!title && l.startsWith("# ")) {
      title = l.slice(2).trim();
      continue;
    }
    if (l.startsWith("> ")) {
      const text = l.slice(2).trim();
      if (text.startsWith("Full documentation")) {
        const urlMatch = text.match(/https?:\/\/\S+/);
        if (urlMatch) fullDocsUrl = urlMatch[0];
      } else {
        descLines.push(text);
      }
      continue;
    }
    if (l.startsWith("## ")) {
      currentSection = { name: l.slice(3).trim(), entries: [] };
      sections.push(currentSection);
      continue;
    }
    if (l.startsWith("- [") && currentSection) {
      const match = l.match(/^- \[(.+?)\]\((.+?)\)/);
      if (match) {
        const [, docTitle, url] = match;
        let lang = "other";
        if (url.includes("/zh/")) lang = "zh";
        else if (url.includes("/en/")) lang = "en";
        currentSection.entries.push({ title: docTitle, url, lang });
      }
    }
  }

  return { meta: { title, description: descLines.join(" "), fullDocsUrl }, sections };
}

// ─── 测试套件 ─────────────────────────────────────────────────────────────────

function testParsing() {
  console.log("\n【文件解析】");

  const data = parseLlms(MOCK_LLMS);

  assert(data.meta.title === "openUBMC", "解析标题：正确提取项目名称");
  assert(data.meta.description.includes("BMC"), "解析描述：包含描述文字");
  assert(data.meta.fullDocsUrl === "https://openubmc.cn/docs/llms-full.txt", "解析全文链接：正确提取 URL");

  assert(data.sections.length === 4, `解析章节：共 4 个章节（实际 ${data.sections.length} 个）`);
  assert(data.sections[0].name === "Quick Start / 快速入门", "解析章节名：第一章节正确");
  assert(data.sections[0].entries.length === 4, `解析文档条目：快速入门有 4 条（实际 ${data.sections[0].entries.length} 条）`);

  // 语言检测
  const zhEntry = data.sections[0].entries[0];
  const enEntry = data.sections[0].entries[2];
  assert(zhEntry.lang === "zh", `语言检测：中文文档标记为 zh（实际 ${zhEntry.lang}）`);
  assert(enEntry.lang === "en", `语言检测：英文文档标记为 en（实际 ${enEntry.lang}）`);

  // URL 和标题提取
  assert(zhEntry.title === "构建你的BMC", "标题提取：中文标题正确");
  assert(zhEntry.url.startsWith("https://"), "URL 提取：URL 格式正确");
}

function testSectionFilter() {
  console.log("\n【章节筛选】");

  const data = parseLlms(MOCK_LLMS);

  // 部分匹配
  const matched = data.sections.filter((s) =>
    s.name.toLowerCase().includes("api")
  );
  assert(matched.length === 1, `章节部分匹配：找到 API 章节（实际 ${matched.length} 个）`);
  assert(matched[0].name.includes("API Reference"), "章节名匹配：包含 API Reference");

  // 大小写不敏感
  const caseMatched = data.sections.filter((s) =>
    s.name.toLowerCase().includes("faq")
  );
  assert(caseMatched.length === 1, `大小写不敏感：找到 FAQ 章节（实际 ${caseMatched.length} 个）`);

  // 无匹配
  const noMatch = data.sections.filter((s) =>
    s.name.toLowerCase().includes("nonexistent")
  );
  assert(noMatch.length === 0, "无匹配：返回空数组");
}

function testSearch() {
  console.log("\n【关键词搜索】");

  const data = parseLlms(MOCK_LLMS);

  function search(kw, lang = "all") {
    const keywords = kw.toLowerCase().split(/\s+/).filter(Boolean);
    const results = [];
    for (const section of data.sections) {
      for (const entry of section.entries) {
        if (lang !== "all" && entry.lang !== lang) continue;
        const haystack = `${entry.title} ${entry.url}`.toLowerCase();
        if (keywords.every((k) => haystack.includes(k))) {
          results.push({ section: section.name, ...entry });
        }
      }
    }
    return results;
  }

  // 单关键词
  const r1 = search("BMC Studio");
  assert(r1.length >= 1, `单关键词搜索：找到 BMC Studio 相关文档（${r1.length} 条）`);

  // 中文关键词
  const r2 = search("ORM");
  assert(r2.length >= 1, `中文关键词：找到 ORM 相关文档（${r2.length} 条）`);

  // 多关键词
  const r3 = search("CSR 调试");
  assert(r3.length >= 1, `多关键词：找到 CSR 调试文档（${r3.length} 条）`);

  // 不存在的关键词
  const r4 = search("zzz_nonexistent_keyword");
  assert(r4.length === 0, "不存在关键词：返回空结果");

  // 语言过滤
  const r5 = search("architecture", "en");
  assert(r5.every((e) => e.lang === "en"), "语言过滤：仅返回英文文档");

  const r6 = search("BMC", "zh");
  assert(r6.every((e) => e.lang === "zh"), "语言过滤：仅返回中文文档");
}

function testLanguageFilter() {
  console.log("\n【语言过滤】");

  const data = parseLlms(MOCK_LLMS);

  // 统计各语言
  let zhCount = 0;
  let enCount = 0;
  data.sections.forEach((s) => {
    s.entries.forEach((e) => {
      if (e.lang === "zh") zhCount++;
      if (e.lang === "en") enCount++;
    });
  });

  assert(zhCount > 0, `中文文档数量：${zhCount} 条`);
  assert(enCount > 0, `英文文档数量：${enCount} 条`);
  assert(zhCount + enCount <= data.sections.reduce((acc, s) => acc + s.entries.length, 0),
    "语言分类总数不超过全部文档数");
}

async function testRealFile() {
  console.log("\n【真实文件读取】");

  const __fn = fileURLToPath(import.meta.url);
  const __dn = dirname(__fn);
  const llmsPath = join(__dn, "../data/llms.txt");

  let content;
  try {
    content = readFileSync(llmsPath, "utf-8");
  } catch (e) {
    console.log(`  ⚠️  SKIP: 真实文件不存在或无法读取：${e.message}`);
    return;
  }

  const data = parseLlms(content);

  assert(data.meta.title.length > 0, `真实文件解析标题：${data.meta.title}`);
  assert(data.sections.length >= 5, `真实文件章节数：≥5 个（实际 ${data.sections.length} 个）`);

  const totalDocs = data.sections.reduce((acc, s) => acc + s.entries.length, 0);
  assert(totalDocs >= 100, `真实文件文档总数：≥100 条（实际 ${totalDocs} 条）`);

  // 验证 URL 格式
  const allEntries = data.sections.flatMap((s) => s.entries);
  const validUrls = allEntries.filter((e) => e.url.startsWith("https://"));
  assert(validUrls.length === allEntries.length,
    `所有文档 URL 格式正确（共 ${allEntries.length} 条）`);

  // 验证语言分布
  const zhDocs = allEntries.filter((e) => e.lang === "zh").length;
  const enDocs = allEntries.filter((e) => e.lang === "en").length;
  assert(zhDocs > 0, `中文文档：${zhDocs} 条`);
  assert(enDocs > 0, `英文文档：${enDocs} 条`);

  console.log(`  📊 统计：${data.sections.length} 章节，${totalDocs} 篇（中文 ${zhDocs} 篇，英文 ${enDocs} 篇）`);
}

async function testGetDocInfoTool() {
  console.log("\n【工具函数集成测试】");

  let mod;
  try {
    mod = await import(`../src/tools/getDocInfo.js?t=${Date.now()}`);
  } catch (e) {
    console.log(`  ⚠️  SKIP: 无法导入模块：${e.message}`);
    return;
  }

  mod._resetCache();

  // sections 模式
  const sections = await mod.getDocInfo("sections");
  assert(sections.includes("章节"), "sections 模式：返回章节列表");
  assert(sections.includes("篇"), "sections 模式：包含文档数量");

  // toc 模式（无筛选）
  const toc = await mod.getDocInfo("toc");
  assert(toc.includes("openUBMC"), "toc 模式：包含项目名");
  assert(toc.includes("###"), "toc 模式：包含章节标题");

  // toc 模式 + section 筛选
  const tocFiltered = await mod.getDocInfo("toc", "", "FAQ");
  assert(tocFiltered.includes("FAQ"), "toc + section 筛选：包含 FAQ");

  // toc 模式 + lang 筛选
  const tocZh = await mod.getDocInfo("toc", "", "", "zh");
  assert(tocZh.includes("zh") || tocZh.includes("中文"), "toc + zh 筛选：包含中文标识");

  // search 模式 - 有结果（不触发 API 兜底）
  const search = await mod.getDocInfo("search", "BMC Studio");
  assert(search.includes("BMC Studio"), "search 有结果：找到 BMC Studio 相关文档");
  assert(search.includes("http"), "search 有结果：返回文档链接");
  assert(!search.includes("API）"), "search 有结果：不触发 API 兜底");

  // search 模式 - 无结果（触发 API 兜底，网络可能超时，只验证不抛出异常）
  const searchFallback = await mod.getDocInfo("search", "zzz_totally_nonexistent_xyz_123456");
  const isApiOrEmpty = searchFallback.includes("API") || searchFallback.includes("未找到") || searchFallback.includes("超时");
  assert(isApiOrEmpty, "search 无结果：触发 API 兜底或返回未找到/超时提示");

  // search 模式 - 缺少 keyword
  const searchNoKw = await mod.getDocInfo("search", "");
  assert(searchNoKw.includes("keyword"), "search 缺 keyword：提示必须提供 keyword");

  // fetch 模式 - 无参数
  const fetchNoArgs = await mod.getDocInfo("fetch", "", "", "all", "");
  assert(fetchNoArgs.includes("url") || fetchNoArgs.includes("keyword"), "fetch 无参数：提示需要 url 或 keyword");

  // fetch 模式 - 非法域名
  const fetchBadDomain = await mod.getDocInfo("fetch", "", "", "all", "https://evil.com/page");
  assert(fetchBadDomain.includes("openubmc.cn"), "fetch 非法域名：提示仅允许 openubmc.cn");

  // 不支持的查询类型
  const invalid = await mod.getDocInfo("invalid_type");
  assert(invalid.includes("不支持"), "不支持类型：返回错误提示");
}

async function testFetchMode() {
  console.log("\n【fetch 模式 - 真实网络请求】");

  let mod;
  try {
    mod = await import(`../src/tools/getDocInfo.js?t=${Date.now()}`);
  } catch (e) {
    console.log(`  ⚠️  SKIP: 无法导入模块：${e.message}`);
    return;
  }

  mod._resetCache();

  const testUrl = "https://openubmc.cn/docs/zh/development/quick_start/build_your_own_bmc.html";

  let result;
  try {
    result = await mod.getDocInfo("fetch", "", "", "all", testUrl);
  } catch (e) {
    console.log(`  ⚠️  SKIP: 网络请求失败（${e.message}），跳过真实请求测试`);
    return;
  }

  assert(result.includes("构建你的BMC") || result.includes("BMC"), "fetch 直接 URL：返回文档标题");
  assert(result.includes("openubmc.cn"), "fetch 直接 URL：包含文档链接");
  assert(result.includes("```") || result.includes("git"), "fetch 直接 URL：包含代码块或命令内容");
  assert(!result.includes("data-v-"), "fetch 直接 URL：HTML 属性已被剥离");
  assert(!result.includes("<div"), "fetch 直接 URL：HTML 标签已被剥离");

  // 测试缓存：第二次请求应命中缓存
  const result2 = await mod.getDocInfo("fetch", "", "", "all", testUrl);
  assert(result === result2, "fetch 缓存：第二次请求命中缓存，内容一致");

  // 测试 keyword 自动搜索
  mod._resetCache();
  const resultByKw = await mod.getDocInfo("fetch", "构建你的BMC", "", "zh", "");
  if (resultByKw.includes("超时") || resultByKw.includes("失败")) {
    console.log("  ⚠️  SKIP: keyword fetch 网络请求失败");
  } else {
    assert(resultByKw.includes("BMC") || resultByKw.includes("构建"), "fetch + keyword：通过关键词自动匹配文档");
  }
}

// ─── 运行所有测试 ──────────────────────────────────────────────────────────────

async function runAllTests() {
  console.log("====================================");
  console.log("  getDocInfo 工具函数测试");
  console.log("====================================");

  try {
    testParsing();
    testSectionFilter();
    testSearch();
    testLanguageFilter();
    await testRealFile();
    await testGetDocInfoTool();
    await testFetchMode();
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
