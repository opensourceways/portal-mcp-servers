// 数据源 URL
const SHOWCASE_URL = "https://www.openeuler.openatom.cn/api-search/search/sort/showcase";

// 提取文本中第一个完整 JSON 对象
// API 存在返回多个拼接 JSON 的问题，需只取第一个
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

// 固定参数
const PAGE = 1;
const PAGE_SIZE = 100; // API 最大支持 pageSize=100，超过则返回失败
const CATEGORY = "showcase";

// 有效的行业分类列表
const VALID_INDUSTRIES = ["金融", "运营商", "能源", "物流", "高校&科研", "云计算", "其他"];

// 缓存（按 lang + keyword + industry 作为缓存 key）
const cache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 查询用户案例
async function fetchShowcase(keyword = "", lang = "zh", industry = "") {
  const cacheKey = `${lang}-${keyword}-${industry}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && now < cached.expiry) {
    return cached.data;
  }

  const body = {
    page: PAGE,
    pageSize: PAGE_SIZE,
    keyword,
    lang,
    category: CATEGORY,
  };

  if (industry) {
    body.industry = industry;
  }

  const response = await fetch(SHOWCASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败：HTTP ${response.status}`);
  }

  const text = await response.text();
  const data = JSON.parse(extractFirstJson(text));

  if (data.status && data.status !== 200) {
    throw new Error(`API 查询失败：${data.msg || "未知错误"}`);
  }

  cache.set(cacheKey, { data, expiry: now + CACHE_DURATION });
  return data;
}

// 格式化单个用户案例
function formatShowcaseItem(item, index) {
  // 兼容多种字段命名
  const title = item.title || item.name || item.articleName || item.subject || "未知案例";
  const company = item.company || item.enterprise || item.author || item.username || "";
  const industryLabel = item.industry || item.tag || item.category || "";
  const summary = item.summary || item.description || item.content || item.abstract || "";
  const link = item.path || item.url || item.link || "";
  const tags = Array.isArray(item.tags) ? item.tags.join("、") : (item.tags || "");

  let output = `${index + 1}. **${title}**\n`;

  if (company) {
    output += `   单位: ${company}\n`;
  }

  if (industryLabel) {
    output += `   行业: ${industryLabel}\n`;
  }

  if (tags && tags !== industryLabel) {
    output += `   标签: ${tags}\n`;
  }

  if (summary) {
    const truncated = summary.length > 120 ? summary.substring(0, 120) + "..." : summary;
    output += `   摘要: ${truncated}\n`;
  }

  if (link) {
    const fullLink = link.startsWith("http") ? link : `https://www.openeuler.openatom.cn/${link}`;
    output += `   链接: ${fullLink}\n`;
  }

  return output;
}

// 主查询函数
export async function getShowcaseInfo(keyword = "", lang = "zh", industry = "") {
  try {
    // 验证 lang 参数
    const validLang = lang === "en" ? "en" : "zh";

    // 验证 industry 参数
    let validIndustry = "";
    if (industry) {
      const matched = VALID_INDUSTRIES.find(
        v => v === industry || v.toLowerCase() === industry.toLowerCase()
      );
      if (!matched) {
        return `不支持的行业分类：${industry}。\n支持的行业：${VALID_INDUSTRIES.join("、")}`;
      }
      validIndustry = matched;
    }

    const data = await fetchShowcase(keyword, validLang, validIndustry);

    // 兼容多种响应格式
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data && data.obj && Array.isArray(data.obj.records)) {
      items = data.obj.records;
    } else if (data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data && Array.isArray(data.result)) {
      items = data.result;
    } else if (data && data.data && Array.isArray(data.data.records)) {
      items = data.data.records;
    } else if (data && Array.isArray(data.records)) {
      items = data.records;
    }

    const total = (data.obj && data.obj.count) || items.length;

    // 构建查询条件说明
    const conditions = [];
    if (keyword) conditions.push(`关键词：${keyword}`);
    if (validIndustry) conditions.push(`行业：${validIndustry}`);
    if (validLang !== "zh") conditions.push(`语言：英文`);

    let output = `=== openEuler 用户案例查询 ===\n\n`;

    if (conditions.length > 0) {
      output += `查询条件：${conditions.join("，")}\n`;
    }

    if (total === 0) {
      output += `\n未找到符合条件的用户案例。\n`;
      if (keyword || validIndustry) {
        output += `\n💡 提示：可以尝试减少筛选条件，或更换关键词。\n`;
        output += `可用行业：${VALID_INDUSTRIES.join("、")}\n`;
      }
      return output;
    }

    // 最多显示 20 条
    const displayItems = items.slice(0, 20);
    output += `共找到 ${total} 个用户案例，显示前 ${displayItems.length} 条\n\n`;
    output += `---\n\n`;

    displayItems.forEach((item, index) => {
      output += formatShowcaseItem(item, index);
      output += "\n";
    });

    if (total > 20) {
      output += `⚠️ 共 ${total} 个案例，仅显示前 20 条。建议添加关键词或行业筛选以缩小范围。\n\n`;
    }

    output += `---\n`;
    output += `数据来源: openEuler 官网用户案例\n`;
    output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;

    return output;
  } catch (e) {
    if (e.name === "AbortError") {
      return "网络请求超时，请稍后重试。";
    }
    return `查询用户案例时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_showcase_info",
  description: `查询 openEuler 社区用户案例信息。

本工具用于搜索和浏览 openEuler 在各行业的用户案例，了解 openEuler 在实际生产环境中的应用情况。

**使用场景：**
- 查询 openEuler 在某个行业的应用案例（如金融、运营商、能源等）
- 搜索某个企业使用 openEuler 的案例（如工商银行、华为）
- 浏览 openEuler 的全部用户案例
- 了解 openEuler 在特定领域的成功实践
- 查询高校和科研机构使用 openEuler 的案例

**参数说明：**
- keyword: 搜索关键词（可选），如企业名称、技术关键词等，为空时返回所有案例
- lang: 查询语言（可选），"zh" 为中文（默认），"en" 为英文
- industry: 行业分类（可选），可选值：
  - 金融
  - 运营商
  - 能源
  - 物流
  - 高校&科研
  - 云计算
  - 其他

**返回信息：**
- 案例标题
- 所属企业/单位
- 行业分类
- 案例摘要（超过120字符自动截断）
- 案例详情链接

**注意事项：**
- 每次查询最多显示前 20 条结果
- 如结果过多，建议添加关键词或行业筛选以精准查找
- 支持 15 分钟缓存，相同条件的重复查询直接返回缓存数据

**示例问题：**
- "openEuler 在金融行业有哪些用户案例？"
- "工商银行使用 openEuler 的案例"
- "查询 openEuler 在运营商领域的应用"
- "高校和科研机构使用 openEuler 的案例有哪些？"
- "openEuler 的全部用户案例"
- "查询 openEuler 云计算相关案例"`,
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description: "搜索关键词（可选），如企业名称、技术关键词等。为空时返回所有案例。",
        default: ""
      },
      lang: {
        type: "string",
        enum: ["zh", "en"],
        description: "查询语言：'zh'（中文，默认）、'en'（英文）。根据用户提问语言自动选择。",
        default: "zh"
      },
      industry: {
        type: "string",
        enum: ["金融", "运营商", "能源", "物流", "高校&科研", "云计算", "其他"],
        description: "行业分类（可选）：金融、运营商、能源、物流、高校&科研、云计算、其他。不填则查询所有行业。",
        default: ""
      }
    }
  }
};
