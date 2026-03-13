// 数据源 URL
const BASE_URL = "https://easysoftware.openeuler.openatom.cn/server/field";

// 缓存数据和过期时间（15分钟）
let cachedLifecycle = null;
let lifecycleExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 获取发行版生命周期信息
async function fetchEulerLifecycle() {
  const now = Date.now();

  // 如果缓存有效，直接返回缓存数据
  if (cachedLifecycle && now < lifecycleExpiry) {
    return cachedLifecycle;
  }

  // 从远程获取数据
  const response = await fetch(`${BASE_URL}?name=eulerLifecycle`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`获取发行版信息失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  // 更新缓存
  cachedLifecycle = data;
  lifecycleExpiry = now + CACHE_DURATION;

  return data;
}

// 查询软件包列表
async function fetchPackageList(keyword = "") {
  // 构建 URL，如果有 keyword 则添加到查询参数中
  let url = `${BASE_URL}?name=mainPage&pageSize=10&pageNum=1`;
  if (keyword && keyword.trim() !== "") {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`获取软件包列表失败：HTTP ${response.status}`);
  }

  return await response.json();
}

// 查询软件包详情
async function fetchPackageDetail(pkgIds) {
  // 构建查询参数，将 pkgIds 对象转换为 URL 参数
  const params = new URLSearchParams();

  // 字段转换：IMAGE -> appPkgId, OEPKG -> oepkgPkgId, RPM -> rpmPkgId
  const fieldMapping = {
    'IMAGE': 'appPkgId',
    'OEPKG': 'oepkgPkgId',
    'RPM': 'rpmPkgId'
  };

  for (const [key, value] of Object.entries(pkgIds)) {
    const paramName = fieldMapping[key];
    if (paramName && value) {
      params.append(paramName, value);
    }
  }

  const url = `${BASE_URL}/detail?${params.toString()}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`获取软件包详情失败：HTTP ${response.status}`);
  }

  return await response.json();
}

// 主查询函数
export async function getPackageInfo(query, queryType = "auto") {
  try {
    // 1. 查询发行版生命周期信息
    if (queryType === "lifecycle") {
      const data = await fetchEulerLifecycle();
      return formatLifecycleInfo(data);
    }

    // 2. 查询软件包列表
    if (queryType === "list") {
      const data = await fetchPackageList(query);
      return formatPackageList(data, query);
    }

    // 3. 查询具体软件包详情
    if (queryType === "detail") {
      // 先查询列表获取 pkgIds
      const listData = await fetchPackageList(query);

      if (!listData.data || !Array.isArray(listData.data)) {
        return `未找到软件包 "${query}"。`;
      }

      // 展开所有 children 数组
      let allPackages = [];
      listData.data.forEach(group => {
        if (group.children && Array.isArray(group.children)) {
          allPackages = allPackages.concat(group.children);
        }
      });

      if (allPackages.length === 0) {
        return `未找到软件包 "${query}"。`;
      }

      // 查找匹配的软件包（精确匹配或模糊匹配）
      const keyword = query.toLowerCase();
      let matchedPackage = allPackages.find(pkg =>
        pkg.name && pkg.name.toLowerCase() === keyword
      );

      if (!matchedPackage) {
        // 尝试模糊匹配
        matchedPackage = allPackages.find(pkg =>
          pkg.name && pkg.name.toLowerCase().includes(keyword)
        );
      }

      if (!matchedPackage) {
        // 如果没有匹配，返回模糊匹配的列表
        return `未找到精确匹配的软件包 "${query}"，以下是相关软件包：\n\n` +
               formatPackageList(listData, query);
      }

      // 获取 pkgIds
      if (!matchedPackage.pkgIds) {
        return `软件包 "${query}" 没有可用的详细信息。`;
      }

      // 查询详情
      const detailData = await fetchPackageDetail(matchedPackage.pkgIds);
      return formatPackageDetail(detailData, matchedPackage);
    }

    // 4. 自动查询模式（默认）
    if (queryType === "auto") {
      // 如果查询为空，返回发行版信息
      if (!query || query.trim() === "") {
        const data = await fetchEulerLifecycle();
        return formatLifecycleInfo(data);
      }

      // 否则查询软件包列表
      const data = await fetchPackageList(query);

      if (!data.data || !Array.isArray(data.data)) {
        return `未找到与 "${query}" 相关的软件包。`;
      }

      // 展开所有 children 数组
      let allPackages = [];
      data.data.forEach(group => {
        if (group.children && Array.isArray(group.children)) {
          allPackages = allPackages.concat(group.children);
        }
      });

      if (allPackages.length === 0) {
        return `未找到与 "${query}" 相关的软件包。`;
      }

      // 客户端过滤
      const keyword = query.toLowerCase();
      const filteredPackages = allPackages.filter(pkg =>
        (pkg.name && pkg.name.toLowerCase().includes(keyword)) ||
        (pkg.description && pkg.description.toLowerCase().includes(keyword))
      );

      if (filteredPackages.length === 0) {
        return `未找到与 "${query}" 相关的软件包。`;
      }

      // 如果只有一个结果，自动查询详情
      if (filteredPackages.length === 1) {
        const pkg = filteredPackages[0];
        if (pkg.pkgIds) {
          const detailData = await fetchPackageDetail(pkg.pkgIds);
          return formatPackageDetail(detailData, pkg);
        }
      }

      return formatPackageList(data, query);
    }

    return `不支持的查询类型：${queryType}`;

  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `查询软件包信息时发生错误：${e.message}`;
  }
}

// 格式化发行版生命周期信息
function formatLifecycleInfo(data) {
  if (!data || !data.data) {
    return "暂无发行版生命周期信息。";
  }

  let result = "=== openEuler 发行版生命周期信息 ===\n\n";

  if (Array.isArray(data.data)) {
    data.data.forEach((version, index) => {
      result += `${index + 1}. ${version.name || version.version || '未知版本'}\n`;
      if (version.releaseDate) {
        result += `   发布日期: ${version.releaseDate}\n`;
      }
      if (version.eolDate) {
        result += `   EOL 日期: ${version.eolDate}\n`;
      }
      if (version.status) {
        result += `   状态: ${version.status}\n`;
      }
      result += '\n';
    });
  } else {
    result += JSON.stringify(data.data, null, 2);
  }

  return result;
}

// 格式化软件包列表
function formatPackageList(data, query) {
  if (!data || !data.data) {
    return "暂无软件包信息。";
  }

  // API 返回的数据结构是 data: [{ children: [...] }]
  // 需要展开所有 children 数组
  let allPackages = [];
  if (Array.isArray(data.data)) {
    data.data.forEach(group => {
      if (group.children && Array.isArray(group.children)) {
        allPackages = allPackages.concat(group.children);
      }
    });
  }

  if (allPackages.length === 0) {
    return `未找到与 "${query}" 相关的软件包。`;
  }

  // 如果有 keyword，进行客户端过滤
  if (query && query.trim() !== "") {
    const keyword = query.toLowerCase();
    allPackages = allPackages.filter(pkg =>
      (pkg.name && pkg.name.toLowerCase().includes(keyword)) ||
      (pkg.description && pkg.description.toLowerCase().includes(keyword))
    );
  }

  if (allPackages.length === 0) {
    return `未找到与 "${query}" 相关的软件包。`;
  }

  // 限制显示数量为 10 个
  const displayPackages = allPackages.slice(0, 10);

  let result = `=== 软件包列表 ${query ? `(搜索: "${query}")` : ''} ===\n\n`;
  result += `共找到 ${allPackages.length} 个软件包${allPackages.length > 10 ? '，显示前 10 个' : ''}\n\n`;

  displayPackages.forEach((pkg, index) => {
    result += `${index + 1}. ${pkg.name || '未知软件包'}\n`;

    if (pkg.description) {
      // 限制描述长度
      const desc = pkg.description.length > 100
        ? pkg.description.substring(0, 100) + '...'
        : pkg.description;
      result += `   描述: ${desc}\n`;
    }

    if (pkg.version) {
      result += `   版本: ${pkg.version}\n`;
    }

    if (pkg.os) {
      result += `   系统: ${pkg.os}\n`;
    }

    if (pkg.arch) {
      result += `   架构: ${pkg.arch}\n`;
    }

    if (pkg.category) {
      result += `   分类: ${pkg.category}\n`;
    }

    if (pkg.maintainers) {
      const maintainerList = Object.values(pkg.maintainers).filter(m => m);
      if (maintainerList.length > 0) {
        result += `   维护者: ${maintainerList.join(', ')}\n`;
      }
    }

    // 显示可用的包类型
    if (pkg.pkgIds) {
      const types = Object.keys(pkg.pkgIds).filter(key => pkg.pkgIds[key]);
      if (types.length > 0) {
        result += `   可用类型: ${types.join(', ')}\n`;
      }
    }

    result += '\n';
  });

  return result;
}

// 格式化软件包详情
function formatPackageDetail(data, packageInfo) {
  let result = `=== 软件包详情: ${packageInfo.name} ===\n\n`;

  if (!data || !data.data) {
    result += "暂无详细信息。\n";
    return result;
  }

  const detail = data.data;

  // 基本信息
  result += "【基本信息】\n";
  if (packageInfo.name) result += `名称: ${packageInfo.name}\n`;
  if (packageInfo.version) result += `版本: ${packageInfo.version}\n`;
  if (packageInfo.description) result += `描述: ${packageInfo.description}\n`;
  if (packageInfo.category) result += `分类: ${packageInfo.category}\n`;
  if (packageInfo.os) result += `系统: ${packageInfo.os}\n`;
  if (packageInfo.arch) result += `架构: ${packageInfo.arch}\n`;
  result += '\n';

  // 遍历所有类型的包信息（RPM、OEPKG、IMAGE）
  const packageTypes = ['RPM', 'OEPKG', 'IMAGE'];

  packageTypes.forEach(type => {
    if (detail[type]) {
      const pkg = detail[type];
      result += `【${type} 包信息】\n`;

      // 基本信息
      if (pkg.name) result += `包名: ${pkg.name}\n`;
      if (pkg.appVer) result += `应用版本: ${pkg.appVer}\n`;
      if (pkg.version) result += `版本: ${pkg.version}\n`;
      if (pkg.release) result += `发布: ${pkg.release}\n`;
      if (pkg.arch) result += `架构: ${pkg.arch}\n`;
      if (pkg.summary) result += `摘要: ${pkg.summary}\n`;
      if (pkg.description) result += `描述: ${pkg.description}\n`;
      if (pkg.license) result += `许可证: ${pkg.license}\n`;
      if (pkg.url) result += `主页: ${pkg.url}\n`;

      // 安全分级
      if (pkg.security) {
        result += `安全分级: ${pkg.security}\n`;
      }

      // 维护者信息
      if (pkg.maintainerGiteeId) result += `维护者 Gitee ID: ${pkg.maintainerGiteeId}\n`;
      if (pkg.maintainerEmail) result += `维护者邮箱: ${pkg.maintainerEmail}\n`;

      // 分类
      if (pkg.category) result += `分类: ${pkg.category}\n`;

      result += '\n';

      // 安装指引
      if (pkg.installation) {
        result += "【安装指引】\n";
        result += pkg.installation + '\n\n';
      }

      // 下载说明
      if (pkg.download) {
        result += "【下载说明】\n";
        result += pkg.download + '\n\n';
      }

      // 环境要求
      if (pkg.environment) {
        result += "【环境要求】\n";
        result += pkg.environment + '\n\n';
      }

      // 镜像标签（仅 IMAGE 类型）
      if (type === 'IMAGE' && pkg.imageTags) {
        result += "【镜像标签】\n";
        result += pkg.imageTags + '\n\n';
      }

      // 依赖包
      if (pkg.dependencyPkgs) {
        try {
          const deps = typeof pkg.dependencyPkgs === 'string'
            ? JSON.parse(pkg.dependencyPkgs)
            : pkg.dependencyPkgs;
          if (Array.isArray(deps) && deps.length > 0) {
            result += "【依赖包】\n";
            deps.forEach(dep => {
              result += `  • ${dep}\n`;
            });
            result += '\n';
          }
        } catch (e) {
          // 解析失败，跳过
        }
      }

      // 相似软件包
      if (pkg.similarPkgs) {
        try {
          const similar = typeof pkg.similarPkgs === 'string'
            ? JSON.parse(pkg.similarPkgs)
            : pkg.similarPkgs;
          if (Array.isArray(similar) && similar.length > 0) {
            result += "【相似软件包】\n";
            similar.forEach(item => {
              if (typeof item === 'object') {
                Object.entries(item).forEach(([name, desc]) => {
                  result += `  • ${name}: ${desc}\n`;
                });
              }
            });
            result += '\n';
          }
        } catch (e) {
          // 解析失败，跳过
        }
      }
    }
  });

  // 如果没有找到任何包信息
  if (!detail.RPM && !detail.OEPKG && !detail.IMAGE) {
    result += "暂无详细的包信息。\n";
  }

  return result;
}

// 工具定义
export const toolDefinition = {
  name: "get_package_info",
  description: `查询 openEuler 社区发行版软件包信息。

本工具用于查询 openEuler 软件仓库中的软件包信息，包括发行版生命周期、软件包列表和详细信息。

**使用场景：**
- 查询 openEuler 发行版的生命周期信息
- 搜索软件包列表
- 查询特定软件包的详细信息（版本、依赖、文件列表等）
- 了解软件包的维护者和分类信息

**查询模式：**

1. 自动查询（默认）：query_type = "auto" 或不指定
   - 如果 query 为空，返回发行版生命周期信息
   - 如果 query 不为空，搜索软件包列表
   - 如果只有一个匹配结果，自动返回详细信息

2. 发行版信息：query_type = "lifecycle"
   - 返回 openEuler 各版本的生命周期信息
   - 包括发布日期、EOL 日期、支持状态等

3. 软件包列表：query_type = "list"
   - 搜索软件包列表
   - 返回软件包名称、版本、描述、维护者等基本信息

4. 软件包详情：query_type = "detail"
   - 查询特定软件包的详细信息
   - 包括 RPM、OEPKG、IMAGE 等不同类型的包信息
   - 显示依赖关系和文件列表

**查询示例：**
- 查询发行版信息：query_type = "lifecycle"
- 搜索 kernel 相关包：query = "kernel", query_type = "list"
- 查询 redis 详情：query = "redis", query_type = "detail"
- 自动查询：query = "nginx"（自动判断返回列表或详情）

**返回信息包括：**
- 发行版：版本号、发布日期、EOL 日期、支持状态
- 软件包列表：名称、版本、描述、分类、维护者、可用类型
- 软件包详情：完整的包信息、依赖关系、文件列表、许可证等`,
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "查询关键词。可以是软件包名称（如 'kernel'、'redis'、'nginx'），或为空字符串（查询发行版信息）。"
      },
      query_type: {
        type: "string",
        enum: ["auto", "lifecycle", "list", "detail"],
        description: "查询类型：'auto'（自动查询，默认）、'lifecycle'（发行版信息）、'list'（软件包列表）、'detail'（软件包详情）。",
        default: "auto"
      }
    }
  }
};
