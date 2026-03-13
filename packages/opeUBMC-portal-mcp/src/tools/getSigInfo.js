/**
 * @created 2026-03-09 by sig-OpenDesign with Claude AI
 * @modified 2026-03-09 by sig-OpenDesign with Claude AI
 * @description SIG 信息查询工具，支持 SIG 信息查询和成员贡献统计
 */

// 数据源 URL
const SIG_LIST_URL = "https://www.openubmc.cn/api-magic/stat/sig/info?community=openubmc";
const SIG_DETAIL_URL = "https://www.openubmc.cn/api-magic/openubmc/sig/info";
const SIG_CONTRIBUTE_URL = "https://www.openubmc.cn/api-magic/stat_new/sig/user/contribute";

// SIG 名称列表缓存
let cachedSigNames = null;
let sigNamesExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 贡献类型标签
const CONTRIBUTE_TYPE_LABELS = {
  pr: "PR 合并请求",
  issue: "Issue 需求&评审",
  comment: "评审评论",
};

// 清除缓存（仅供测试使用）
export function _resetCache() {
  cachedSigNames = null;
  sigNamesExpiry = 0;
}

// 获取所有 SIG 名称列表（带缓存）
async function fetchAllSigNames() {
  const now = Date.now();
  if (cachedSigNames && now < sigNamesExpiry) return cachedSigNames;

  const response = await fetch(SIG_LIST_URL, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];

  const data = await response.json();
  if (!data || data.code !== 1 || !data.data) return [];

  let names = [];
  if (Array.isArray(data.data)) {
    names = data.data.map(item => item.name || item.sig_name || item).filter(Boolean);
  } else if (data.data.sig_list) {
    names = data.data.sig_list.map(item => item.name || item.sig_name || item).filter(Boolean);
  }

  cachedSigNames = names;
  sigNamesExpiry = now + CACHE_DURATION;
  return names;
}

/**
 * 从 SIG 列表中匹配名称：
 * - 精确匹配 → 直接返回
 * - 仅大小写不同 → 返回正确名称
 * - 无匹配 → 返回 null（调用方负责展示完整列表）
 */
async function resolveSigName(input) {
  const sigNames = await fetchAllSigNames();
  if (!sigNames || sigNames.length === 0) return { resolved: null, list: [] };

  // 精确匹配
  if (sigNames.includes(input)) return { resolved: input, list: sigNames };

  // 仅大小写不同
  const lower = input.toLowerCase();
  const caseMatch = sigNames.find(n => n.toLowerCase() === lower);
  if (caseMatch) return { resolved: caseMatch, list: sigNames };

  // 无匹配
  return { resolved: null, list: sigNames };
}

// 查询 SIG 详情（sigName 区分大小写）
async function fetchSigDetail(sigName) {
  const params = new URLSearchParams({ sigName });
  const response = await fetch(`${SIG_DETAIL_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败：HTTP ${response.status}`);
  }

  return await response.json();
}

// 查询 SIG 成员贡献
async function fetchSigContribute(sigName, contributeType) {
  const params = new URLSearchParams({
    contributeType,
    timeRange: "all",
    community: "openubmc",
    sig: sigName,
  });

  const response = await fetch(`${SIG_CONTRIBUTE_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败：HTTP ${response.status}`);
  }

  return await response.json();
}

// 格式化单个贡献类型的结果
function formatContributeSection(typeLabel, data) {
  if (!data || data.code !== 1 || !Array.isArray(data.data) || data.data.length === 0) {
    return `\n**${typeLabel}：** 暂无数据\n`;
  }

  let out = `\n**${typeLabel}（共 ${data.data.length} 人）：**\n`;
  data.data.slice(0, 20).forEach((item, i) => {
    const user = item.gitee_id || item.user || item.name || "未知";
    const count = item.contribute_count ?? item.count ?? item.num ?? "N/A";
    out += `   ${i + 1}. ${user}  ${count} 次\n`;
  });
  if (data.data.length > 20) {
    out += `   ... 共 ${data.data.length} 人\n`;
  }
  return out;
}

// 格式化 SIG 信息输出
function formatSigInfo(sigName, data) {
  const sections = [];
  sections.push(`
╔════════════════════════════════════════════════════════════╗
║  ${sigName} SIG 信息                                         ║
╚════════════════════════════════════════════════════════════╝`);

  if (data.name) sections.push(`\n【名称】${data.name}`);
  if (data.description) sections.push(`\n【描述】${data.description}`);
  if (data.mailing_list) sections.push(`\n【邮件列表】${data.mailing_list}`);

  if (data.maintainers && data.maintainers.length > 0) {
    sections.push(`\n【Maintainers】(${data.maintainers.length} 人)`);
    data.maintainers.forEach((m, i) => sections.push(`  ${i + 1}. ${m}`));
  }

  if (data.maintainer_info && data.maintainer_info.length > 0) {
    sections.push(`\n【Maintainer 详细信息】`);
    data.maintainer_info.forEach((info, i) => {
      sections.push(`  ${i + 1}. ${info.name || info.user_login}`);
      if (info.email) sections.push(`     邮箱: ${info.email}`);
      if (info.user_homepage_url) sections.push(`     主页: ${info.user_homepage_url}`);
    });
  }

  if (data.repositories && data.repositories.length > 0) {
    sections.push(`\n【仓库】(${data.repositories.length} 个)`);
    data.repositories.slice(0, 20).forEach((repo, i) => sections.push(`  ${i + 1}. ${repo}`));
    if (data.repositories.length > 20) {
      sections.push(`  ... 还有 ${data.repositories.length - 20} 个仓库`);
    }
  }

  if (data.committers && data.committers.length > 0) {
    sections.push(`\n【Committers】共 ${data.committers.length} 人`);
  }

  if (data.committer_info && data.committer_info.length > 0) {
    sections.push(`\n【活跃 Committers】(显示前 10 位)`);
    data.committer_info.slice(0, 10).forEach((info, i) => {
      const name = info.name || info.user_login || info.gitee_id || info.atomgit_id;
      sections.push(`  ${i + 1}. ${name}`);
      if (info.email) sections.push(`     邮箱: ${info.email}`);
      if (info.organization) sections.push(`     组织: ${info.organization}`);
    });
    if (data.committer_info.length > 10) {
      sections.push(`  ... 还有 ${data.committer_info.length - 10} 位 committers`);
    }
  }

  if (data.branches && data.branches.length > 0) {
    sections.push(`\n【分支管理】(${data.branches.length} 个分支组)`);
    data.branches.slice(0, 3).forEach((branch, i) => {
      if (branch.repo_branch && branch.repo_branch.length > 0) {
        sections.push(`  分支组 ${i + 1}: ${branch.repo_branch.length} 个仓库分支`);
        if (branch.keeper && branch.keeper.length > 0) {
          const keepers = branch.keeper.map(k => k.gitee_id || k.atomgit_id).join(", ");
          sections.push(`    维护者: ${keepers}`);
        }
      }
    });
    if (data.branches.length > 3) sections.push(`  ... 还有 ${data.branches.length - 3} 个分支组`);
  }

  sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  sections.push(`💡 提示：可用 query_type="contribute" 查询该 SIG 的成员贡献统计。`);
  sections.push(`数据来源: openUBMC SIG 数据平台`);
  sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
  sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return sections.join("\n");
}

// 格式化 SIG 列表输出（名称未匹配时返回完整列表）
function formatSigList(input, list) {
  let out = `=== openUBMC SIG 列表 ===\n\n`;
  out += `未找到名称为 "${input}" 的 SIG 组（注意：名称区分大小写）。\n\n`;
  out += `当前共有 ${list.length} 个 SIG 组：\n\n`;
  list.forEach((name, i) => { out += `  ${i + 1}. ${name}\n`; });
  out += `\n💡 请从以上列表中选择正确的 SIG 名称重新查询。\n`;
  return out;
}

// 获取 openUBMC SIG 的相关信息
export async function getSigInfo(sigName, queryType = "sig", contributeType = "pr") {
  try {
    // ===== 名称解析（SIG 查询和贡献查询共用）=====
    const { resolved, list } = await resolveSigName(sigName);

    // ===== 贡献查询模式 =====
    if (queryType === "contribute") {
      if (!resolved) {
        return formatSigList(sigName, list);
      }

      const typeLabel = CONTRIBUTE_TYPE_LABELS[contributeType] || contributeType;

      if (contributeType === "all") {
        const [prData, issueData, commentData] = await Promise.all([
          fetchSigContribute(resolved, "pr"),
          fetchSigContribute(resolved, "issue"),
          fetchSigContribute(resolved, "comment"),
        ]);

        let output = `=== ${resolved} SIG 成员贡献统计（全部类型）===\n`;
        output += `时间范围：全部\n`;
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.pr, prData);
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.issue, issueData);
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.comment, commentData);
        output += `\n---\n数据来源: openUBMC SIG 数据平台\n`;
        output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
        return output;
      }

      const data = await fetchSigContribute(resolved, contributeType);
      let output = `=== ${resolved} SIG 成员贡献统计 ===\n\n`;
      output += `贡献类型：${typeLabel}\n`;
      output += `时间范围：全部\n`;
      output += formatContributeSection(typeLabel, data);
      output += `\n---\n`;
      output += `💡 提示：可将 contribute_type 改为 "issue"、"comment" 或 "all" 查询其他贡献类型。\n`;
      output += `数据来源: openUBMC SIG 数据平台\n`;
      output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
      return output;
    }

    // ===== 默认：SIG 详情查询模式 =====
    if (!resolved) {
      return formatSigList(sigName, list);
    }

    // 使用解析后的正确名称查询详情（区分大小写）
    const detailData = await fetchSigDetail(resolved);

    if (detailData && detailData.code === 1 && detailData.data) {
      return formatSigInfo(resolved, detailData.data);
    }

    return `未能获取 "${resolved}" SIG 的详细信息，请稍后重试。`;
  } catch (e) {
    if (e.name === "AbortError") return "网络请求超时，请稍后重试。";
    return `获取 SIG 信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_sig_info",
  description: `查询 openUBMC 技术特别兴趣小组（Technical SIG）的详细信息，支持 SIG 信息查询和成员贡献统计。

**查询模式：**

1. SIG 详情查询（默认）：query_type = "sig"
   - 查询指定 SIG 组的基本信息（名称、描述、Maintainers、仓库列表等）
   - SIG 名称区分大小写，系统会自动修正大小写错误
   - 若名称不在 SIG 列表中，返回完整 SIG 列表供用户选择

2. 贡献统计查询：query_type = "contribute"
   - 查询指定 SIG 组成员的贡献数据（PR、Issue、评审评论）
   - contribute_type:
     - "pr": PR 合并请求数量排行
     - "issue": Issue 需求&评审数量排行
     - "comment": 评审评论数量排行
     - "all": 一次性查询全部三种类型

**使用场景：**
- 查询某个技术 SIG 的基本信息（名称、描述、Maintainers、仓库列表）
- 查询某个 SIG 的成员贡献排行（PR/Issue/评审）
- 查看 openUBMC 有哪些 SIG 组（输入任意不存在的名称即可获取完整列表）

**示例问题：**
- "openUBMC 有哪些 SIG 组？"
- "infrastructure SIG 的维护者是谁？"
- "查询某 SIG 的成员 PR 贡献排行"`,
  inputSchema: {
    type: "object",
    required: ["sig_name"],
    properties: {
      sig_name: {
        type: "string",
        description: "SIG 组名称，区分大小写（如 'infrastructure'、'BMC'）。系统会自动修正大小写错误；若名称不存在，将返回完整 SIG 列表。",
      },
      query_type: {
        type: "string",
        enum: ["sig", "contribute"],
        description: "查询类型：'sig'（SIG 详情，默认）、'contribute'（SIG 成员贡献统计）。",
        default: "sig",
      },
      contribute_type: {
        type: "string",
        enum: ["pr", "issue", "comment", "all"],
        description: "贡献类型（query_type 为 'contribute' 时有效）：'pr'（PR 合并请求）、'issue'（Issue 需求&评审）、'comment'（评审评论）、'all'（全部三种类型）。默认为 'pr'。",
        default: "pr",
      },
    },
  },
};
