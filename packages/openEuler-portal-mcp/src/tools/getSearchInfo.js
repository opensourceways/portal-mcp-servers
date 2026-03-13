/**
 * @created 2026-03-03 by sig-OpenDesign with Claude AI
 * @description openEuler 门户全站搜索工具，作为其他查询工具的兜底查询
 */

// 数据源 URL
const SEARCH_URL = "https://www.openeuler.openatom.cn/api-search/search/docsng";
const PORTAL_BASE_URL = "https://www.openeuler.openatom.cn";

// 固定参数
const PAGE = 1;
const PAGE_SIZE = 12;

// 缓存配置
const searchCache = new Map(); // key: `${keyword}__${lang}`
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 结果类型标签
const TYPE_LABELS = {
  blog: "博客文章",
  issue: "Issue",
  gitcode: "代码仓库",
  etherpad: "会议文档",
  sig: "SIG 组",
  docs: "文档",
  news: "新闻",
};

// 提取第一个完整 JSON 对象（API 有时会返回拼接的多个 JSON）
function extractFirstJson(text) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { if (inString) escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === "{" || char === "[") depth++;
      else if (char === "}" || char === "]") {
        if (--depth === 0) return text.substring(0, i + 1);
      }
    }
  }
  return text;
}

// 清理 HTML 标签（包括高亮 span）
function stripHtml(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

// 构建结果项的访问链接
function buildUrl(record) {
  if (!record.path) return null;
  if (record.path.startsWith("http")) return record.path;
  // 相对路径：拼接门户基础 URL
  const path = record.path.startsWith("/") ? record.path : `/${record.path}`;
  return `${PORTAL_BASE_URL}${path}`;
}

// 搜索门户内容（带缓存）
async function fetchSearchResults(keyword, lang) {
  const cacheKey = `${keyword.toLowerCase()}__${lang}`;
  const now = Date.now();
  const cached = searchCache.get(cacheKey);
  if (cached && now < cached.expiry) return cached.data;

  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, page: PAGE, pageSize: PAGE_SIZE, lang }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败：HTTP ${response.status}`);
  }

  const text = await response.text();
  const data = JSON.parse(extractFirstJson(text));

  if (data.status !== 200 || !data.obj) {
    return { records: [] };
  }

  const result = { records: Array.isArray(data.obj.records) ? data.obj.records : [] };
  searchCache.set(cacheKey, { data: result, expiry: now + CACHE_DURATION });
  return result;
}

// 主查询函数
export async function getSearchInfo(keyword = "", lang = "zh") {
  try {
    if (!keyword || !keyword.trim()) {
      return "请提供搜索关键词。";
    }

    const result = await fetchSearchResults(keyword.trim(), lang);
    const records = result.records;
    const langLabel = lang === "en" ? "英文" : "中文";

    if (records.length === 0) {
      let output = `=== openEuler 门户搜索 ===\n\n`;
      output += `关键词：${keyword}（${langLabel}）\n\n`;
      output += `未在 openEuler 门户中找到与 "${keyword}" 相关的内容。\n`;
      output += `\n💡 提示：可以尝试更换关键词，或使用以下专项工具：\n`;
      output += `   - get_docs_search_content：搜索 openEuler 技术文档\n`;
      output += `   - get_cve_info：查询安全漏洞信息\n`;
      output += `   - get_sig_info：查询 SIG 组信息\n`;
      return output;
    }

    let output = `=== openEuler 门户搜索结果 ===\n\n`;
    output += `关键词：${keyword}（${langLabel}）\n`;
    output += `共返回 ${records.length} 条结果\n\n`;
    output += `---\n\n`;

    records.forEach((record, i) => {
      const title = stripHtml(record.title) || "（无标题）";
      const typeLabel = TYPE_LABELS[record.type] || record.type || "内容";
      const url = buildUrl(record);
      const tags = record.tags && record.tags.length > 0 ? record.tags.join("、") : null;

      output += `**${i + 1}. ${title}**\n`;
      output += `   类型：${typeLabel}\n`;

      if (record.textContent) {
        const excerpt = stripHtml(record.textContent);
        const trimmed = excerpt.length > 120 ? excerpt.substring(0, 120) + "..." : excerpt;
        output += `   摘要：${trimmed}\n`;
      }

      if (record.date) output += `   日期：${record.date}\n`;
      if (tags) output += `   标签：${tags}\n`;
      if (record.author && record.author.length > 0) {
        output += `   作者：${record.author.join("、")}\n`;
      }
      if (url) output += `   链接：${url}\n`;

      output += "\n";
    });

    output += `---\n`;
    output += `数据来源: openEuler 门户全站搜索\n`;
    output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;

    return output;
  } catch (e) {
    if (e.name === "AbortError") {
      return "网络请求超时，请稍后重试。";
    }
    return `门户搜索时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_search_info",
  description: `搜索 openEuler 门户网站全站内容，作为其他专项工具都不适用或未查到结果时的兜底查询。

本工具通过 openEuler 门户全站搜索引擎，覆盖博客、Issue、代码仓库、SIG 组页面、会议文档等多种类型内容。

**适合使用本工具的场景：**
- 其他专项工具（CVE 查询、SIG 查询、文档搜索等）均未找到相关结果时
- 问题涉及多个领域，不确定用哪个专项工具时
- 搜索 openEuler 博客文章、新闻资讯
- 搜索社区 Issue、代码提交记录
- 搜索 SIG 组相关内容
- 搜索会议记录（etherpad 文档）
- 泛化问题：如"openEuler 有哪些关于 XXX 的内容？"

**不推荐使用本工具的场景（请优先使用专项工具）：**
- 查询 CVE 漏洞 → 使用 get_cve_info
- 查询 SIG 详细信息 → 使用 get_sig_info
- 查询安全/缺陷公告 → 使用 get_security_notice_info / get_bug_notice_info
- 搜索技术文档（含版本）→ 使用 get_docs_search_content
- 查询软件包 → 使用 get_package_info
- 查询下载镜像 → 使用 get_download_info

**参数说明：**
- keyword: 搜索关键词（必填），支持中英文，可以是单个词或短语
- lang: 搜索语言，根据用户提问语言选择；"zh"（中文，默认）或 "en"（英文）

**返回信息：**
- 搜索结果列表（最多 12 条）
- 每条结果的类型（博客文章/Issue/代码仓库/SIG 组/会议文档等）
- 标题、内容摘要（最多 120 字符）、日期、标签、作者
- 结果访问链接

**示例问题：**
- "openEuler 社区有关于容器的博客吗？"
- "openEuler 和 RISC-V 相关的内容有哪些？"
- "搜索 openEuler 门户中关于 DPU 的内容"
- "有没有关于 openEuler 虚拟化的文章？"
- "What content does openEuler have about containers?"`,
  inputSchema: {
    type: "object",
    required: ["keyword"],
    properties: {
      keyword: {
        type: "string",
        description: "搜索关键词（必填），支持中英文。可以是技术词汇、项目名称、功能描述等，例如：'容器'、'DPU'、'RISC-V'、'virtualization'。",
      },
      lang: {
        type: "string",
        enum: ["zh", "en"],
        description: "搜索语言：'zh'（中文，默认）或 'en'（英文）。根据用户提问所用语言自动选择。",
        default: "zh",
      },
    },
  },
};
