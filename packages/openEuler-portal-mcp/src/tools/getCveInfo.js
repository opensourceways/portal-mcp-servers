/**
 * @created by sig-OpenDesign with Claude AI
 * @modified 2026-03-03 by sig-OpenDesign with Claude AI
 * @description CVE 安全公告查询工具，支持列表查询和 CVE 详情查询
 */

// 数据源 URL
const CVE_LIST_URL = "https://www.openeuler.openatom.cn/api-cve/cve-security-notice-server/cvedatabase/findAll";
const CVE_DETAIL_URL = "https://www.openeuler.openatom.cn/api-cve/cve-security-notice-server/cvedatabase/getByCveIdAndPackageName";
const CVE_PRODUCT_URL = "https://www.openeuler.openatom.cn/api-cve/cve-security-notice-server/cvedatabase/getCVEProductPackageList";

// 缓存配置（仅用于详情）
const detailCache = new Map(); // key: `${cveId}__${packageName}`
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 查询 CVE 详情（带缓存，并行调用两个接口）
async function fetchCveDetail(cveId, packageName) {
  const cacheKey = `${cveId}__${packageName}`;
  const now = Date.now();
  const cached = detailCache.get(cacheKey);
  if (cached && now < cached.expiry) return cached.data;

  const params = `cveId=${encodeURIComponent(cveId)}&packageName=${encodeURIComponent(packageName)}`;

  const [detailRes, productRes] = await Promise.all([
    fetch(`${CVE_DETAIL_URL}?${params}`, { signal: AbortSignal.timeout(15000) }),
    fetch(`${CVE_PRODUCT_URL}?${params}`, { signal: AbortSignal.timeout(15000) }),
  ]);

  if (!detailRes.ok) {
    throw new Error(`CVE 详情请求失败：HTTP ${detailRes.status}`);
  }

  const detailData = await detailRes.json();

  if (detailData.code !== 0 || !detailData.result) {
    throw new Error(`CVE 不存在或查询失败：${cveId} / ${packageName}`);
  }

  let products = [];
  if (productRes.ok) {
    const productData = await productRes.json();
    if (productData.code === 0 && Array.isArray(productData.result)) {
      products = productData.result;
    }
  }

  const result = { detail: detailData.result, products };
  detailCache.set(cacheKey, { data: result, expiry: now + CACHE_DURATION });
  return result;
}

// 格式化 CVE 详情输出
function formatCveDetail(cveId, packageName, detail, products) {
  let output = `=== openEuler CVE 详情 ===\n\n`;
  output += `**CVE ID:** ${detail.cveId || cveId}\n`;
  output += `**软件包:** ${detail.packageName || packageName}\n`;
  output += `**状态:** ${detail.status || "未知"}\n`;

  if (detail.type) {
    output += `**漏洞类型:** ${detail.type}\n`;
  }

  if (detail.securityNoticeNo) {
    output += `**关联安全公告:** ${detail.securityNoticeNo}\n`;
  }

  output += `**发布时间:** ${detail.announcementTime || "未知"}\n`;
  output += `**更新时间:** ${detail.updateTime || "未知"}\n`;

  // CVSS 评分
  const cvssLines = [];
  if (detail.cvsssCoreOE && detail.cvsssCoreOE !== "N/A") {
    cvssLines.push(`   - OE V3: ${detail.cvsssCoreOE}`);
  }
  if (detail.cvsssCoreNVD && detail.cvsssCoreNVD !== "N/A") {
    cvssLines.push(`   - NVD V3: ${detail.cvsssCoreNVD}`);
  }
  if (detail.v4_scoreoe && detail.v4_scoreoe !== "N/A") {
    cvssLines.push(`   - OE V4: ${detail.v4_scoreoe}`);
  }
  if (detail.v4_scorenvd && detail.v4_scorenvd !== "N/A") {
    cvssLines.push(`   - NVD V4: ${detail.v4_scorenvd}`);
  }
  if (cvssLines.length > 0) {
    output += `\n**CVSS 评分:**\n${cvssLines.join("\n")}\n`;
  }

  // 攻击向量（OE）
  const vectorFields = [
    ["attackVectorOE", "攻击向量"],
    ["attackComplexityOE", "攻击复杂度"],
    ["privilegesRequiredOE", "所需权限"],
    ["userInteractionOE", "用户交互"],
    ["scopeOE", "影响范围"],
    ["confidentialityOE", "机密性影响"],
    ["integrityOE", "完整性影响"],
    ["availabilityOE", "可用性影响"],
  ];
  const vectorLines = vectorFields
    .filter(([key]) => detail[key] && detail[key] !== "N/A")
    .map(([key, label]) => `   - ${label}: ${detail[key]}`);
  if (vectorLines.length > 0) {
    output += `\n**攻击向量 (OE):**\n${vectorLines.join("\n")}\n`;
  }

  // 漏洞摘要
  if (detail.summary) {
    const summary = detail.summary.length > 500
      ? detail.summary.substring(0, 500) + "..."
      : detail.summary;
    output += `\n**漏洞摘要:**\n${summary}\n`;
  }

  // 受影响产品
  if (products && products.length > 0) {
    output += `\n**受影响产品（${products.length} 个）:**\n`;
    products.slice(0, 20).forEach(p => {
      output += `   - ${p.productName || "未知"}`;
      if (p.status) output += `（${p.status}）`;
      if (p.securityNoticeNo) output += ` / 公告: ${p.securityNoticeNo}`;
      if (p.releaseTime) output += ` / 修复时间: ${p.releaseTime}`;
      output += "\n";
    });
    if (products.length > 20) {
      output += `   ... 共 ${products.length} 个产品\n`;
    }
  }

  output += `\n---\n`;
  output += `数据来源: openEuler CVE 数据库\n`;
  output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;

  return output;
}

// 主查询函数
export async function getCveInfo(queryType = "list", keyword = "", page = 1, pageSize = 20, cveId = "", packageName = "") {
  try {
    if (queryType === "detail") {
      if (!cveId) {
        return "请提供 CVE 编号（cve_id），格式如：CVE-2024-1234";
      }
      if (!packageName) {
        return "请提供软件包名称（package_name），格式如：kernel、openssl";
      }
      const { detail, products } = await fetchCveDetail(cveId, packageName);
      return formatCveDetail(cveId, packageName, detail, products);
    }

    // 默认 list 查询
    const url = CVE_LIST_URL;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pages: { page, size: pageSize },
        keyword,
        noticeType: "cve",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return `查询 CVE 信息时 API 返回错误状态码：${response.status}`;
    }

    const data = await response.json();

    if (data && data.result && data.result.cveDatabaseList && data.result.cveDatabaseList.length > 0) {
      const sections = [];
      sections.push(`
╔════════════════════════════════════════════════════════════╗
║  CVE 安全公告查询结果：${keyword}                            ║
╚════════════════════════════════════════════════════════════╝`);

      const totalCount = data.result.totalCount || data.result.cveDatabaseList.length;
      sections.push(`\n共找到 ${totalCount} 条 CVE 记录，显示第 ${page} 页（每页 ${pageSize} 条）\n`);

      data.result.cveDatabaseList.forEach((cve, i) => {
        sections.push(`\n【CVE ${(page - 1) * pageSize + i + 1}】`);

        if (cve.cveId) {
          sections.push(`  CVE ID: ${cve.cveId}`);
        }

        if (cve.summary) {
          const summary = cve.summary.length > 200
            ? cve.summary.substring(0, 200) + "..."
            : cve.summary;
          sections.push(`  摘要: ${summary}`);
        }

        if (cve.cvsssCoreOE && cve.cvsssCoreOE !== "N/A") {
          sections.push(`  CVSS 评分 (OE): ${cve.cvsssCoreOE}`);
        }

        if (cve.cvsssCoreNVD && cve.cvsssCoreNVD !== "N/A") {
          sections.push(`  CVSS 评分 (NVD): ${cve.cvsssCoreNVD}`);
        }

        if (cve.status) {
          sections.push(`  状态: ${cve.status}`);
        }

        if (cve.announcementTime) {
          sections.push(`  发布时间: ${cve.announcementTime}`);
        }

        if (cve.updateTime) {
          sections.push(`  更新时间: ${cve.updateTime}`);
        }

        if (cve.affectedProduct) {
          sections.push(`  受影响产品: ${cve.affectedProduct}`);
        }

        if (cve.packageName) {
          sections.push(`  软件包: ${cve.packageName}`);
        }

        if (cve.securityNoticeNo) {
          sections.push(`  安全公告编号: ${cve.securityNoticeNo}`);
        }
      });

      sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      if (totalCount > pageSize) {
        const totalPages = Math.ceil(totalCount / pageSize);
        sections.push(`提示: 共 ${totalPages} 页，当前第 ${page} 页`);
        if (page < totalPages) {
          sections.push(`可以指定 page 参数查看更多结果`);
        }
      }

      sections.push(`💡 提示：可用 query_type="detail" 加 cve_id 和 package_name 参数查询某个 CVE 的详情。`);
      sections.push(`查询时间: ${new Date().toLocaleString("zh-CN")}`);
      sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return sections.join("\n");
    } else {
      return `未找到与 "${keyword}" 相关的 CVE 安全公告。`;
    }
  } catch (e) {
    if (e.name === "AbortError") {
      return "网络请求超时，请稍后重试。";
    }
    return `查询 CVE 信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_cve_info",
  description: `查询 openEuler CVE（Common Vulnerabilities and Exposures）安全公告信息，支持列表查询和 CVE 详情查询。

CVE 是公开披露的网络安全漏洞标准化标识符。本工具用于查询 openEuler 社区发布的 CVE 安全公告和漏洞详情。

**使用场景：**
- 查询特定关键词（CVE 编号、软件包名）的 CVE 列表
- 查询某个 CVE 在特定软件包中的详细信息（CVSS 评分、攻击向量、受影响产品）
- 了解 CVE 的状态、修复公告及受影响的产品列表

**查询模式：**

1. 列表查询：query_type = "list"（默认）
   - 按关键词搜索 CVE 列表，支持分页
   - 关键词可以是 CVE 编号或软件包名

2. 详情查询：query_type = "detail"
   - 查询指定 CVE 在指定软件包中的完整详情
   - 需提供 cve_id（CVE 编号）和 package_name（软件包名）
   - 返回 CVSS 评分、攻击向量分析、受影响产品列表等

**参数说明：**
- query_type: 查询类型，"list"（列表，默认）或 "detail"（详情）
- keyword: 搜索关键词（list 模式），如 CVE 编号或软件包名
- page: 页码，默认 1（list 模式）
- page_size: 每页记录数，默认 20（list 模式）
- cve_id: CVE 编号（detail 模式必填），如 CVE-2026-23865
- package_name: 软件包名（detail 模式必填），如 kernel、freetype

**返回信息（列表）：**
- CVE ID、摘要、CVSS 评分、状态、发布/更新时间、受影响产品、软件包、安全公告编号

**返回信息（详情）：**
- CVE ID、软件包、状态、漏洞类型、关联安全公告
- CVSS V3/V4 评分（OE 和 NVD 来源）
- 攻击向量详情（攻击复杂度、权限要求、用户交互等）
- 完整漏洞摘要（最多500字符）
- 受影响产品列表（含修复状态和修复公告）

**示例问题：**
- "查询 kernel 相关的 CVE"
- "openssl 有哪些安全漏洞？"
- "CVE-2024-1234 的详细信息"
- "查询 CVE-2026-23865 在 freetype 软件包中的详情"
- "freetype 的 CVE-2026-23865 影响了哪些产品？"`,
  inputSchema: {
    type: "object",
    properties: {
      query_type: {
        type: "string",
        enum: ["list", "detail"],
        description: "查询类型：'list'（列表查询，默认）、'detail'（CVE 详情查询）。",
        default: "list",
      },
      keyword: {
        type: "string",
        description: "搜索关键词（list 模式），可以是 CVE 编号（如 'CVE-2024-1234'）或软件包名（如 'kernel'）。",
      },
      page: {
        type: "number",
        description: "页码，从 1 开始，默认为 1（list 模式）。",
        default: 1,
        minimum: 1,
      },
      page_size: {
        type: "number",
        description: "每页显示的记录数，默认为 20（list 模式）。",
        default: 20,
        minimum: 1,
        maximum: 1000,
      },
      cve_id: {
        type: "string",
        description: "CVE 编号（detail 模式必填），如 CVE-2026-23865。",
      },
      package_name: {
        type: "string",
        description: "软件包名（detail 模式必填），如 kernel、freetype、openssl。",
      },
    },
  },
};
