// 获取 MindSpore 应用案例信息
import fs from 'fs';
import path from 'path';

export async function getCaseInfo({ type, category } = {}) {
  try {
    // 读取 case.json 文件
    const __filename = new URL(import.meta.url).pathname;
    // 修复 Windows 路径问题
    const normalizedFilename = __filename.startsWith('/') ? __filename.substring(1) : __filename;
    const __dirname = path.dirname(normalizedFilename);
    const casePath = path.join(__dirname, '../data/case.json');
    const caseData = JSON.parse(fs.readFileSync(casePath, 'utf8'));

    // 验证数据结构
    if (!Array.isArray(caseData)) {
      return `应用案例数据格式错误，无法解析。`;
    }

    // 过滤案例
    let filteredCases = caseData;
    
    if (type) {
      filteredCases = filteredCases.filter(caseItem => caseItem.type === type);
    }
    
    if (category) {
      filteredCases = filteredCases.filter(caseItem => caseItem.category === category);
    }

    const sections = [];
    sections.push(`
╔════════════════════════════════════════════════════════════╗
║  MindSpore 应用案例查询结果                               ║
╚════════════════════════════════════════════════════════════╝`);

    if (filteredCases.length > 0) {
      filteredCases.forEach((caseItem, index) => {
        sections.push(`\n【案例 ${index + 1}】`);
        sections.push(`    类型: ${caseItem.type || '未知'}`);
        sections.push(`    分类: ${caseItem.category || '未知'}`);
        sections.push(`    标题: ${caseItem.title || '未知'}`);
        sections.push(`    描述: ${caseItem.desc || '未知'}`);
        
        if (caseItem.technologies && caseItem.technologies.length > 0) {
          sections.push(`    tag: ${caseItem.technologies.join('、')}`);
        }
        
        if (caseItem.href) {
          sections.push(`    链接: ${caseItem.href}`);
        }
      });
    } else {
      sections.push(`\n    未找到符合条件的应用案例`);
    }

    sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return sections.join("\n");
  } catch (e) {
    return `获取应用案例信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_case_info",
  description: `获取 MindSpore 应用案例信息。

获取 MindSpore 的应用案例信息，包括企业案例、开发者案例和高校案例。

**使用场景：**
- 了解 MindSpore 在不同领域的应用案例
- 查询特定类型的应用案例
- 查找特定分类的应用案例

**参数说明：**
- type: 案例类型，可选值为 企业案例、开发者案例、高校案例，不指定则返回所有类型
- category: 案例分类，如 互联网、医疗、政府等，不指定则返回所有分类

**返回信息包括：**
- 类型：案例类型
- 分类：案例分类
- 标题：案例标题
- 描述：案例描述
- tag：案例tag
- 链接：案例链接（仅当链接不为空时显示）`,
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "案例类型，可选值为 企业案例、开发者案例、高校案例"
      },
      category: {
        type: "string",
        description: "案例分类，如 互联网、医疗、政府等"
      }
    },
  },
};
