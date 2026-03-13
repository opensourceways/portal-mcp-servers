// 查询 openEuler 下载信息

// 查询镜像仓列表
async function getMirrorList() {
  const url = "https://www.openeuler.openatom.cn/api/mirrors/?mirrorstats=true";

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (response.ok) {
    return await response.json();
  }

  throw new Error(`API 返回错误状态码：${response.status}`);
}

// 查询所有版本信息
async function getAllVersions() {
  const url = "https://www.openeuler.openatom.cn/api/mirrors/";

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (response.ok) {
    const data = await response.json();
    return data.RepoVersion || [];
  }

  throw new Error(`API 返回错误状态码：${response.status}`);
}

// 查询特定路径的下载文件信息
async function getFilesByPath(path) {
  const url = `https://www.openeuler.openatom.cn/api/mirrors/${path}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (response.ok) {
    const text = await response.text();
    if (text === "Not Found") {
      return null;
    }
    return JSON.parse(text);
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(`API 返回错误状态码：${response.status}`);
}

// 模糊搜索下载文件
async function fuzzySearchFiles(keyword) {
  // 获取所有版本
  const versions = await getAllVersions();
  const results = [];

  // 在每个版本中搜索
  for (const version of versions.slice(0, 5)) { // 限制搜索前5个版本，避免超时
    try {
      const data = await getFilesByPath(version.Version);
      if (data && data.FileTree) {
        // 在文件树中搜索匹配的文件
        for (const scenario of data.FileTree) {
          if (scenario.Tree) {
            for (const file of scenario.Tree) {
              if (file.Name && file.Name.toLowerCase().includes(keyword.toLowerCase())) {
                results.push({
                  version: version.Version,
                  scenario: scenario.Scenario,
                  arch: scenario.Arch,
                  file: file,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      // 忽略单个版本的错误，继续搜索其他版本
    }
  }

  return results;
}

// 格式化文件大小
function formatSize(size) {
  if (!size) return "N/A";
  return size;
}

// 主查询函数
export async function getDownloadInfo(query, queryType = "auto") {
  try {
    // 查询镜像仓列表
    if (queryType === "mirrors") {
      const mirrors = await getMirrorList();

      if (mirrors && mirrors.length > 0) {
        const sections = [];
        sections.push(`
╔════════════════════════════════════════════════════════════╗
║  openEuler 镜像仓列表                                      ║
╚════════════════════════════════════════════════════════════╝`);

        sections.push(`\n共找到 ${mirrors.length} 个镜像站点\n`);

        // 只显示启用的镜像
        const enabledMirrors = mirrors.filter(m => m.Enabled);

        enabledMirrors.forEach((mirror, i) => {
          sections.push(`\n【镜像 ${i + 1}】`);
          if (mirror.Name) sections.push(`  名称: ${mirror.Name}`);
          if (mirror.HttpURL) sections.push(`  URL: ${mirror.HttpURL}`);
          if (mirror.Country) sections.push(`  国家: ${mirror.Country}`);
          if (mirror.SponsorName) sections.push(`  赞助商: ${mirror.SponsorName}`);
          if (mirror.NetworkBandwidth) sections.push(`  带宽: ${mirror.NetworkBandwidth} Mbps`);
          if (mirror.LastSync && mirror.LastSync !== "0001-01-01T00:00:00Z") {
            sections.push(`  最后同步: ${mirror.LastSync}`);
          }
        });

        sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        sections.push(`提示: 显示 ${enabledMirrors.length} 个已启用的镜像站点`);
        sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
        sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        return sections.join("\n");
      } else {
        return "未找到镜像仓信息。";
      }
    }

    // 查询所有版本列表
    if (queryType === "versions") {
      const versions = await getAllVersions();

      if (versions && versions.length > 0) {
        const sections = [];
        sections.push(`
╔════════════════════════════════════════════════════════════╗
║  openEuler 版本列表                                        ║
╚════════════════════════════════════════════════════════════╝`);

        sections.push(`\n共找到 ${versions.length} 个版本\n`);

        versions.forEach((version, i) => {
          sections.push(`\n【版本 ${i + 1}】`);
          sections.push(`  版本号: ${version.Version}`);
          sections.push(`  LTS: ${version.LTS ? '是' : '否'}`);
          if (version.Arch && version.Arch.length > 0) {
            sections.push(`  支持架构: ${version.Arch.join(', ')}`);
          }
          if (version.Scenario && version.Scenario.length > 0) {
            sections.push(`  场景: ${version.Scenario.join(', ')}`);
          }
        });

        sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
        sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        return sections.join("\n");
      } else {
        return "未找到版本信息。";
      }
    }

    // 查询特定版本的下载文件
    // 首先尝试直接查询
    const directResult = await getFilesByPath(query);

    if (directResult && directResult.FileTree) {
      const sections = [];
      sections.push(`
╔════════════════════════════════════════════════════════════╗
║  ${query} 下载信息                                          ║
╚════════════════════════════════════════════════════════════╝`);

      sections.push(`\n路径: ${directResult.FileInfo.Path}\n`);

      directResult.FileTree.forEach((scenario, i) => {
        sections.push(`\n【场景 ${i + 1}: ${scenario.Scenario} - ${scenario.Arch}】`);

        if (scenario.Tree && scenario.Tree.length > 0) {
          sections.push(`  包含 ${scenario.Tree.length} 个文件：\n`);

          scenario.Tree.forEach((file, j) => {
            sections.push(`  ${j + 1}. ${file.Name}`);
            if (file.Size) sections.push(`     大小: ${file.Size}`);
            if (file.Path) sections.push(`     路径: ${file.Path}`);
            if (file.ShaCode) sections.push(`     SHA256: ${file.ShaCode.substring(0, 16)}...`);
          });
        }
      });

      sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
      sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return sections.join("\n");
    }

    // 如果直接查询失败，尝试模糊搜索
    const fuzzyResults = await fuzzySearchFiles(query);

    if (fuzzyResults.length > 0) {
      const sections = [];
      sections.push(`
╔════════════════════════════════════════════════════════════╗
║  "${query}" 的模糊搜索结果                                  ║
╚════════════════════════════════════════════════════════════╝`);

      sections.push(`\n共找到 ${fuzzyResults.length} 个匹配的文件\n`);

      fuzzyResults.slice(0, 20).forEach((result, i) => {
        sections.push(`\n【结果 ${i + 1}】`);
        sections.push(`  版本: ${result.version}`);
        sections.push(`  场景: ${result.scenario}`);
        sections.push(`  架构: ${result.arch}`);
        sections.push(`  文件名: ${result.file.Name}`);
        if (result.file.Size) sections.push(`  大小: ${result.file.Size}`);
        if (result.file.Path) sections.push(`  路径: ${result.file.Path}`);
      });

      if (fuzzyResults.length > 20) {
        sections.push(`\n... 还有 ${fuzzyResults.length - 20} 个结果未显示`);
      }

      sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      sections.push(`提示: 如果需要查看特定版本，请使用完整的版本号查询`);
      sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
      sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return sections.join("\n");
    }

    return `未找到与 "${query}" 相关的下载信息。请尝试使用完整的版本号（如 openEuler-24.03-LTS）或使用 query_type="versions" 查看所有可用版本。`;

  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `查询下载信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_download_info",
  description: `查询 openEuler 下载信息、镜像仓列表和版本信息。

**查询模式：**

1. 自动查询（默认）：query_type = "auto" 或不指定
   - 输入版本号（如 openEuler-24.03-LTS）查询该版本的所有下载文件
   - 输入关键词进行模糊搜索，在多个版本中查找匹配的文件
   - 支持智能匹配，自动尝试直接查询和模糊搜索

2. 查询镜像仓列表：query_type = "mirrors"
   - 返回所有可用的 openEuler 镜像站点信息
   - 包括镜像 URL、国家、赞助商、带宽等信息
   - 只显示已启用的镜像站点

3. 查询版本列表：query_type = "versions"
   - 返回所有可用的 openEuler 版本
   - 包括版本号、是否 LTS、支持的架构和场景

**使用场景：**
- 查询特定版本的 ISO 镜像下载信息
- 查找某个文件在哪些版本中可用
- 获取镜像站点列表，选择最快的下载源
- 查看所有可用的 openEuler 版本

**查询示例：**
- 版本查询：query = "openEuler-24.03-LTS"
- 模糊搜索：query = "dvd" 或 "aarch64"
- 镜像列表：query_type = "mirrors"
- 版本列表：query_type = "versions"

**返回信息包括：**
- 下载文件名、大小、路径
- SHA256 校验码
- 支持的架构（aarch64、x86_64 等）
- 场景类型（ISO、虚拟机镜像等）
- 镜像站点信息（URL、国家、带宽等）`,
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "查询关键词。可以是版本号（如 'openEuler-24.03-LTS'）、文件名称或关键词（如 'dvd'、'iso'）。当 query_type 为 'mirrors' 或 'versions' 时，此参数可以为空字符串。",
      },
      query_type: {
        type: "string",
        enum: ["auto", "mirrors", "versions"],
        description: "查询类型：'auto'（自动查询，默认）、'mirrors'（查询镜像仓列表）、'versions'（查询版本列表）。",
        default: "auto",
      },
    },
  },
};
