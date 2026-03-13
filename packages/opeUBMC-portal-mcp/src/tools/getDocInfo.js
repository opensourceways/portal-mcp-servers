/**
 * @created 2026-03-11 by sig-OpenDesign with Claude AI
 * @description openUBMC 文档中心查询工具，从本地 llms.txt 解析文档目录并支持关键词检索
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// 文件路径（相对于本文件向上两级到项目根，再进 data 目录）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LLMS_FILE = join(__dirname, "../../data/llms.txt");

// llms.txt 解析缓存（本地文件，永久缓存；可通过 _resetCache 清除）
let cachedParsed = null;

// 页面内容缓存（URL → { text, expiry }）
const pageCache = new Map();
const PAGE_CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 清除缓存（仅供测试使用）
export function _resetCache() {
  cachedParsed = null;
  pageCache.clear();
  searchApiCache.clear();
}

/**
 * 从 llms.txt 中解析结构：
 * {
 *   meta: { title, description, fullDocsUrl },
 *   sections: [{ name, entries: [{ title, url, lang }] }]
 * }
 */
function parseLlms(content) {
  const lines = content.split("\n");
  const sections = [];
  let currentSection = null;

  // 解析文件头部元数据（# 标题 + > 描述行）
  let title = "";
  let descLines = [];
  let fullDocsUrl = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (!title && line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }

    if (line.startsWith("> ")) {
      const text = line.slice(2).trim();
      if (text.startsWith("Full documentation")) {
        const urlMatch = text.match(/https?:\/\/\S+/);
        if (urlMatch) fullDocsUrl = urlMatch[0];
      } else {
        descLines.push(text);
      }
      continue;
    }

    if (line.startsWith("## ")) {
      currentSection = { name: line.slice(3).trim(), entries: [] };
      sections.push(currentSection);
      continue;
    }

    if (line.startsWith("- [") && currentSection) {
      const match = line.match(/^- \[(.+?)\]\((.+?)\)/);
      if (match) {
        const [, docTitle, url] = match;
        // 从 URL 路径中检测语言
        let lang = "other";
        if (url.includes("/zh/")) lang = "zh";
        else if (url.includes("/en/")) lang = "en";
        currentSection.entries.push({ title: docTitle, url, lang });
      }
    }
  }

  return {
    meta: { title, description: descLines.join(" "), fullDocsUrl },
    sections,
  };
}

/**
 * 获取解析后的文档数据（带内存缓存）
 */
function getDocData() {
  if (cachedParsed) return cachedParsed;

  let content;
  try {
    content = readFileSync(LLMS_FILE, "utf-8");
  } catch (e) {
    throw new Error(`无法读取文档文件：${e.message}`);
  }

  cachedParsed = parseLlms(content);
  return cachedParsed;
}

/**
 * 语言过滤
 */
function filterByLang(entries, lang) {
  if (!lang || lang === "all") return entries;
  return entries.filter((e) => e.lang === lang);
}

/**
 * 章节名过滤（大小写不敏感，支持部分匹配）
 */
function filterSections(sections, sectionKeyword) {
  if (!sectionKeyword) return sections;
  const lower = sectionKeyword.toLowerCase();
  return sections.filter((s) => s.name.toLowerCase().includes(lower));
}

/**
 * 关键词搜索（对 title + URL 进行大小写不敏感匹配）
 * 支持多个关键词（空格分隔，全部命中才算匹配）
 */
function searchEntries(sections, keyword, lang) {
  const keywords = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const results = [];

  for (const section of sections) {
    for (const entry of section.entries) {
      if (lang && lang !== "all" && entry.lang !== lang) continue;

      const haystack = `${entry.title} ${entry.url}`.toLowerCase();
      const matched = keywords.every((kw) => haystack.includes(kw));
      if (matched) {
        results.push({ section: section.name, ...entry });
      }
    }
  }

  return results;
}

/**
 * 格式化目录输出
 */
function formatToc(data, sectionKeyword, lang) {
  const { meta, sections } = data;
  const filteredSections = filterSections(sections, sectionKeyword);

  let totalDocs = 0;
  sections.forEach((s) => { totalDocs += s.entries.length; });

  let out = `=== openUBMC 文档中心目录 ===\n\n`;
  if (meta.title) out += `📖 **${meta.title}**\n`;
  if (meta.description) out += `${meta.description}\n`;
  if (meta.fullDocsUrl) out += `完整文档：${meta.fullDocsUrl}\n`;
  out += `\n共 ${sections.length} 个章节，${totalDocs} 篇文档\n`;

  if (sectionKeyword) {
    out += `🔍 筛选章节：包含 "${sectionKeyword}"\n`;
  }
  if (lang && lang !== "all") {
    out += `🌐 语言筛选：${lang === "zh" ? "中文" : "English"}\n`;
  }
  out += `\n`;

  if (filteredSections.length === 0) {
    out += `未找到匹配章节"${sectionKeyword}"，以下为所有章节：\n\n`;
    sections.forEach((s) => { out += `  • ${s.name}（${s.entries.length} 篇）\n`; });
    return out;
  }

  for (const section of filteredSections) {
    const entries = filterByLang(section.entries, lang);
    out += `### ${section.name}（${entries.length} 篇）\n\n`;
    entries.slice(0, 20).forEach((e, i) => {
      out += `  ${i + 1}. [${e.title}](${e.url})\n`;
    });
    if (entries.length > 20) {
      out += `  ... 还有 ${entries.length - 20} 篇，可用关键词搜索精确定位\n`;
    }
    out += `\n`;
  }

  out += `---\n💡 提示：可用 query_type="search" + keyword 参数搜索具体文档。\n`;
  out += `数据来源: openUBMC 文档中心 (llms.txt)\n`;
  return out;
}

/**
 * 格式化搜索结果输出
 */
function formatSearchResult(results, keyword, lang, totalSections) {
  const langLabel = !lang || lang === "all" ? "全部" : lang === "zh" ? "中文" : "English";

  let out = `=== openUBMC 文档搜索结果 ===\n\n`;
  out += `🔍 关键词：**${keyword}**\n`;
  out += `🌐 语言：${langLabel}\n`;
  out += `📊 命中：${results.length} 篇文档\n\n`;

  if (results.length === 0) {
    out += `未找到包含 "${keyword}" 的文档。\n\n`;
    out += `💡 建议：\n`;
    out += `  - 尝试更简短的关键词（如将"CSR配置字典"改为"CSR"）\n`;
    out += `  - 使用英文关键词同时搜索英文文档\n`;
    out += `  - 使用 query_type="toc" 浏览全部章节目录\n`;
    return out;
  }

  // 按章节分组
  const grouped = new Map();
  for (const item of results) {
    if (!grouped.has(item.section)) grouped.set(item.section, []);
    grouped.get(item.section).push(item);
  }

  const displayLimit = 30;
  let displayed = 0;

  for (const [sectionName, items] of grouped) {
    if (displayed >= displayLimit) break;
    out += `**${sectionName}**\n`;
    for (const item of items) {
      if (displayed >= displayLimit) break;
      const langTag = item.lang === "zh" ? "🇨🇳" : item.lang === "en" ? "🇬🇧" : "";
      out += `  ${langTag} [${item.title}](${item.url})\n`;
      displayed++;
    }
    out += `\n`;
  }

  if (results.length > displayLimit) {
    out += `... 共 ${results.length} 篇，仅显示前 ${displayLimit} 篇，建议细化关键词\n\n`;
  }

  out += `---\n`;
  out += `数据来源: openUBMC 文档中心 (llms.txt)\n`;
  out += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
  return out;
}

// 文档搜索 API
const SEARCH_API_URL = "https://www.openubmc.cn/api-search/search/docsng";

// API 搜索结果缓存（keyword+lang → { text, expiry }）
const searchApiCache = new Map();
const SEARCH_CACHE_DURATION = 5 * 60 * 1000; // 5分钟

/**
 * 调用文档搜索 API（本地索引无结果时的兜底）
 */
async function searchDocsByApi(keyword, lang) {
  const apiLang = lang === "en" ? "en" : "zh"; // "all" 时默认 zh
  const cacheKey = `${keyword}:${apiLang}`;

  const cached = searchApiCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.result;

  const response = await fetch(SEARCH_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, lang: apiLang, page: 1, pageSize: 10, type: "docs" }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`搜索 API 请求失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  // 兼容多种响应结构
  let items = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && Array.isArray(data.data)) {
    items = data.data;
  } else if (data && data.data && Array.isArray(data.data.list)) {
    items = data.data.list;
  } else if (data && data.data && Array.isArray(data.data.records)) {
    items = data.data.records;
  }

  const result = { items, apiLang };
  searchApiCache.set(cacheKey, { result, expiry: Date.now() + SEARCH_CACHE_DURATION });
  return result;
}

/**
 * 格式化 API 搜索结果
 */
function formatApiSearchResult(items, keyword, lang) {
  const langLabel = lang === "zh" ? "中文" : lang === "en" ? "English" : "中文（默认）";

  let out = `=== openUBMC 文档搜索结果（API）===\n\n`;
  out += `🔍 关键词：**${keyword}**\n`;
  out += `🌐 语言：${langLabel}\n`;
  out += `📊 命中：${items.length} 条\n`;
  out += `💡 本地索引未命中，已通过文档搜索 API 获取结果\n\n`;

  if (items.length === 0) {
    out += `未找到相关文档。\n\n`;
    out += `建议：\n`;
    out += `  - 尝试更简短或不同的关键词\n`;
    out += `  - 使用 query_type="toc" 浏览文档目录\n`;
    return out;
  }

  items.forEach((item, i) => {
    const title = item.title || item.name || item.textTitle || "（无标题）";
    const url = item.url || item.path || item.link || "";
    const desc = item.description || item.desc || item.textContent || item.content || "";
    const shortDesc = desc.length > 100 ? desc.slice(0, 100) + "…" : desc;

    out += `${i + 1}. **${title}**\n`;
    if (url) out += `   🔗 ${url}\n`;
    if (shortDesc) out += `   ${shortDesc}\n`;
    out += `\n`;
  });

  out += `---\n数据来源: openUBMC 文档搜索 API\n`;
  out += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
  return out;
}


function formatSectionOverview(sections, lang) {
  let totalDocs = 0;
  sections.forEach((s) => { totalDocs += filterByLang(s.entries, lang).length; });

  let out = `=== openUBMC 文档中心章节总览 ===\n\n`;
  out += `共 ${sections.length} 个章节`;
  if (lang && lang !== "all") {
    out += `（${lang === "zh" ? "中文" : "English"}）`;
  }
  out += `，${totalDocs} 篇文档\n\n`;

  sections.forEach((s, i) => {
    const entries = filterByLang(s.entries, lang);
    out += `  ${i + 1}. **${s.name}** — ${entries.length} 篇\n`;
  });

  out += `\n💡 使用 section 参数指定章节名称，可查看该章节下的文档列表。\n`;
  return out;
}

// ─── HTML 内容提取 ────────────────────────────────────────────────────────────

/**
 * 将 VitePress 页面 HTML 转换为可读 Markdown 文本。
 * 返回 { title, updateDate, gitcodeUrl, content }
 */
function extractDocContent(html) {
  // 1. 提取元数据
  const titleMatch = html.match(/class="doc-title"[^>]*>([\s\S]*?)<\/div>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  const updateMatch = html.match(/class="doc-update-date"[^>]*>([\s\S]*?)<\/div>/);
  const updateDate = updateMatch ? updateMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  const gitcodeMatch = html.match(/href="(https:\/\/gitcode\.com[^"]+\.md)"[^>]*>/);
  const gitcodeUrl = gitcodeMatch ? gitcodeMatch[1] : "";

  // 2. 定位主要内容区域（从 markdown-body docs-content 到 doc-footer）
  const contentStart = html.indexOf('class="markdown-body docs-content"');
  const footerIdx = html.indexOf('class="doc-footer"');
  let content = contentStart !== -1
    ? html.slice(contentStart, footerIdx !== -1 ? footerIdx : contentStart + 200000)
    : html;

  // 3. 先处理代码块（shiki 格式：每个 token 一个 span，需要特殊提取）
  //    结构：<span class="lang">shell</span><pre class="shiki..."><code>...</code></pre>
  const codeBlocks = [];

  content = content.replace(
    /(?:<span class="lang">([^<]*)<\/span>)?<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (_, lang, codeInner) => {
      const code = codeInner
        .replace(/<[^>]+>/g, "")
        .replace(/&gt;/g, ">").replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&").replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"').replace(/\u200B/g, "")
        .trim();
      const fenceLang = (lang || "").trim();
      const idx = codeBlocks.push({ lang: fenceLang, code }) - 1;
      return `\n{{CODE_BLOCK_${idx}}}\n`;
    }
  );

  // 4. 移除干扰元素
  content = content
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<button[^>]*>[\s\S]*?<\/button>/g, "")
    .replace(/<a\s[^>]*class="header-anchor"[^>]*>[\s\S]*?<\/a>/g, "");

  // 5. 转换告警/提示块（warning / note / tip / danger）
  //    结构：<div class="warning custom-block github-alert"><p class="custom-block-title">WARNING</p><p>...</p></div>
  const alertIcons = { warning: "⚠️", danger: "🚫", tip: "💡", note: "📝", info: "ℹ️" };
  content = content.replace(
    /<div class="(warning|danger|tip|note|info)[^"]*custom-block[^"]*">([\s\S]*?)<\/div>\s*(?=<(?!\/div))/g,
    (_, type, inner) => {
      const icon = alertIcons[type] || "📌";
      const text = inner
        .replace(/<p class="custom-block-title"[^>]*>[\s\S]*?<\/p>/g, "")
        .replace(/<[^>]+>/g, "").trim();
      return `\n> ${icon} ${text}\n`;
    }
  );

  // 6. 转换标题
  for (let i = 1; i <= 6; i++) {
    const prefix = "#".repeat(i);
    content = content.replace(
      new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, "gi"),
      (_, inner) => `\n${prefix} ${inner.replace(/<[^>]+>/g, "").replace(/\u200B/g, "").trim()}\n`
    );
  }

  // 7. 转换表格
  content = content.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, inner) => {
    const rows = [];
    let headerDone = false;
    for (const [, rowContent] of inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [];
      for (const [, cellContent] of rowContent.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
        cells.push(cellContent.replace(/<[^>]+>/g, "").trim());
      }
      rows.push(`| ${cells.join(" | ")} |`);
      if (!headerDone) {
        rows.push(`| ${cells.map(() => "---").join(" | ")} |`);
        headerDone = true;
      }
    }
    return `\n${rows.join("\n")}\n`;
  });

  // 8. 转换列表
  content = content
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) =>
      `\n- ${inner.replace(/<[^>]+>/g, "").trim()}`
    )
    .replace(/<\/?[uo]l[^>]*>/gi, "\n");

  // 9. 转换行内代码
  content = content.replace(
    /<code[^>]*>([\s\S]*?)<\/code>/gi,
    (_, inner) => `\`${inner.replace(/<[^>]+>/g, "")}\``
  );

  // 10. 转换链接（相对 URL 补全为绝对 URL）
  content = content.replace(
    /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => {
      const linkText = text.replace(/<[^>]+>/g, "").trim();
      if (!linkText) return "";
      if (/^https?:\/\//.test(href)) return `[${linkText}](${href})`;
      const abs = href.startsWith("/") ? `https://openubmc.cn${href}` : `https://openubmc.cn/${href}`;
      return `[${linkText}](${abs})`;
    }
  );

  // 11. 转换段落
  content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    return text ? `\n${text}\n` : "";
  });

  // 12. 水平分割线
  content = content.replace(/<hr[^>]*>/gi, "\n---\n");

  // 13. 去除剩余 HTML 标签
  content = content.replace(/<[^>]+>/g, "");

  // 14. 恢复代码块
  codeBlocks.forEach(({ lang, code }, idx) => {
    content = content.replace(`{{CODE_BLOCK_${idx}}}`, `\`\`\`${lang}\n${code}\n\`\`\``);
  });

  // 15. 解码 HTML 实体
  content = content
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#x200B;/g, "").replace(/&nbsp;/g, " ")
    .replace(/\u200B/g, "");

  // 16. 清理多余空行和尾部空白
  content = content.replace(/\n{4,}/g, "\n\n\n").trim();

  return { title, updateDate, gitcodeUrl, content };
}

/**
 * 拉取文档页面 HTML 并转换为可读文本（带缓存）
 */
async function fetchDocPage(url) {
  // 检查缓存
  const cached = pageCache.get(url);
  if (cached && Date.now() < cached.expiry) return cached.text;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "Accept": "text/html", "User-Agent": "openUBMC-MCP/1.0" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const { title, updateDate, gitcodeUrl, content } = extractDocContent(html);

  if (!content) {
    throw new Error("未能从页面提取到有效内容，页面结构可能已变更");
  }

  // 截断超长内容（保留前 8000 字符），避免输出过多
  const MAX_CONTENT = 8000;
  const truncated = content.length > MAX_CONTENT;
  const displayContent = truncated ? content.slice(0, MAX_CONTENT) : content;

  let text = `=== ${title || "openUBMC 文档"} ===\n\n`;
  if (updateDate) text += `📅 ${updateDate}\n`;
  if (gitcodeUrl) text += `🔗 源码：[在 Gitcode 查看](${gitcodeUrl})\n`;
  text += `🌐 文档链接：${url}\n\n`;
  text += `---\n\n`;
  text += displayContent;
  if (truncated) {
    text += `\n\n---\n⚠️ 内容已截断（原文 ${content.length} 字符，显示前 ${MAX_CONTENT} 字符）。如需更多内容，请访问文档链接。`;
  }
  text += `\n\n---\n数据来源: openUBMC 文档中心\n查询时间: ${new Date().toLocaleString("zh-CN")}`;

  // 写入缓存
  pageCache.set(url, { text, expiry: Date.now() + PAGE_CACHE_DURATION });
  return text;
}

/**
 * 在文档索引中找与 keyword 最匹配的一篇文档的 URL
 */
function findBestDocUrl(sections, keyword, lang) {
  const results = searchEntries(sections, keyword, lang);
  if (results.length > 0) return results[0].url;
  // 退而求其次：只用第一个关键词搜
  const firstKw = keyword.split(/\s+/)[0];
  if (firstKw && firstKw !== keyword) {
    const r2 = searchEntries(sections, firstKw, lang);
    if (r2.length > 0) return r2[0].url;
  }
  return null;
}

// ─── 主查询函数 ───────────────────────────────────────────────────────────────

/**
 * 主查询函数
 * @param {string} queryType - "sections" | "toc" | "search" | "fetch"
 * @param {string} keyword   - 搜索关键词（search/fetch 模式使用）
 * @param {string} section   - 章节名过滤（toc/search 模式使用）
 * @param {string} lang      - 语言过滤："zh" | "en" | "all"
 * @param {string} url       - 文档直接 URL（fetch 模式优先使用）
 */
export async function getDocInfo(queryType = "toc", keyword = "", section = "", lang = "all", url = "") {
  try {
    // ===== 文档内容抓取 =====
    if (queryType === "fetch") {
      // 优先使用直接传入的 url
      let targetUrl = url.trim();

      // 没有 url 时，用 keyword 从索引中找最匹配的文档
      if (!targetUrl) {
        if (!keyword.trim()) {
          return `fetch 模式必须提供 url 参数（文档页面地址），或提供 keyword 参数以自动搜索最匹配的文档。`;
        }
        const data = getDocData();
        targetUrl = findBestDocUrl(data.sections, keyword, lang);
        if (!targetUrl) {
          return `未在文档索引中找到与 "${keyword}" 匹配的文档，请先用 query_type="search" 查找文档链接，再传入 url 参数。`;
        }
      }

      // 安全校验：只允许访问 openubmc.cn 域名
      if (!/^https?:\/\/([a-z0-9-]+\.)*openubmc\.cn\//i.test(targetUrl)) {
        return `仅支持访问 openubmc.cn 域名下的文档页面。`;
      }

      try {
        return await fetchDocPage(targetUrl);
      } catch (e) {
        if (e.name === "AbortError") return `文档页面请求超时（15s），请稍后重试：${targetUrl}`;
        return `获取文档内容失败：${e.message}\n文档地址：${targetUrl}`;
      }
    }

    const data = getDocData();

    // ===== 章节总览 =====
    if (queryType === "sections") {
      return formatSectionOverview(data.sections, lang);
    }

    // ===== 目录查询 =====
    if (queryType === "toc") {
      return formatToc(data, section, lang);
    }

    // ===== 关键词搜索 =====
    if (queryType === "search") {
      if (!keyword.trim()) {
        return `搜索时必须提供 keyword 参数。\n\n💡 使用 query_type="toc" 可浏览文档目录；使用 query_type="sections" 可查看章节列表。`;
      }
      const results = searchEntries(data.sections, keyword, lang);

      // 本地索引有结果，直接返回
      if (results.length > 0) {
        return formatSearchResult(results, keyword, lang, data.sections.length);
      }

      // 本地索引无结果 → 调用文档搜索 API 兜底
      try {
        const { items, apiLang } = await searchDocsByApi(keyword, lang);
        return formatApiSearchResult(items, keyword, apiLang);
      } catch (e) {
        if (e.name === "AbortError") {
          return `本地索引未找到相关文档，且文档搜索 API 请求超时。\n建议：使用 query_type="toc" 浏览文档目录。`;
        }
        // API 失败时仍返回本地的空结果提示
        return formatSearchResult(results, keyword, lang, data.sections.length);
      }
    }

    return `不支持的查询类型 "${queryType}"，请使用 "sections"、"toc"、"search" 或 "fetch"。`;
  } catch (e) {
    return `查询文档信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_doc_info",
  description: `查询 openUBMC 文档中心的文档目录和内容，支持目录浏览、章节筛选、关键词搜索，以及直接抓取文档页面的完整内容。

文档来源于 openUBMC 文档中心的 llms.txt 索引文件，涵盖快速入门、架构设计、开发指南、API 参考、测试指南、工具指南、技术规范、FAQ 等章节。

**查询模式：**

1. 章节列表：query_type = "sections"
   - 列出所有章节名称及各章节的文档数量

2. 目录浏览：query_type = "toc"（默认）
   - 浏览文档目录，展示各章节下的文档列表（附文档链接）
   - 可通过 section 参数筛选特定章节（支持部分名称匹配）
   - 可通过 lang 参数筛选中文（zh）或英文（en）文档

3. 关键词搜索：query_type = "search"
   - 按关键词搜索文档标题和 URL，返回匹配文档及链接
   - 支持多关键词（空格分隔，所有关键词均需命中）

4. 文档内容抓取：query_type = "fetch"
   - 抓取指定文档页面的完整内容并转换为 Markdown 格式
   - 提供 url 参数（优先）：直接抓取指定 URL 的文档
   - 或提供 keyword 参数：自动搜索最匹配的文档并抓取
   - 返回文档正文、代码块、表格、警告框等结构化内容
   - 页面内容缓存 15 分钟
   - 典型用法：先用 search 找到文档链接，再用 fetch+url 获取正文

**语言说明：**
- lang = "zh"：仅返回中文文档（toc/search 模式）
- lang = "en"：仅返回英文文档
- lang = "all"（默认）：返回所有语言文档

**使用场景：**
- 查询 openUBMC 有哪些文档章节
- 查找 BMC Studio、Redfish、ORM、CSR 等主题的相关文档
- 查看某篇文档的具体内容（步骤、命令、配置说明等）
- 查找 IPMI 命令、API 接口的参考文档

**示例问题：**
- "openUBMC 文档中心有哪些章节？"
- "查找关于 BMC Studio 的文档"
- "openUBMC 如何构建 BMC？"（→ 搜索+抓取）
- "快速入门章节有哪些文档？"
- "ORM 怎么使用？查看文档内容"
- "CSR配置字典有哪些类？"`,
  inputSchema: {
    type: "object",
    properties: {
      query_type: {
        type: "string",
        enum: ["sections", "toc", "search", "fetch"],
        description: "查询类型：'sections'（章节列表）、'toc'（目录浏览，默认）、'search'（关键词搜索）、'fetch'（抓取文档正文内容）。",
        default: "toc",
      },
      keyword: {
        type: "string",
        description: "关键词（search 模式必需；fetch 模式在未提供 url 时使用，自动匹配最相关文档）。支持中英文，多个关键词用空格分隔。",
      },
      url: {
        type: "string",
        description: "文档页面 URL（fetch 模式专用，优先级高于 keyword）。必须是 openubmc.cn 域名下的文档链接，如 'https://openubmc.cn/docs/zh/development/quick_start/build_your_own_bmc.html'。",
      },
      section: {
        type: "string",
        description: "章节名称过滤（toc/search 模式可选）。支持部分匹配，如 'API'、'FAQ'、'快速入门'。",
      },
      lang: {
        type: "string",
        enum: ["zh", "en", "all"],
        description: "语言筛选（toc/search 模式）：'zh'（仅中文）、'en'（仅英文）、'all'（全部，默认）。",
        default: "all",
      },
    },
  },
};
