// 获取 openEuler 文档版本信息
export async function getDocsVersion() {
  try {
    const url = `https://docs.openeuler.openatom.cn/docs-version.json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const data = await response.json();

      if (Array.isArray(data)) {
        const sections = [];
        sections.push(`
╔════════════════════════════════════════════════════════════╗
║  openEuler 文档版本查询结果                               ║
╚════════════════════════════════════════════════════════════╝`);

        sections.push(`\n共找到 ${data.length} 个文档版本\n`);

        // 按版本号排序
        const sortedVersions = [...data].sort((a, b) => {
          return b.value.localeCompare(a.value);
        });

        sortedVersions.forEach((item, index) => {
          // 生成git仓库地址
          let gitUrl;
          if (item.branch && item.branch.startsWith('stable-')) {
            gitUrl = `https://atomgit.com/openeuler/docs/tree/${item.branch}`;
          } else if (item.branch && item.branch.startsWith('stable2-')) {
            gitUrl = `https://atomgit.com/openeuler/docs-centralized/tree/${item.branch}`;
          } else {
            gitUrl = `未知仓库`;
          }

          sections.push(`\n【文档版本 ${index + 1}】`);
          sections.push(`  标签 (label): ${item.label}`);
          sections.push(`  版本号 (value): ${item.value}`);
          sections.push(`  是否终止支持 (eom): ${item.eom ? '是' : '否'}`);
          sections.push(`  分支名 (branch): ${item.branch}`);
          sections.push(`  文档仓库地址: ${gitUrl}`);
        });

        sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
        sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        return sections.join("\n");
      } else {
        return `获取文档版本信息失败：返回数据格式不正确，期望数组格式。`;
      }
    } else {
      return `获取文档版本信息时 API 返回错误状态码：${response.status}`;
    }
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `获取文档版本信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_docs_version",
  description: `获取 openEuler 文档版本信息。

该工具从 /docs-version.json 地址获取文档版本信息，返回文档版本数组及其对应的文档仓库地址。

**使用场景：**
- 了解 openEuler 可用的文档版本
- 获取文档版本的标签、版本号、终止支持状态和分支名
- 获取对应版本的文档仓库地址
- 为文档访问和开发提供版本选择依据
- openEuler 版本和文档版本是一致，当用户查询版本相关信息时，也可使用该接口

**返回信息包括：**
- 标签 (label)：显示标签（如 20.03 LTS）
- 版本号 (value)：对应的版本号（如 20.03_LTS）
- 是否终止支持 (eom)：表示版本是否已终止支持
- 分支名 (branch)：版本分支标识符（如 stable2-20.03_LTS）
- Git 仓库地址：根据分支名生成的仓库地址
  - stable- 开头的分支：使用 docs 仓库，格式为 https://atomgit.com/openeuler/docs/tree/{branchName}
  - stable2- 开头的分支：使用 docs-centralized 仓库，格式为 https://atomgit.com/openeuler/docs-centralized/tree/{branchName}`,
  inputSchema: {
    type: "object",
    properties: {
      // 无必填参数
    },
  },
};