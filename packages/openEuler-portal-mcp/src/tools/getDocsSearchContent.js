// 搜索 openEuler 文档内容
export async function getDocsSearchContent(args = {}) {
  try {
    const { keyword, lang = 'zh', version } = args;

    if (!keyword) {
      return `搜索失败：缺少必要参数 keyword。`;
    }

    if (!['zh', 'en'].includes(lang)) {
      return `搜索失败：lang 参数必须是 zh 或 en。`;
    }

    if (!version) {
      return `搜索失败：缺少必要参数 version。`;
    }

    const url = `https://docs.openeuler.openatom.cn/api-search/search/sort/docs`;
    const requestBody = { 
      keyword, 
      lang,
      version,
      page: 1,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "https://docs.openeuler.openatom.cn",
        "referer": "https://docs.openeuler.openatom.cn"
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const data = await response.json();

      const sections = [];
      sections.push(`
╔════════════════════════════════════════════════════════════╗
║  openEuler 文档搜索结果                                   ║
╚════════════════════════════════════════════════════════════╝`);

      sections.push(`\n搜索词: ${keyword}`);
      sections.push(`语言: ${lang === 'zh' ? '中文' : '英文'}`);
      if (version) {
        sections.push(`版本: ${version}`);
      }

      if (Array.isArray(data?.obj?.records)) {
        sections.push(`\n共找到 ${data.obj.records.length} 个搜索结果\n`);

        data.obj.records.forEach((item, index) => {
          // 移除HTML标签，提取纯文本
          const cleanTitle = item.title ? item.title.replace(/<[^>]*>/g, '') : '无标题';
          const cleanContent = item.textContent ? item.textContent.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : '无内容';
          
          // 构建文档链接
          const docUrl = `https://docs.openeuler.openatom.cn/${item.path}.html`;

          sections.push(`\n【结果 ${index + 1}】`);
          sections.push(`  标题: ${cleanTitle}`);
          sections.push(`  内容: ${cleanContent}`);
          sections.push(`  版本: ${item.version || '未知'}`);
          sections.push(`  链接: ${docUrl}`);
        });
      } else {
        sections.push(`\n未找到搜索结果或返回数据格式不正确。`);
      }

      sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
      sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return sections.join("\n");
    } else {
      return `搜索文档时 API 返回错误状态码：${response.status}`;
    }
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `搜索文档时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_docs_search_content",
  description: `搜索 openEuler 文档内容。

该工具通过 POST 请求到文档搜索 API，返回与搜索词相关的文档内容。

**使用场景：**
- 搜索 openEuler 的技术特性和功能
- 查找特定技术的文档说明
- 了解 openEuler 的项目和工具
- 搜索技术术语、概念解释
- 查找使用指南和最佳实践

**请求参数：**
- keyword: string - 搜索词（必填）
- lang: string - 语言，zh 或 en（默认 zh）
- version: string - 版本号（可选）

**返回信息包括：**
- 搜索结果列表
- 每个结果的标题（已清理HTML标签）
- 每个结果的内容摘要（已清理HTML标签，截断显示）
- 每个结果的版本号
- 每个结果的文档链接（基于返回的path构建）`,
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description: "搜索关键词。可以是单个词（如 'kernel'）或多个词（如 'kernel security'）。支持中英文。"
      },
      lang: {
        type: "string",
        description: "语言，zh 或 en",
        enum: ["zh", "en"]
      },
      version: {
        type: "string",
        description: "版本号，可通过 get_docs_version 获取。当用户不指定版本时，建议传递最新版本"
      }
    },
    required: ["keyword", "version"]
  },
};
