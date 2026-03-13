/**
 * @created 2026-03-11 by sig-OpenDesign with Claude AI
 * @description openUBMC 社区应用信息查询工具，支持应用列表查询和包详情查询
 */

// 数据源 URL
const LIST_URL = "https://www.openubmc.cn/api-easysoftware/internal/v1/list";
const DETAIL_URL = "https://www.openubmc.cn/api-easysoftware/internal/v1/detail";

// 应用类型标签
const TYPE_LABELS = {
  tooling: "开发工具",
  application: "社区组件",
};

// 列表缓存（缓存完整列表，用于名称模糊匹配）
let cachedList = null;
let listCacheExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 清除缓存（仅供测试使用）
export function _resetCache() {
  cachedList = null;
  listCacheExpiry = 0;
}

/**
 * 计算两个字符串的编辑距离（Levenshtein distance）
 */
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * 从候选列表中找最相近的条目（大小写不敏感 + 编辑距离）
 * 返回 { exact, caseMatch, suggestions }
 */
function findBestMatches(input, candidates, keyFn = (x) => x) {
  const inputLower = input.toLowerCase();

  // 精确匹配
  const exact = candidates.find((c) => keyFn(c) === input);
  if (exact) return { exact, caseMatch: null, suggestions: [] };

  // 大小写不同
  const caseMatch = candidates.find((c) => keyFn(c).toLowerCase() === inputLower);
  if (caseMatch) return { exact: null, caseMatch, suggestions: [] };

  // 模糊匹配：包含子串 或 编辑距离 ≤ 3（取前 5 个）
  const scored = candidates
    .map((c) => {
      const key = keyFn(c);
      const keyLower = key.toLowerCase();
      const dist = editDistance(inputLower, keyLower);
      const contains = keyLower.includes(inputLower) || inputLower.includes(keyLower);
      return { item: c, key, dist, contains };
    })
    .filter(({ dist, contains }) => contains || dist <= 3)
    .sort((a, b) => {
      if (a.contains !== b.contains) return a.contains ? -1 : 1;
      return a.dist - b.dist;
    })
    .slice(0, 5);

  return { exact: null, caseMatch: null, suggestions: scored.map((s) => s.item) };
}

/**
 * 获取所有应用列表（带缓存）
 */
async function fetchAppList() {
  const now = Date.now();
  if (cachedList && now < listCacheExpiry) return cachedList;

  const response = await fetch(LIST_URL, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`获取应用列表失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  // 兼容多种 API 响应结构
  let list = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && Array.isArray(data.data)) {
    list = data.data;
  } else if (data && data.data && Array.isArray(data.data.list)) {
    list = data.data.list;
  }

  cachedList = list;
  listCacheExpiry = now + CACHE_DURATION;
  return list;
}

/**
 * 获取指定包的详情（指定版本）
 */
async function fetchAppDetail(pkgName, version) {
  const url = `${DETAIL_URL}/${encodeURIComponent(pkgName)}/${encodeURIComponent(version)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`获取包详情失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  // 兼容多种 API 响应结构
  if (data && data.data !== undefined) return data.data;
  return data;
}

/**
 * 格式化应用列表输出
 */
function formatAppList(list, filterType) {
  const typeLabel = filterType ? TYPE_LABELS[filterType] || filterType : "全部";

  let filtered = list;
  if (filterType) {
    filtered = list.filter((item) => item.type === filterType);
  }

  const tooling = list.filter((i) => i.type === "tooling");
  const application = list.filter((i) => i.type === "application");

  let out = `=== openUBMC 社区应用列表 ===\n\n`;
  out += `📦 应用总览：共 ${list.length} 个（开发工具 ${tooling.length} 个，社区组件 ${application.length} 个）\n`;
  if (filterType) out += `🔍 当前筛选：${typeLabel}（${filtered.length} 个）\n`;
  out += `\n`;

  const groups = filterType
    ? { [filterType]: filtered }
    : { tooling: tooling, application: application };

  for (const [type, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    const label = TYPE_LABELS[type] || type;
    out += `### ${label}（${items.length} 个）\n\n`;
    items.slice(0, 20).forEach((item, i) => {
      const name = item.name || item.pkg_name || item.packageName || "未知";
      const version = item.version || item.default_version || item.defaultVersion || "";
      const desc = item.description || item.desc || "";
      const shortDesc = desc.length > 60 ? desc.slice(0, 60) + "…" : desc;
      const newBadge = item.is_new ? " 🆕" : "";
      out += `  ${i + 1}. **${name}**${newBadge}`;
      if (version) out += `  \`${version}\``;
      if (shortDesc) out += `\n     ${shortDesc}`;
      out += `\n`;
    });
    if (items.length > 20) {
      out += `  ... 还有 ${items.length - 20} 个，可用 package_name 参数查询具体包\n`;
    }
    out += `\n`;
  }

  out += `---\n`;
  out += `💡 提示：可通过 package_name 参数查询具体包的详细信息和版本列表。\n`;
  out += `数据来源: openUBMC EasySoftware\n`;
  out += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
  return out;
}

/**
 * 格式化包未找到时的推荐输出
 */
function formatPackageNotFound(input, suggestions, allList) {
  let out = `未找到名称为 "${input}" 的应用包。\n\n`;

  if (suggestions.length > 0) {
    out += `🔍 您是否在找以下包？\n\n`;
    suggestions.forEach((item, i) => {
      const name = item.name || item.pkg_name || item.packageName || "未知";
      const version = item.version || item.default_version || item.defaultVersion || "";
      const typeLabel = TYPE_LABELS[item.type] || item.type || "";
      out += `  ${i + 1}. **${name}**`;
      if (version) out += `  \`${version}\``;
      if (typeLabel) out += `  （${typeLabel}）`;
      out += `\n`;
    });
  } else {
    out += `📦 当前共有 ${allList.length} 个应用包，以下为完整列表：\n\n`;
    allList.slice(0, 30).forEach((item, i) => {
      const name = item.name || item.pkg_name || item.packageName || "未知";
      const typeLabel = TYPE_LABELS[item.type] || item.type || "";
      out += `  ${i + 1}. ${name}（${typeLabel}）\n`;
    });
    if (allList.length > 30) {
      out += `  ... 还有 ${allList.length - 30} 个，建议使用 list_type 参数筛选分类\n`;
    }
  }

  out += `\n💡 提示：包名匹配不区分大小写，也可尝试部分名称搜索。\n`;
  return out;
}

/**
 * 格式化版本未找到时的输出
 */
function formatVersionNotFound(pkgName, requestedVersion, availableVersions) {
  let out = `包 "${pkgName}" 中不存在版本 "${requestedVersion}"。\n\n`;
  out += `📋 可用版本列表（共 ${availableVersions.length} 个）：\n\n`;

  // 尝试找最相近的版本
  const { suggestions } = findBestMatches(requestedVersion, availableVersions);
  if (suggestions.length > 0) {
    out += `🔍 您是否在找以下版本？\n`;
    suggestions.forEach((v, i) => { out += `  ${i + 1}. \`${v}\`\n`; });
    out += `\n`;
  }

  out += `所有版本：\n`;
  availableVersions.forEach((v, i) => { out += `  ${i + 1}. \`${v}\`\n`; });
  out += `\n💡 请使用上方版本号重新查询。\n`;
  return out;
}

/**
 * 格式化包详情输出
 */
function formatAppDetail(pkgName, version, detail, availableVersions) {
  const typeLabel = TYPE_LABELS[detail.type] || detail.type || "";

  let out = ``;
  out += `╔═══════════════════════════════════════════════════════════╗\n`;
  out += `║  ${(pkgName + " " + version).padEnd(57)}║\n`;
  out += `╚═══════════════════════════════════════════════════════════╝\n\n`;

  if (typeLabel) out += `【类型】${typeLabel}\n`;

  const name = detail.name || detail.pkg_name || pkgName;
  const desc = detail.description || detail.desc || "";
  const descEn = detail.description_en || "";
  const homepage = detail.homepage || detail.url || detail.website || "";
  const repoUrl = detail.repo_url || "";
  const license = detail.license || "";
  const arch = detail.arch || detail.architecture || "";
  const os = detail.os || detail.platform || "";
  const size = detail.size || detail.pkg_size || "";
  const publishTime = detail.publish_time || detail.publishTime || detail.updated_at || detail.updatedAt || "";
  const downloadUrl = detail.download_url || detail.downloadUrl || "";
  const downloadCmd = detail.download_cmd || "";
  const appVersion = detail.app_version || "";
  const releaseNote = detail.release_note || "";
  const sha256 = detail.sha256 || detail.checksum || "";

  if (name && name !== pkgName) out += `【名称】${name}\n`;
  if (appVersion) out += `【应用版本】${appVersion}\n`;
  if (detail.is_new) out += `【状态】🆕 新上架\n`;
  if (desc) out += `【描述】${desc}\n`;
  if (descEn) out += `【描述（英文）】${descEn}\n`;

  // 安装指引（usage 可能是数组或字符串）
  const usageRaw = detail.usage || detail.install || detail.installGuide || detail.install_guide || "";
  const usage = Array.isArray(usageRaw) ? usageRaw.join("") : usageRaw;
  if (usage) {
    out += `\n【安装指引】\n${usage}\n`;
  }

  const usageEnRaw = detail.usage_en || "";
  const usageEn = Array.isArray(usageEnRaw) ? usageEnRaw.join("") : usageEnRaw;
  if (usageEn) {
    out += `\n【安装指引（英文）】\n${usageEn}\n`;
  }

  // 下载命令（比 download_url 更实用）
  if (downloadCmd) out += `\n【安装命令】\n${downloadCmd}\n`;

  if (homepage) out += `【主页】${homepage}\n`;
  if (repoUrl && repoUrl !== homepage) out += `【代码仓库】${repoUrl}\n`;
  if (downloadUrl) out += `【下载地址】${downloadUrl}\n`;
  if (detail.download_url_cpio) out += `【下载地址（CPIO）】${detail.download_url_cpio}\n`;
  if (detail.download_desc) out += `【下载说明】${detail.download_desc}\n`;
  if (detail.download_desc_en) out += `【下载说明（英文）】${detail.download_desc_en}\n`;
  if (license) out += `【许可证】${license}${detail.license_en && detail.license_en !== license ? ` (${detail.license_en})` : ""}\n`;
  if (detail.dependency) out += `【依赖】${typeof detail.dependency === "object" ? JSON.stringify(detail.dependency) : detail.dependency}\n`;

  // maintainer 可能是对象 {SiG, email, gitcode}、对象数组、或字符串
  const maintainerRaw = detail.maintainer || detail.maintainers;
  if (maintainerRaw) {
    if (typeof maintainerRaw === "string") {
      out += `【维护者】${maintainerRaw}\n`;
    } else if (Array.isArray(maintainerRaw)) {
      out += `【维护者】${maintainerRaw.map(m => (typeof m === "string" ? m : (m.gitee_id || m.name || JSON.stringify(m)))).join(", ")}\n`;
    } else if (typeof maintainerRaw === "object") {
      const parts = [];
      if (maintainerRaw.SiG) parts.push(`SIG: ${maintainerRaw.SiG}`);
      if (maintainerRaw.email) parts.push(`邮箱: ${maintainerRaw.email}`);
      if (maintainerRaw.gitcode) parts.push(`仓库: ${maintainerRaw.gitcode}`);
      out += `【维护者】${parts.join("  ")}\n`;
    }
  }

  if (arch) out += `【架构】${arch}\n`;
  if (os) out += `【操作系统】${os}\n`;
  if (size) out += `【大小】${size}\n`;
  if (publishTime) out += `【发布时间】${publishTime}\n`;
  if (sha256) out += `【SHA256】${sha256}\n`;
  if (releaseNote) out += `【Release Notes】${releaseNote}\n`;

  // 输出其他未覆盖的字段（过滤已处理和内部字段）
  const handledKeys = new Set([
    "type", "name", "pkg_name", "description", "desc", "description_en",
    "homepage", "url", "website", "repo_url",
    "license", "license_en", "maintainer", "maintainers",
    "arch", "architecture", "os", "platform",
    "size", "pkg_size", "publish_time", "publishTime", "updated_at", "updatedAt",
    "download_url", "downloadUrl", "download_cmd", "download_url_cpio",
    "download_desc", "download_desc_en",
    "sha256", "checksum", "version", "versions", "version_list",
    "default_version", "defaultVersion", "app_version",
    "usage", "install", "installGuide", "install_guide", "usage_en",
    "release_note", "is_new", "dependency",
  ]);
  const extraFields = Object.entries(detail).filter(
    ([k, v]) => !handledKeys.has(k) && v !== null && v !== undefined && v !== "" && !Array.isArray(v) && typeof v !== "object"
  );
  if (extraFields.length > 0) {
    out += `\n【其他信息】\n`;
    extraFields.slice(0, 10).forEach(([k, v]) => { out += `  ${k}: ${v}\n`; });
  }

  // 版本列表
  if (availableVersions && availableVersions.length > 0) {
    out += `\n【可用版本】（共 ${availableVersions.length} 个）\n`;
    availableVersions.forEach((v, i) => {
      const marker = v === version ? " ← 当前版本" : "";
      out += `  ${i + 1}. \`${v}\`${marker}\n`;
    });
  }

  out += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  out += `数据来源: openUBMC EasySoftware\n`;
  out += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  return out;
}

/**
 * 从详情数据中提取可用版本列表
 */
function extractVersions(detail) {
  // 尝试常见字段名
  if (Array.isArray(detail.versions)) return detail.versions;
  if (Array.isArray(detail.version_list)) return detail.version_list;
  if (Array.isArray(detail.versionList)) return detail.versionList;
  // 版本对象数组
  if (Array.isArray(detail.version) && typeof detail.version[0] === "object") {
    return detail.version.map((v) => v.name || v.version || v.tag || String(v));
  }
  return [];
}

/**
 * 主查询函数：查询 openUBMC 社区应用信息
 * @param {string} queryType - "list" | "detail"
 * @param {string} packageName - 包名（detail 模式必需）
 * @param {string} version - 版本号（detail 模式可选，不传则使用默认版本）
 * @param {string} listType - 列表筛选类型（list 模式可选："tooling" | "application"）
 */
export async function getAppInfo(queryType = "list", packageName = "", version = "", listType = "") {
  try {
    // ===== 列表查询 =====
    if (queryType === "list") {
      const list = await fetchAppList();
      if (!list || list.length === 0) {
        return "暂无应用数据，请稍后重试。";
      }
      return formatAppList(list, listType);
    }

    // ===== 详情查询 =====
    if (queryType === "detail") {
      if (!packageName) {
        return "查询详情时必须提供 package_name 参数。";
      }

      // 1. 先获取列表，进行包名模糊匹配
      const list = await fetchAppList();
      const getPkgName = (item) => item.name || item.pkg_name || item.packageName || "";

      const { exact, caseMatch, suggestions } = findBestMatches(packageName, list, getPkgName);

      let resolvedItem = exact || caseMatch;

      if (!resolvedItem) {
        return formatPackageNotFound(packageName, suggestions, list);
      }

      const resolvedName = getPkgName(resolvedItem);

      // 2. 确定版本：未指定则使用默认版本
      const defaultVersion = resolvedItem.version || resolvedItem.default_version || resolvedItem.defaultVersion || "";
      const targetVersion = version || defaultVersion;

      if (!targetVersion) {
        return `包 "${resolvedName}" 未找到默认版本信息，请通过 version 参数指定版本号。`;
      }

      // 3. 获取详情
      const detail = await fetchAppDetail(resolvedName, targetVersion);

      if (!detail) {
        return `未能获取包 "${resolvedName}" 版本 "${targetVersion}" 的详情，请稍后重试。`;
      }

      // 4. 提取可用版本列表
      const availableVersions = extractVersions(detail);

      // 5. 若指定了版本，校验版本是否存在
      if (version && availableVersions.length > 0) {
        const { exact: vExact, caseMatch: vCaseMatch } = findBestMatches(version, availableVersions);
        if (!vExact && !vCaseMatch) {
          return formatVersionNotFound(resolvedName, version, availableVersions);
        }
        // 若大小写不同，使用正确的版本重新获取
        if (!vExact && vCaseMatch) {
          const correctedDetail = await fetchAppDetail(resolvedName, vCaseMatch);
          const correctedVersions = extractVersions(correctedDetail || {});
          return formatAppDetail(resolvedName, vCaseMatch, correctedDetail || detail, correctedVersions.length > 0 ? correctedVersions : availableVersions);
        }
      }

      return formatAppDetail(resolvedName, targetVersion, detail, availableVersions);
    }

    return `不支持的查询类型 "${queryType}"，请使用 "list" 或 "detail"。`;
  } catch (e) {
    if (e.name === "AbortError") return "网络请求超时，请稍后重试。";
    return `查询应用信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_app_info",
  description: `查询 openUBMC 社区发布的可安装软件包，包括开发工具（tooling）和社区组件（application）的列表及详情。

**本工具专门用于软件包查询，包含安装指引、下载地址、版本列表等信息。**
如果用户询问的是文档内容、使用教程、架构说明，请用 get_doc_info，不要用本工具。

**查询模式：**

1. 列表查询（默认）：query_type = "list"
   - 获取所有社区应用的概览（名称、版本、类型、描述）
   - 可通过 list_type 筛选：tooling（开发工具）或 application（社区组件）
   - 不传 list_type 则返回全部两类应用

2. 详情查询：query_type = "detail"
   - 查询指定包的完整信息（描述、安装指引、许可证、架构、下载地址等）
   - 返回该包的所有可用版本列表
   - 不传 version 则使用该包的默认版本
   - 包名不区分大小写，支持模糊匹配（编辑距离）
   - 若包名不存在，返回相似包名推荐或完整列表
   - 若版本不存在，返回可用版本列表及相近版本推荐

**应用类型说明：**
- tooling：开发工具（如 IDE、编译器、调试工具等）
- application：社区组件（如服务框架、中间件、库等）

**使用场景（以下情况必须用本工具，不要用 get_doc_info）：**
- 查询 openUBMC 有哪些应用、组件、工具可以安装
- 查询某个软件包的版本号、下载地址、安装方法
- 了解某个包有哪些可用版本
- 查找开发工具或社区组件的详情

**不适用场景：**
- 查询文档、教程、API 参考 → 请用 get_doc_info

**示例问题：**
- "openUBMC 有哪些应用或组件？"
- "openUBMC 有哪些开发工具可以安装？"
- "BMC Studio 怎么安装？"
- "BMC Studio 的最新版本是什么？"
- "查询 BMC Studio 25.12 的详细信息和安装方法"
- "openUBMC 的社区组件有哪些？"`,
  inputSchema: {
    type: "object",
    properties: {
      query_type: {
        type: "string",
        enum: ["list", "detail"],
        description: "查询类型：'list'（应用列表，默认）、'detail'（包详情）。",
        default: "list",
      },
      package_name: {
        type: "string",
        description: "包名（query_type 为 'detail' 时必需）。不区分大小写，支持模糊匹配，如 'BMC Studio'、'bmc studio'。",
      },
      version: {
        type: "string",
        description: "版本号（query_type 为 'detail' 时可选）。不传则使用该包的默认版本。若指定版本不存在，将返回可用版本列表。",
      },
      list_type: {
        type: "string",
        enum: ["tooling", "application"],
        description: "列表筛选类型（query_type 为 'list' 时可选）：'tooling'（开发工具）、'application'（社区组件）。不传则返回全部。",
      },
    },
  },
};
