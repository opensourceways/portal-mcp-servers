// 获取可搜索的组件列表
export async function getSearchComponents() {
  try {
    const url = `https://www.mindspore.cn/ms-version.json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const msVersionData = await response.json();

      const components = msVersionData
        .filter((item) => item.eom !== 'true' && item.name !== 'tutorials')
        .map((item) => ({
          components: item.component,
          versions: item.versions.filter(c => c.version !== 'master').map(c => c.version),
        }));

      const sections = [];
      sections.push(`
╔════════════════════════════════════════════════════════════╗
║  可搜索组件列表                                           ║
╚════════════════════════════════════════════════════════════╝`);

      sections.push(`共找到 ${components.length} 个可搜索组件\n`);

      components.forEach((component, index) => {
        sections.push(`\n【组件 ${index + 1}】${component.components || '未知'}`);
        sections.push(`最新版本: ${component.versions[0]}`);
        sections.push(`可搜索版本: ${component.versions.join('、')}`);
      });

      sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
      sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return sections.join("\n");
    } else {
      return `获取可搜索组件时 API 返回错误状态码：${response.status}`;
    }
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `获取可搜索组件时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_search_components",
  description: `获取可搜索的组件列表。

获取 MindSpore 可搜索的组件列表。

**使用场景：**
- 了解 MindSpore 可搜索的组件列表
- 为搜索功能提供组件选项
- 辅助用户进行更精确的搜索

**返回信息包括：**
- 可搜索的组件名称列表
- 每个组件的版本信息`,
  inputSchema: {
    type: "object",
    properties: {
      // 无必填参数
    },
  },
};
