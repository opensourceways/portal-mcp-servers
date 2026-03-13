/**
 * @created 2026-03-09 by sig-OpenDesign with Claude AI
 * @modified 2026-03-13 by sig-OpenDesign with Claude AI
 * @description SIG 信息查询工具，支持 SIG 信息查询和成员贡献统计
 *   列表 API 已包含所有 SIG 字段，缓存完整对象，无需再调详情 API
 */

// 数据源 URL
const SIG_LIST_URL = "https://www.openubmc.cn/api-magic/stat/sig/info?community=openubmc";
const SIG_CONTRIBUTE_URL = "https://www.openubmc.cn/api-magic/stat_new/sig/user/contribute";

// SIG 完整数据缓存（列表 API 已包含所有字段）
let cachedSigList = null;
let sigListExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 贡献类型标签
const CONTRIBUTE_TYPE_LABELS = {
  pr: "PR 合并请求",
  issue: "Issue 需求&评审",
  comment: "评审评论",
};

// 清除缓存（仅供测试使用）
export function _resetCache() {
  cachedSigList = null;
  sigListExpiry = 0;
}

// 获取所有 SIG 完整数据（带缓存）
async function fetchAllSigData() {
  const now = Date.now();
  if (cachedSigList && now < sigListExpiry) return cachedSigList;

  const response = await fetch(SIG_LIST_URL, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];

  const data = await response.json();
  if (!data || data.code !== 1 || !data.data) return [];

  let list = [];
  if (Array.isArray(data.data)) {
    list = data.data;
  } else if (data.data.sig_list) {
    list = data.data.sig_list;
  }

  cachedSigList = list;
  sigListExpiry = now + CACHE_DURATION;
  return list;
}

/**
 * 从 SIG 列表中查找匹配项，返回完整 SIG 对象：
 * - 精确匹配 → 直接返回
 * - 仅大小写不同 → 返回正确对象
 * - 无匹配 → sig 为 null（调用方负责展示完整列表）
 */
async function resolveSig(input) {
  const list = await fetchAllSigData();
  if (!list || list.length === 0) return { sig: null, list: [] };

  const getName = (item) => item.name || item.sig_name || "";

  // 精确匹配
  const exact = list.find((item) => getName(item) === input);
  if (exact) return { sig: exact, list };

  // 仅大小写不同
  const lower = input.toLowerCase();
  const caseMatch = list.find((item) => getName(item).toLowerCase() === lower);
  if (caseMatch) return { sig: caseMatch, list };

  // 无匹配
  return { sig: null, list };
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
    // 真实 API 返回 user_login / contribute；兼容其他可能字段名
    const user = item.user_login || item.gitee_id || item.atomgit_id || item.user || item.name || "未知";
    const count = item.contribute ?? item.contribute_count ?? item.count ?? item.num ?? "N/A";
    const role = item.usertype ? `  [${item.usertype}]` : "";
    out += `   ${i + 1}. ${user}  ${count} 次${role}\n`;
  });
  if (data.data.length > 20) {
    out += `   ... 共 ${data.data.length} 人\n`;
  }
  return out;
}

// 格式化人员 ID（兼容字符串和对象两种格式）
function formatPersonId(person) {
  if (typeof person === "string") return person;
  // 优先取平台 ID，附加中文名
  const id = person.gitcode_id || person.gitee_id || person.atomgit_id || person.user_login || "";
  const name = person.name || "";
  if (id && name) return `${id}（${name}）`;
  return id || name || "(未知)";
}

// 格式化 SIG 完整信息输出（展示所有 API 字段）
function formatSigInfo(data) {
  const sigName = data.name || data.sig_name || "未知";
  const sections = [];

  sections.push(`
╔════════════════════════════════════════════════════════════╗
║  ${sigName} SIG 信息
╚════════════════════════════════════════════════════════════╝`);

  // ── 基本信息 ──
  if (data.name) sections.push(`\n【名称】${data.name}`);
  if (data.description) sections.push(`\n【描述（中文）】${data.description}`);
  if (data.description_en) sections.push(`\n【描述（英文）】${data.description_en}`);
  if (data.mailing_list) sections.push(`\n【邮件列表】${data.mailing_list}`);
  if (data.created_on) sections.push(`\n【创建时间】${data.created_on}`);
  if (data.meeting_url) sections.push(`\n【会议链接】${data.meeting_url}`);
  if (data.discuss_url) sections.push(`\n【讨论链接】${data.discuss_url}`);

  // ── Maintainers ──
  if (data.maintainers && data.maintainers.length > 0) {
    sections.push(`\n【Maintainers】(${data.maintainers.length} 人)`);
    data.maintainers.forEach((m, i) => {
      if (typeof m === "string") {
        sections.push(`  ${i + 1}. ${m}`);
      } else {
        const id = m.gitee_id || m.atomgit_id || m.user_login || m.name || "(未知)";
        const email = m.email ? `  <${m.email}>` : "";
        sections.push(`  ${i + 1}. ${id}${email}`);
      }
    });
  }

  if (data.maintainer_info && data.maintainer_info.length > 0) {
    sections.push(`\n【Maintainer 详细信息】`);
    data.maintainer_info.forEach((info, i) => {
      const id = info.gitcode_id || info.gitee_id || info.atomgit_id || info.user_login || "";
      const name = info.name || "";
      const display = id && name ? `${id}（${name}）` : (id || name || "(未知)");
      const role = info.role ? `  [${info.role}]` : "";
      sections.push(`  ${i + 1}. ${display}${role}`);
      if (info.email) sections.push(`     邮箱: ${info.email}`);
      if (info.organization) sections.push(`     组织: ${info.organization}`);
      if (info.user_homepage_url) sections.push(`     主页: ${info.user_homepage_url}`);
    });
  }

  // ── Committers ──
  if (data.committers && data.committers.length > 0) {
    sections.push(`\n【Committers】(${data.committers.length} 人)`);
    data.committers.slice(0, 20).forEach((c, i) => {
      sections.push(`  ${i + 1}. ${formatPersonId(c)}`);
    });
    if (data.committers.length > 20) {
      sections.push(`  ... 还有 ${data.committers.length - 20} 人`);
    }
  }

  if (data.committer_info && data.committer_info.length > 0) {
    sections.push(`\n【Committer 详细信息】(显示前 10 位)`);
    data.committer_info.slice(0, 10).forEach((info, i) => {
      const id = info.gitcode_id || info.gitee_id || info.atomgit_id || info.user_login || "";
      const name = info.name || "";
      const display = id && name ? `${id}（${name}）` : (id || name || "(未知)");
      sections.push(`  ${i + 1}. ${display}`);
      if (info.email) sections.push(`     邮箱: ${info.email}`);
      if (info.organization) sections.push(`     组织: ${info.organization}`);
    });
    if (data.committer_info.length > 10) {
      sections.push(`  ... 还有 ${data.committer_info.length - 10} 位 committers`);
    }
  }

  // ── 仓库 ──
  if (data.repositories && data.repositories.length > 0) {
    // 过滤掉 person 对象（API 偶发数据异常），只展示字符串和有 repo 路径的对象
    const repos = data.repositories.filter(r => typeof r === "string" || r.name?.includes("/") || r.repo || r.path);
    const persons = data.repositories.filter(r => typeof r === "object" && r !== null && !r.name?.includes("/") && !r.repo && !r.path);
    sections.push(`\n【仓库】(${repos.length} 个)`);
    repos.slice(0, 20).forEach((repo, i) => {
      const name = typeof repo === "string" ? repo : (repo.name || repo.repo || repo.path || "");
      sections.push(`  ${i + 1}. ${name}`);
    });
    if (repos.length > 20) sections.push(`  ... 还有 ${repos.length - 20} 个仓库`);
    // 如果有误混入的 person 对象，单独提示
    if (persons.length > 0) {
      const ids = persons.map(p => formatPersonId(p)).join("、");
      sections.push(`  ⚠️ 以下条目疑似数据异常（非仓库）：${ids}`);
    }
  }

  // ── 分支管理 ──
  if (data.branches && data.branches.length > 0) {
    sections.push(`\n【分支管理】(${data.branches.length} 个分支组)`);
    data.branches.slice(0, 3).forEach((branch, i) => {
      if (branch.repo_branch && branch.repo_branch.length > 0) {
        sections.push(`  分支组 ${i + 1}: ${branch.repo_branch.length} 个仓库分支`);
        if (branch.keeper && branch.keeper.length > 0) {
          const keepers = branch.keeper.map((k) => formatPersonId(k)).join(", ");
          sections.push(`    维护者: ${keepers}`);
        }
      }
    });
    if (data.branches.length > 3) sections.push(`  ... 还有 ${data.branches.length - 3} 个分支组`);
  }

  // ── 会议议程 ──
  if (data.meeting_agenda && data.meeting_agenda.length > 0) {
    sections.push(`\n【会议议程（中文）】`);
    data.meeting_agenda.slice(0, 5).forEach((item, i) => {
      const title = item.topic || item.title || item.name || (typeof item === "string" ? item : JSON.stringify(item));
      const date = item.date || item.meeting_date || "";
      sections.push(`  ${i + 1}. ${title}${date ? `  (${date})` : ""}`);
    });
    if (data.meeting_agenda.length > 5) {
      sections.push(`  ... 还有 ${data.meeting_agenda.length - 5} 项`);
    }
  }

  if (data.meeting_agenda_en && data.meeting_agenda_en.length > 0) {
    sections.push(`\n【会议议程（英文）】`);
    data.meeting_agenda_en.slice(0, 5).forEach((item, i) => {
      const title = item.topic || item.title || item.name || (typeof item === "string" ? item : JSON.stringify(item));
      const date = item.date || item.meeting_date || "";
      sections.push(`  ${i + 1}. ${title}${date ? `  (${date})` : ""}`);
    });
    if (data.meeting_agenda_en.length > 5) {
      sections.push(`  ... 还有 ${data.meeting_agenda_en.length - 5} 项`);
    }
  }

  sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  sections.push(`💡 提示：可用 query_type="contribute" 查询该 SIG 的成员贡献统计。`);
  sections.push(`数据来源: openUBMC SIG 数据平台`);
  sections.push(`查询时间: ${new Date().toLocaleString("zh-CN")}`);
  sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return sections.join("\n");
}

// 格式化 SIG 列表输出（名称未匹配时返回完整列表）
function formatSigList(input, sigObjects) {
  const names = sigObjects.map((item) => item.name || item.sig_name || "").filter(Boolean);
  let out = `=== openUBMC SIG 列表 ===\n\n`;
  out += `未找到名称为 "${input}" 的 SIG 组（注意：名称区分大小写）。\n\n`;
  out += `当前共有 ${names.length} 个 SIG 组：\n\n`;
  names.forEach((name, i) => { out += `  ${i + 1}. ${name}\n`; });
  out += `\n💡 请从以上列表中选择正确的 SIG 名称重新查询。\n`;
  return out;
}

// 获取 openUBMC SIG 的相关信息
export async function getSigInfo(sigName, queryType = "sig", contributeType = "pr") {
  try {
    // ===== 名称解析（SIG 查询和贡献查询共用）=====
    const { sig, list } = await resolveSig(sigName);
    const resolvedName = sig ? (sig.name || sig.sig_name || sigName) : null;

    // ===== 贡献查询模式 =====
    if (queryType === "contribute") {
      if (!resolvedName) {
        return formatSigList(sigName, list);
      }

      const typeLabel = CONTRIBUTE_TYPE_LABELS[contributeType] || contributeType;

      if (contributeType === "all") {
        const [prData, issueData, commentData] = await Promise.all([
          fetchSigContribute(resolvedName, "pr"),
          fetchSigContribute(resolvedName, "issue"),
          fetchSigContribute(resolvedName, "comment"),
        ]);

        let output = `=== ${resolvedName} SIG 成员贡献统计（全部类型）===\n`;
        output += `时间范围：全部\n`;
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.pr, prData);
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.issue, issueData);
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.comment, commentData);
        output += `\n---\n数据来源: openUBMC SIG 数据平台\n`;
        output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
        return output;
      }

      const data = await fetchSigContribute(resolvedName, contributeType);
      let output = `=== ${resolvedName} SIG 成员贡献统计 ===\n\n`;
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
    if (!sig) {
      return formatSigList(sigName, list);
    }

    // 直接使用缓存的完整 SIG 对象，无需再次调用 API
    return formatSigInfo(sig);
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
   - 查询指定 SIG 组的完整信息（名称、描述、Maintainers、Committers、仓库列表、会议议程、讨论链接等）
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
