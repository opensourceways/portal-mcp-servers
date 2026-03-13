/**
 * @modified 2026-03-03 by sig-OpenDesign with Claude AI
 * @description SIG 信息查询工具，新增成员贡献查询和 SIG 名称模糊推荐
 */

// 数据源 URL
const SIG_INFO_URL = "https://www.openeuler.openatom.cn/api-magic/stat/sig/info";
const SIG_SEARCH_URL = "https://www.openeuler.openatom.cn/api-search/sigsearch/docs";
const SIG_CONTRIBUTE_URL = "https://www.openeuler.openatom.cn/api-magic/stat/sig/user/contribute";

// SIG 名称列表缓存（用于模糊匹配）
let cachedSigNames = null;
let sigNamesExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 贡献类型标签
const CONTRIBUTE_TYPE_LABELS = {
  pr: "PR 合并请求",
  issue: "Issue 需求&评审",
  comment: "评审评论",
};

// 辅助函数：清理 HTML 标签
function stripHtmlTags(str) {
  if (!str) return str;
  return str.replace(/<[^>]*>/g, '');
}

// 辅助函数：从路径中提取 SIG 名称
function extractSigName(path) {
  if (!path) return '';
  const match = path.match(/\/sig\/(.+)$/);
  return match ? match[1] : path;
}

// 辅助函数：尝试不同的大小写变体
function getCaseVariants(name) {
  const variants = [
    name,
    name.toUpperCase(),
    name.toLowerCase(),
    name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
  ];
  return [...new Set(variants)];
}

// 获取所有 SIG 名称列表（带缓存）
async function fetchAllSigNames() {
  const now = Date.now();
  if (cachedSigNames && now < sigNamesExpiry) return cachedSigNames;

  const response = await fetch(`${SIG_INFO_URL}?community=openeuler`, {
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

// 从 SIG 名称列表中模糊匹配，返回精确匹配名称或候选建议列表
async function matchOrSuggestSig(input) {
  const sigNames = await fetchAllSigNames();
  if (!sigNames || sigNames.length === 0) return { matched: null, suggestions: [] };

  const lower = input.toLowerCase();
  const stripped = lower.replace(/[-_\s]/g, '');

  // 优先级 1：精确匹配
  const exact = sigNames.find(n => n === input);
  if (exact) return { matched: exact, suggestions: [] };

  // 优先级 2：大小写不敏感精确匹配
  const caseMatch = sigNames.find(n => n.toLowerCase() === lower);
  if (caseMatch) return { matched: caseMatch, suggestions: [] };

  // 优先级 3：去除连字符/下划线后匹配（bigdata → big-data，sig-ai → ai）
  const stripMatch = sigNames.find(n => n.toLowerCase().replace(/[-_\s]/g, '') === stripped);
  if (stripMatch) return { matched: stripMatch, suggestions: [] };

  // 优先级 4：收集模糊候选（含前缀/包含关系）
  const candidates = [];
  for (const name of sigNames) {
    const nameLower = name.toLowerCase();
    const nameStripped = nameLower.replace(/[-_\s]/g, '');

    if (nameLower.startsWith(lower) || lower.startsWith(nameLower)) {
      candidates.push({ name, priority: 2 });
    } else if (nameLower.includes(lower) || lower.includes(nameLower)) {
      candidates.push({ name, priority: 1 });
    } else if (nameStripped.includes(stripped) || stripped.includes(nameStripped)) {
      candidates.push({ name, priority: 1 });
    }
  }

  // 如果只有一个候选，视为最佳匹配直接使用
  if (candidates.length === 1) return { matched: candidates[0].name, suggestions: [] };

  // 按优先级排序，取前 10 个
  candidates.sort((a, b) => b.priority - a.priority);
  return { matched: null, suggestions: candidates.slice(0, 10).map(c => c.name) };
}

// 查询 SIG 信息（支持大小写模糊搜索）
async function querySigInfo(sigName) {
  const variants = getCaseVariants(sigName);

  for (const variant of variants) {
    const params = new URLSearchParams({ community: "openeuler", sig: variant });
    const response = await fetch(`${SIG_INFO_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.code === 1 && result.data) {
        return { success: true, data: result.data };
      }
    }
  }

  return { success: false };
}

// 查询仓库或 maintainer 所属的 SIG 组
async function queryBelongsToSigs(keyword, keywordType) {
  const response = await fetch(SIG_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, keywordType }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 返回错误状态码：${response.status}`);
  }

  const text = await response.text();

  // API 返回两个 JSON 对象连在一起，只取第一个
  let depth = 0;
  let firstJsonEnd = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') {
      depth--;
      if (depth === 0) { firstJsonEnd = i + 1; break; }
    }
  }

  if (firstJsonEnd > 0) {
    return JSON.parse(text.substring(0, firstJsonEnd));
  }
  throw new Error(`无法解析响应：${text.substring(0, 200)}`);
}

// 查询 SIG 成员贡献
async function fetchSigContribute(sigName, contributeType) {
  const params = new URLSearchParams({
    contributeType,
    timeRange: "all",
    community: "openeuler",
    sig: sigName,
  });

  const response = await fetch(`${SIG_CONTRIBUTE_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败：HTTP ${response.status}`);
  }

  const data = await response.json();
  return data;
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
  sections.push(`数据来源: openEuler SIG 数据平台`);
  sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
  sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return sections.join("\n");
}

// 格式化 SIG 名称建议输出
function formatSigSuggestions(input, suggestions) {
  let out = `=== SIG 名称建议 ===\n\n`;
  out += `未找到名称为 "${input}" 的 SIG 组。\n\n`;
  if (suggestions.length > 0) {
    out += `以下是相似的 SIG 名称，请确认是否为其中之一：\n`;
    suggestions.forEach((name, i) => { out += `   ${i + 1}. ${name}\n`; });
    out += `\n💡 提示：请用精确的 SIG 名称重新查询，例如 sig_name="${suggestions[0]}"。\n`;
  } else {
    out += `💡 提示：请检查 SIG 名称是否正确，或使用 get_sig_info 智能查询模式搜索仓库/maintainer。\n`;
  }
  return out;
}

// 获取 openEuler SIG 的相关信息
export async function getSigInfo(sigName, queryType = "sig", contributeType = "pr") {
  try {
    // ===== 贡献查询模式 =====
    if (queryType === "contribute") {
      // 先从 SIG 列表中精确匹配名称
      const { matched, suggestions } = await matchOrSuggestSig(sigName);

      if (!matched) {
        return formatSigSuggestions(sigName, suggestions);
      }

      const typeLabel = CONTRIBUTE_TYPE_LABELS[contributeType] || contributeType;

      if (contributeType === "all") {
        // 并行查询 pr、issue、comment 三种贡献
        const [prData, issueData, commentData] = await Promise.all([
          fetchSigContribute(matched, "pr"),
          fetchSigContribute(matched, "issue"),
          fetchSigContribute(matched, "comment"),
        ]);

        let output = `=== ${matched} SIG 成员贡献统计（全部类型）===\n`;
        output += `时间范围：全部\n`;
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.pr, prData);
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.issue, issueData);
        output += formatContributeSection(CONTRIBUTE_TYPE_LABELS.comment, commentData);
        output += `\n---\n数据来源: openEuler SIG 数据平台\n`;
        output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
        return output;
      }

      const data = await fetchSigContribute(matched, contributeType);
      let output = `=== ${matched} SIG 成员贡献统计 ===\n\n`;
      output += `贡献类型：${typeLabel}\n`;
      output += `时间范围：全部\n`;
      output += formatContributeSection(typeLabel, data);
      output += `\n---\n`;
      output += `💡 提示：可将 contribute_type 改为 "issue"、"comment" 或 "all" 查询其他贡献类型。\n`;
      output += `数据来源: openEuler SIG 数据平台\n`;
      output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
      return output;
    }

    // ===== 仓库查询模式 =====
    if (queryType === "repos") {
      const result = await queryBelongsToSigs(sigName, "repos");
      if (result && result.repos && result.repos.length > 0) {
        return formatReposResult(sigName, result.repos);
      }
      return `未找到与 "${sigName}" 相关的仓库信息。`;
    }

    // ===== maintainer 查询模式 =====
    if (queryType === "maintainer") {
      const result = await queryBelongsToSigs(sigName, "maintainer");
      if (result && result.giteeIds && result.giteeIds.length > 0) {
        return formatMaintainerResult(sigName, result.giteeIds);
      }
      return `未找到 maintainer "${sigName}" 的相关信息。`;
    }

    // ===== 默认：智能查询模式 =====
    // 步骤 1：直接 SIG 查询（含大小写变体）
    const sigQueryResult = await querySigInfo(sigName);
    if (sigQueryResult.success) {
      return formatSigInfo(sigName, sigQueryResult.data);
    }

    // 步骤 2：从 SIG 列表中模糊匹配
    const { matched, suggestions } = await matchOrSuggestSig(sigName);
    if (matched && matched !== sigName) {
      // 用匹配到的正确名称重新查询
      const retryResult = await querySigInfo(matched);
      if (retryResult.success) {
        return formatSigInfo(matched, retryResult.data);
      }
    }
    if (!matched && suggestions.length > 0) {
      // 有多个候选，返回建议（但继续尝试 repos/maintainer 兜底）
      // 只在 repos/maintainer 也无结果时才返回建议
    }

    // 步骤 3：尝试仓库查询
    try {
      const reposResult = await queryBelongsToSigs(sigName, "repos");
      if (reposResult && reposResult.repos && reposResult.repos.length > 0) {
        return formatReposResult(sigName, reposResult.repos);
      }
    } catch (_) { /* 继续尝试 */ }

    // 步骤 4：尝试 maintainer 查询
    try {
      const maintainerResult = await queryBelongsToSigs(sigName, "maintainer");
      if (maintainerResult && maintainerResult.giteeIds && maintainerResult.giteeIds.length > 0) {
        return formatMaintainerResult(sigName, maintainerResult.giteeIds);
      }
    } catch (_) { /* 继续 */ }

    // 步骤 5：所有查询失败，如果有相似 SIG 推荐则展示
    if (suggestions.length > 0) {
      return formatSigSuggestions(sigName, suggestions);
    }

    return `未找到与 "${sigName}" 相关的信息。已尝试：SIG 查询、仓库查询、Maintainer 查询。`;
  } catch (e) {
    if (e.name === "AbortError") return "网络请求超时，请稍后重试。";
    return `获取 SIG 信息时发生错误：${e.message}`;
  }
}

// 格式化仓库查询结果
function formatReposResult(sigName, repos) {
  const sections = [];
  sections.push(`
╔════════════════════════════════════════════════════════════╗
║  仓库 "${sigName}" 的搜索结果                                 ║
╚════════════════════════════════════════════════════════════╝`);

  const sigGroups = {};
  repos.forEach(repo => {
    const sig = extractSigName(repo.path);
    if (!sigGroups[sig]) sigGroups[sig] = [];
    sigGroups[sig].push(repo);
  });

  let i = 1;
  for (const [sig, rs] of Object.entries(sigGroups)) {
    sections.push(`\n【SIG ${i}: ${sig}】`);
    sections.push(`  包含 ${rs.length} 个相关仓库：`);
    rs.forEach((r, j) => {
      sections.push(`    ${j + 1}. ${stripHtmlTags(r.name)} (匹配度: ${r.socre?.toFixed(2) || 'N/A'})`);
    });
    i++;
  }

  sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  sections.push(`共找到 ${Object.keys(sigGroups).length} 个 SIG 组，${repos.length} 个相关仓库`);
  sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
  sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  return sections.join("\n");
}

// 格式化 maintainer 查询结果
function formatMaintainerResult(sigName, giteeIds) {
  const sections = [];
  sections.push(`
╔════════════════════════════════════════════════════════════╗
║  Maintainer "${sigName}" 的搜索结果                           ║
╚════════════════════════════════════════════════════════════╝`);

  giteeIds.forEach((item, i) => {
    sections.push(`\n【结果 ${i + 1}】`);
    sections.push(`  Maintainer: ${stripHtmlTags(item.name)}`);
    sections.push(`  所属 SIG: ${extractSigName(item.path)}`);
    sections.push(`  SIG 路径: ${item.path}`);
    sections.push(`  匹配度: ${item.socre?.toFixed(2) || 'N/A'}`);
  });

  sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  sections.push(`共找到 ${giteeIds.length} 条结果`);
  sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
  sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  return sections.join("\n");
}

// 工具定义
export const toolDefinition = {
  name: "get_sig_info",
  description: `查询 openEuler 技术特别兴趣小组（Technical SIG）的详细信息，支持 SIG 信息查询、成员贡献统计、仓库归属查询、maintainer 归属查询。

⚠️ 重要区分：
- 本工具用于查询【技术 SIG】：如 Kernel SIG、Cloud SIG、AI SIG 等技术工作组
- 如需查询【治理委员会】：如技术委员会、品牌委员会等，请使用 get_organization_info 工具

**查询模式：**

1. 智能查询（默认）：query_type = "sig"
   - 自动按顺序尝试：SIG 查询 → 仓库查询 → Maintainer 查询
   - SIG 查询支持模糊搜索，当名称不明确时自动从 SIG 列表推荐相近名称
   - 如果 SIG 查询无结果，自动尝试作为仓库名/maintainer 查询

2. 贡献统计查询：query_type = "contribute"
   - 查询指定 SIG 组成员的贡献数据（PR、Issue、评审评论）
   - 需提供 sig_name（SIG 名称）和 contribute_type（贡献类型）
   - 自动对 SIG 名称进行大小写修正，名称不明确时给出推荐
   - contribute_type:
     - "pr": PR 合并请求数量排行
     - "issue": Issue 需求&评审数量排行
     - "comment": 评审评论数量排行
     - "all": 一次性查询全部三种类型

3. 仓库查询：query_type = "repos"
   - 输入仓库名称，查询该仓库属于哪些 SIG 组

4. Maintainer 查询：query_type = "maintainer"
   - 输入 maintainer 的 Gitee ID，查询参与了哪些 SIG 组

**使用场景：**
- 查询某个技术 SIG 的基本信息（名称、描述、Maintainers、仓库列表）
- 查询某个 SIG 的成员贡献排行（PR/Issue/评审）
- 查询某个仓库属于哪些 SIG 组
- 查询某个 maintainer 参与了哪些 SIG 组

**常见技术 SIG 名称示例：**
Kernel、ai、Compiler、Networking、Security、Storage、BigData、Virt、sig-SDS、sig-UKUI

**示例问题：**
- "Kernel SIG 的维护者是谁？"
- "ai SIG 管理哪些仓库？"
- "kernel 仓库属于哪些 SIG 组？"
- "gzbang 这个 maintainer 参与了哪些 SIG？"
- "bigdata SIG 的成员 PR 贡献排行"
- "查询 ai SIG 的 Issue 贡献情况"
- "big-data SIG 的全部贡献统计"`,
  inputSchema: {
    type: "object",
    required: ["sig_name"],
    properties: {
      sig_name: {
        type: "string",
        description: "查询关键词。可以是 SIG 名称（如 'Kernel'、'ai'、'BigData'）、仓库名称（如 'kernel'、'gcc'）、或 maintainer 的 Gitee ID（如 'gzbang'）。系统会自动进行大小写修正和模糊匹配。",
      },
      query_type: {
        type: "string",
        enum: ["sig", "repos", "maintainer", "contribute"],
        description: "查询类型：'sig'（智能查询，默认）、'repos'（仓库归属查询）、'maintainer'（maintainer 归属查询）、'contribute'（SIG 成员贡献统计）。",
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
