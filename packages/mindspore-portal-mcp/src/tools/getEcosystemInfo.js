// 获取 MindSpore 生态资源信息
import fs from 'fs';
import path from 'path';

export async function getEcosystemInfo({ type } = {}) {
  try {
    // 读取 ecosystem.json 文件
    const __filename = new URL(import.meta.url).pathname;
    // 修复 Windows 路径问题
    const normalizedFilename = __filename.startsWith('/') ? __filename.substring(1) : __filename;
    const __dirname = path.dirname(normalizedFilename);
    const ecosystemPath = path.join(__dirname, '../data/ecosystem.json');
    const ecosystemData = JSON.parse(fs.readFileSync(ecosystemPath, 'utf8'));

    // 验证数据结构
    if (!ecosystemData || typeof ecosystemData !== 'object') {
      return `生态资源数据格式错误，无法解析。`;
    }

    // 确定要查询的类型
    const validTypes = ['lib', 'tutorial', 'model'];
    let targetTypes = validTypes;
    
    if (type && validTypes.includes(type)) {
      targetTypes = [type];
    }

    const sections = [];
    sections.push(`
╔════════════════════════════════════════════════════════════╗
║  MindSpore 生态资源查询结果                               ║
╚════════════════════════════════════════════════════════════╝`);

    let totalResources = 0;

    // 遍历指定类型的资源
    targetTypes.forEach(resourceType => {
      const resources = ecosystemData[resourceType] || [];
      totalResources += resources.length;

      // 类型名称映射
      const typeNames = {
        lib: '三方开发库',
        tutorial: '三方教程',
        model: '三方模型'
      };

      sections.push(`\n【${typeNames[resourceType] || resourceType}】`);

      if (resources.length > 0) {
        resources.forEach((resource, index) => {
          sections.push(`\n  【资源 ${index + 1}】`);
          sections.push(`    名称: ${resource.repo || '未知'}`);
          sections.push(`    简介: ${resource.introduction || '未知'}`);
          sections.push(`    链接: ${resource.html_url || '未知'}`);
        });
      } else {
        sections.push(`    该类别下暂无资源`);
      }
    });

    sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return sections.join("\n");
  } catch (e) {
    return `获取生态资源信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_ecosystem_info",
  description: `获取 MindSpore 生态资源信息。

获取 MindSpore 的生态资源信息，包括三方开发库、三方教程和三方模型。

**使用场景：**
- 了解 MindSpore 生态中的三方开发库
- 查询 MindSpore 相关的教程资源
- 查找 MindSpore 生态中的三方模型

**参数说明：**
- type: 资源类型，可选值为 lib（三方开发库）、tutorial（三方教程）、model（三方模型），不指定则返回所有类型

**返回信息包括：**
- 名称：资源名称
- 简介：资源简介
- 链接：资源链接`,
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "资源类型，可选值为 lib（三方开发库）、tutorial（三方教程）、model（三方模型）",
        enum: ["lib", "tutorial", "model"]
      }
    },
  },
};
