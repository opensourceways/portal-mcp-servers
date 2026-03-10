// 获取 MindSpore 学术论文信息
import fs from 'fs';
import path from 'path';

export async function getPaperInfo({ domain, year } = {}) {
  try {
    // 读取 paper.json 文件
    const __filename = new URL(import.meta.url).pathname;
    // 修复 Windows 路径问题
    const normalizedFilename = __filename.startsWith('/') ? __filename.substring(1) : __filename;
    const __dirname = path.dirname(normalizedFilename);
    const paperPath = path.join(__dirname, '../data/paper.json');
    const paperData = JSON.parse(fs.readFileSync(paperPath, 'utf8'));

    // 验证数据结构
    if (!Array.isArray(paperData)) {
      return `学术论文数据格式错误，无法解析。`;
    }

    // 过滤论文
    let filteredPapers = paperData;
    
    if (domain) {
      filteredPapers = filteredPapers.filter(paper => paper.domainName === domain);
    }
    
    if (year) {
      filteredPapers = filteredPapers.filter(paper => {
        // 从 postedOn 字段中提取年份
        const paperYear = paper.postedOn.match(/\d{4}/);
        return paperYear && paperYear[0] === year;
      });
    }

    const sections = [];
    sections.push(`
╔════════════════════════════════════════════════════════════╗
║  MindSpore 学术论文查询结果                               ║
╚════════════════════════════════════════════════════════════╝`);

    if (filteredPapers.length > 0) {
      filteredPapers.forEach((paper, index) => {
        sections.push(`\n【论文 ${index + 1}】`);
        sections.push(`    标题: ${paper.title || '未知'}`);
        sections.push(`    描述: ${paper.desc || '未知'}`);
        sections.push(`    领域: ${paper.domainName || '未知'}`);
        sections.push(`    作者: ${paper.publishedBy || '未知'}`);
        sections.push(`    发表日期: ${paper.postedOn || '未知'}`);
        
        if (paper.href) {
          sections.push(`    论文链接: ${paper.href}`);
        }
        
        if (paper.codeLink) {
          sections.push(`    代码链接: ${paper.codeLink}`);
        }
      });
    } else {
      sections.push(`\n    未找到符合条件的学术论文`);
    }

    sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return sections.join("\n");
  } catch (e) {
    return `获取学术论文信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_paper_info",
  description: `获取 MindSpore 相关学术论文信息。

获取 MindSpore 相关的学术论文信息，包括论文标题、描述、领域、作者、发表日期、论文链接和代码链接。

**使用场景：**
- 了解 MindSpore 相关的学术研究
- 查询特定领域的学术论文
- 查找特定年份的学术论文

**参数说明：**
- domain: 论文领域，如 计算视觉、知识图谱等，不指定则返回所有领域
- year: 发表年份，格式为 YYYY，如 2024，不指定则返回所有年份

**返回信息包括：**
- 标题：论文标题
- 描述：论文描述
- 领域：论文领域
- 作者：论文作者
- 发表日期：论文发表日期
- 论文链接：论文链接
- 代码链接：代码链接`,
  inputSchema: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        description: "论文领域，如 计算视觉、知识图谱等"
      },
      year: {
        type: "string",
        description: "发表年份，格式为 YYYY，如 2024"
      }
    },
  },
};
