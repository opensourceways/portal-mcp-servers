// 数据源 URL
const NOTICE_LIST_URL = "https://www.openeuler.openatom.cn/api-cve/cve-security-notice-server/securitynotice/findAll";
const NOTICE_DETAIL_URL = "https://www.openeuler.openatom.cn/api-cve/cve-security-notice-server/securitynotice/getBySecurityNoticeNo";

// 固定参数
const PAGE_SIZE = 100; // API 最大支持 size=100

// 缓存配置
const listCache = new Map();   // key: keyword（小写）
const detailCache = new Map(); // key: securityNoticeNo
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 严重等级中文标签
const SEVERITY_LABELS = {
  High: "高 (High)",
  Moderate: "中等 (Moderate)",
  Low: "低 (Low)",
};

// 查询缺陷公告列表（带缓存）
async function fetchBugNoticeList(keyword = "") {
  const cacheKey = keyword.toLowerCase();
  const now = Date.now();
  const cached = listCache.get(cacheKey);
  if (cached && now < cached.expiry) return cached.data;

  const response = await fetch(NOTICE_LIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pages: { page: 1, size: PAGE_SIZE }, keyword, noticeType: "bug" }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 0 || !data.result) {
    throw new Error(`API 查询失败：${data.msg || "未知错误"}`);
  }

  listCache.set(cacheKey, { data: data.result, expiry: now + CACHE_DURATION });
  return data.result;
}

// 查询缺陷公告详情（带缓存）
async function fetchBugNoticeDetail(securityNoticeNo) {
  const now = Date.now();
  const cached = detailCache.get(securityNoticeNo);
  if (cached && now < cached.expiry) return cached.data;

  const url = `${NOTICE_DETAIL_URL}?securityNoticeNo=${encodeURIComponent(securityNoticeNo)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 0 || !data.result) {
    throw new Error(`缺陷公告不存在或查询失败：${securityNoticeNo}`);
  }

  detailCache.set(securityNoticeNo, { data: data.result, expiry: now + CACHE_DURATION });
  return data.result;
}

// 解析缺陷 ID 字符串（末尾分号清理）
function parseBugIds(cveId) {
  if (!cveId) return [];
  return cveId.replace(/;+$/, "").split(";").map(s => s.trim()).filter(Boolean);
}

// 格式化单条公告列表项
function formatNoticeItem(notice, index) {
  const severity = SEVERITY_LABELS[notice.type] || notice.type || "未知";
  const bugIds = parseBugIds(notice.cveId);

  let output = `${index + 1}. **${notice.securityNoticeNo}**\n`;
  output += `   摘要: ${notice.summary || "暂无"}\n`;
  output += `   严重等级: ${severity}\n`;
  output += `   受影响组件: ${notice.affectedComponent || "未知"}\n`;
  output += `   受影响版本: ${notice.affectedProduct || "未知"}\n`;

  if (bugIds.length > 0) {
    const showIds = bugIds.slice(0, 3).join(", ");
    const more = bugIds.length > 3 ? ` 等共 ${bugIds.length} 个` : "";
    output += `   缺陷 ID: ${showIds}${more}\n`;
  }

  output += `   发布时间: ${notice.announcementTime || "未知"}\n`;
  return output;
}

// 格式化公告详情
function formatNoticeDetail(notice) {
  const severity = SEVERITY_LABELS[notice.type] || notice.type || "未知";
  const bugIds = parseBugIds(notice.cveId);

  let output = `=== openEuler 缺陷公告详情 ===\n\n`;
  output += `**公告编号:** ${notice.securityNoticeNo}\n`;
  output += `**摘要:** ${notice.summary || "暂无"}\n`;
  output += `**严重等级:** ${severity}\n`;
  output += `**受影响组件:** ${notice.affectedComponent || "未知"}\n`;
  output += `**受影响版本:** ${notice.affectedProduct || "未知"}\n`;
  output += `**发布时间:** ${notice.announcementTime || "未知"}\n`;
  output += `**更新时间:** ${notice.updateTime || "未知"}\n`;

  if (bugIds.length > 0) {
    output += `\n**关联缺陷（${bugIds.length} 个）:**\n`;
    bugIds.forEach(id => { output += `   - ${id}\n`; });
  }

  if (notice.description) {
    const desc = notice.description.length > 500
      ? notice.description.substring(0, 500) + "..."
      : notice.description;
    output += `\n**详细描述:**\n${desc}\n`;
  }

  if (notice.referenceList && notice.referenceList.length > 0) {
    output += `\n**参考链接（${notice.referenceList.length} 个）:**\n`;
    notice.referenceList.slice(0, 10).forEach(ref => {
      output += `   - ${ref.url}\n`;
    });
    if (notice.referenceList.length > 10) {
      output += `   ... 共 ${notice.referenceList.length} 个链接\n`;
    }
  }

  if (notice.packageList && notice.packageList.length > 0) {
    output += `\n**修复软件包（${notice.packageList.length} 个）:**\n`;
    notice.packageList.slice(0, 10).forEach(pkg => {
      output += `   - ${pkg.packageName || pkg.name || String(pkg)}\n`;
    });
    if (notice.packageList.length > 10) {
      output += `   ... 共 ${notice.packageList.length} 个软件包\n`;
    }
  }

  output += `\n---\n`;
  output += `数据来源: openEuler 缺陷公告系统\n`;
  output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;

  return output;
}

// 主查询函数
export async function getBugNoticeInfo(queryType = "list", keyword = "", securityNoticeNo = "") {
  try {
    if (queryType === "detail") {
      if (!securityNoticeNo) {
        return "请提供缺陷公告编号，格式如：openEuler-BA-2025-1130";
      }
      const notice = await fetchBugNoticeDetail(securityNoticeNo);
      return formatNoticeDetail(notice);
    }

    // 默认 list 查询
    const result = await fetchBugNoticeList(keyword);
    const notices = result.securityNoticeList || [];
    const total = result.totalCount || notices.length;

    const conditions = keyword ? `关键词：${keyword}` : "全部";

    if (notices.length === 0) {
      let output = `=== openEuler 缺陷公告查询 ===\n\n查询条件：${conditions}\n\n`;
      output += `未找到符合条件的缺陷公告。\n`;
      if (keyword) {
        output += `\n💡 提示：可以尝试更换关键词，例如组件名（kernel、babel）或公告编号。\n`;
      }
      return output;
    }

    const displayNotices = notices.slice(0, 20);
    let output = `=== openEuler 缺陷公告查询 ===\n\n`;
    output += `查询条件：${conditions}\n`;
    output += `共找到 ${total} 条缺陷公告，显示最新 ${displayNotices.length} 条\n\n`;
    output += `---\n\n`;

    displayNotices.forEach((notice, index) => {
      output += formatNoticeItem(notice, index);
      output += "\n";
    });

    if (total > 20) {
      output += `⚠️ 共 ${total} 条公告，仅显示最新 20 条。建议添加关键词（如组件名）缩小范围。\n\n`;
    }

    output += `---\n`;
    output += `💡 提示：可用 query_type="detail" 加 security_notice_no 参数查询某条公告的详细内容。\n`;
    output += `数据来源: openEuler 缺陷公告系统\n`;
    output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;

    return output;
  } catch (e) {
    if (e.name === "AbortError") {
      return "网络请求超时，请稍后重试。";
    }
    return `查询缺陷公告时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_bug_notice_info",
  description: `查询 openEuler 缺陷公告（Bug Advisory）信息，支持列表查询和公告详情查询。

本工具用于查询 openEuler 发布的缺陷公告，每条公告对应一个或多个软件缺陷的修复情况。

**使用场景：**
- 查询某个组件（如 kernel、babel、openssl）相关的缺陷公告
- 按关键词搜索缺陷公告
- 查看某条缺陷公告的详细信息（缺陷描述、修复包、参考链接）
- 了解 openEuler 最新发布的缺陷修复更新

**查询模式：**

1. 列表查询：query_type = "list"（默认）
   - 查询缺陷公告列表，可按关键词过滤
   - 返回最新 20 条，显示总数
   - keyword 为空时返回全部最新公告

2. 详情查询：query_type = "detail"
   - 查询指定缺陷公告的完整内容
   - 需提供 security_notice_no（公告编号，如 openEuler-BA-2025-1130）
   - 返回缺陷描述、关联缺陷 ID、修复软件包、参考链接等完整信息

**参数说明：**
- query_type: 查询类型，"list"（列表，默认）或 "detail"（详情）
- keyword: 搜索关键词（可选），如组件名（kernel、babel）或缺陷编号；query_type 为 "list" 时有效
- security_notice_no: 缺陷公告编号，如 openEuler-BA-2025-1130；query_type 为 "detail" 时必填

**返回信息（列表）：**
- 公告编号（securityNoticeNo，格式 openEuler-BA-YYYY-NNNN）
- 摘要
- 严重等级（High/Moderate/Low）
- 受影响组件和版本
- 关联缺陷 ID（格式 BUG-YYYY-NNNN）
- 发布时间

**返回信息（详情）：**
- 以上所有字段 + 更新时间
- 完整的缺陷详细描述（最多500字符）
- 关联缺陷 ID 完整列表
- 参考链接列表
- 修复软件包列表

**示例问题：**
- "openEuler 最新有哪些缺陷公告？"
- "kernel 组件有哪些缺陷公告？"
- "查询 openEuler-BA-2025-1130 的详细内容"
- "babel 相关的缺陷修复公告有哪些？"
- "BUG-2025-32 对应的公告详情是什么？"`,
  inputSchema: {
    type: "object",
    properties: {
      query_type: {
        type: "string",
        enum: ["list", "detail"],
        description: "查询类型：'list'（列表查询，默认）、'detail'（详情查询）。",
        default: "list"
      },
      keyword: {
        type: "string",
        description: "搜索关键词（可选），如组件名（kernel、babel、openssl）或缺陷编号。query_type 为 'list' 时有效，为空时返回全部最新公告。",
        default: ""
      },
      security_notice_no: {
        type: "string",
        description: "缺陷公告编号，格式如 openEuler-BA-2025-1130。query_type 为 'detail' 时必填。",
        default: ""
      }
    }
  }
};
