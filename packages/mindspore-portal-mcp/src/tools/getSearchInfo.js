// 获取 MindSpore 搜索内容
export async function getSearchInfo(params) {
  try {
    const { keyword = '', limit = [] } = params || {};
    
    const url = `https://www.mindspore.cn/api-search/search/docsng`;
    
    const requestBody = {
      lang: "zh",
      page: 1,
      pageSize: 20,
      keyword: keyword,
      type: "",
      hq: "mindspore",
      card: "course",
    };

    if (limit.length > 1) {
      requestBody.limit = limit;
    } else {
      requestBody.filter = limit;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": "https://www.mindspore.cn/"
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const responseData = await response.json();

      const sections = [];
      sections.push(`
╔════════════════════════════════════════════════════════════╗
║  MindSpore 搜索结果                                       ║
╚════════════════════════════════════════════════════════════╝`);
      sections.push(`\n搜索关键词: ${keyword}`);
      
      if (responseData && responseData.obj && responseData.obj.records && Array.isArray(responseData.obj.records)) {
        const results = responseData.obj.records;
        sections.push(`共找到 ${results.length} 个结果\n`);

        results.forEach((result, index) => {
          sections.push(`\n【结果 ${index + 1}】`);
          sections.push(`  标题: ${result.title.replace(/<\/?[a-zA-Z]*>/g, '') || '未知'}`);
          sections.push(`  内容: ${result.textContent.replace(/<\/?[a-zA-Z]*>/g, '') || '未知'}`);
          sections.push(`  链接: https://www.mindspore.cn/${result.path || '未知'}`);
          sections.push(`  组件: ${result.components || '未知'}`);
          sections.push(`  版本: ${result.version || '未知'}`);
        });
      } else {
        sections.push(`\n未找到相关结果`);
      }

      sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      sections.push(`搜索时间: ${new Date().toLocaleString('zh-CN')}`);
      sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return sections.join("\n");
    } else {
      return `获取搜索结果时 API 返回错误状态码：${response.status}`;
    }
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `获取搜索结果时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_search_info",
  description: `获取 MindSpore 搜索内容。

获取 MindSpore 的搜索结果。

**使用场景：**
- 搜索 MindSpore 相关的文档和内容
- 获取特定关键词的搜索结果
- 为用户提供 MindSpore 相关信息的搜索能力

**参数说明：**
- keyword: 搜索关键词（必填）
- limit: 过滤条件（必填）, 对象数组，例如：[{"components":"MindSpore","version":"r2.8.0"}]，
  表示仅返回包含 MindSpore 组件且版本为 r2.8.0 的搜索结果。相关组件名称和版本可以从 get_search_components 获取，当未指定组件时请传递所有组件内容

**返回信息包括：**
- 标题：搜索结果标题
- 内容：搜索结果内容摘要
- 链接：搜索结果链接
- 组件：相关组件
- 版本：相关版本`,
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        required: true,
        description: "搜索关键词",
      },
      limit: {
        type: "array",
        required: true,
        description: '过滤条件，对象数组，例如：[{"components":"MindSpore","version":"r2.8.0"}]，表示仅返回包含 MindSpore 组件且版本为 r2.8.0 的搜索结果。相关组件名称和版本可以从 get_search_components 获取，当未指定组件时请传递所有组件内容',
      }
    },
  },
};
