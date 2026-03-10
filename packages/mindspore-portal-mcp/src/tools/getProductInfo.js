// 获取产品信息
export async function getProductInfo() {
  try {
    // 并行获取两个 API 的数据
    const [docsMenuResponse, versionResponse] = await Promise.all([
      fetch(`https://www.mindspore.cn/docs-menu.json`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`https://www.mindspore.cn/ms-version.json`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      })
    ]);

    if (!docsMenuResponse.ok) {
      return `获取产品信息时 API 返回错误状态码：${docsMenuResponse.status}`;
    }

    if (!versionResponse.ok) {
      return `获取版本信息时 API 返回错误状态码：${versionResponse.status}`;
    }

    const docsMenuData = await docsMenuResponse.json();
    const versionData = await versionResponse.json();

    if (!Array.isArray(docsMenuData)) {
      return `获取产品信息失败：返回数据格式不正确，期望数组格式。`;
    }

    if (!Array.isArray(versionData)) {
      return `获取版本信息失败：返回数据格式不正确，期望数组格式。`;
    }

    // 创建版本信息映射，以 name 为键
    const versionMap = new Map();
    versionData.forEach(item => {
      versionMap.set(item.name, item);
    });

    const sections = [];
    sections.push(`
╔════════════════════════════════════════════════════════════╗
║  产品信息查询结果                                         ║
╚════════════════════════════════════════════════════════════╝`);

    let totalProducts = 0;
    docsMenuData.forEach(category => {
      if (category.children && Array.isArray(category.children)) {
        totalProducts += category.children.length;
      }
    });

    sections.push(`\n共找到 ${docsMenuData.length} 个类别，${totalProducts} 个产品\n`);

    docsMenuData.forEach((category, categoryIndex) => {
      const categoryName = category.label?.zh || category.label?.en || '未知类别';
      sections.push(`\n【类别 ${categoryIndex + 1}】${categoryName}`);

      if (category.children && Array.isArray(category.children)) {
        category.children.forEach((item, itemIndex) => {
          sections.push(`\n  【产品 ${itemIndex + 1}】`);
          sections.push(`    名称: ${item.name || '未知'}`);
          sections.push(`    描述: ${item.desc?.zh || item.desc?.en || '未知'}`);
          sections.push(`    仓库: ${item.repository || '未知'}`);

          // 查找对应的版本信息
          if (item.id) {
            const versionInfo = versionMap.get(item.id);
            if (versionInfo) {
              const versions = versionInfo.versions || [];
              if (versions.length > 0) {
                // 提取版本号，用逗号分隔，过滤掉 master 版本
                const versionList = versions.map(v => v.version || v.versionAlias).filter(v => v && v !== 'master').join('、');
                if (versionList) {
                  sections.push(`    版本: ${versionList}`);
                }
              }
            }
          }
        });
      } else {
        sections.push(`    该类别下暂无产品`);
      }
    });

    sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return sections.join("\n");
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `获取产品信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_product_info",
  description: `获取产品信息。

获取 MindSpore 的产品信息，返回分类和产品列表。

**使用场景：**
- 了解可用的产品信息
- 获取产品的名称、描述、仓库地址、版本信息等详细信息
- 为产品管理和使用提供参考依据

**返回信息包括：**
- 类别：产品分类（如核心框架、大模型套件等）
- 名称：产品名称
- 描述：产品的功能描述
- 仓库：产品的代码仓库地址
- 版本：产品的版本信息`,
  inputSchema: {
    type: "object",
    properties: {
      // 无必填参数
    },
  },
};