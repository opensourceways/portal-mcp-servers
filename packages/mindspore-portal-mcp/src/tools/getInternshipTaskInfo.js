// 获取 MindSpore 实习任务信息
import fs from 'fs';
import path from 'path';

export async function getInternshipTaskInfo() {
  try {
    // 读取 intership-task.json 文件
    const __filename = new URL(import.meta.url).pathname;
    // 修复 Windows 路径问题
    const normalizedFilename = __filename.startsWith('/') ? __filename.substring(1) : __filename;
    const __dirname = path.dirname(normalizedFilename);
    const taskPath = path.join(__dirname, '../data/intership-task.json');
    const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf8'));

    // 验证数据结构
    if (!Array.isArray(taskData)) {
      return `实习任务数据格式错误，无法解析。`;
    }

    const sections = [];
    sections.push(`
╔════════════════════════════════════════════════════════════╗
║  MindSpore 实习任务查询结果                               ║
╚════════════════════════════════════════════════════════════╝`);

    if (taskData.length > 0) {
      taskData.forEach((taskType, typeIndex) => {
        sections.push(`\n【任务类型 ${typeIndex + 1}】: ${taskType.name || '未知'}`);
        
        if (taskType.list && Array.isArray(taskType.list)) {
          taskType.list.forEach((task, taskIndex) => {
            sections.push(`\n  【任务 ${taskIndex + 1}】`);
            sections.push(`    名称: ${task.name || '未知'}`);
            sections.push(`    描述: ${task.desc || '未知'}`);
            sections.push(`    链接: ${task.href || '未知'}`);
          });
        } else {
          sections.push(`    该任务类型下暂无任务`);
        }
      });
    } else {
      sections.push(`\n    未找到实习任务`);
    }

    sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return sections.join("\n");
  } catch (e) {
    return `获取实习任务信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_internship_task_info",
  description: `获取 MindSpore 实习任务信息。

获取 MindSpore 的实习任务信息，包括任务类型名称和任务列表。

**使用场景：**
- 了解 MindSpore 社区的实习任务
- 查询不同类型的实习任务
- 查找具体任务的详细信息和链接

**返回信息包括：**
- 任务类型名称：任务的类型名称
- 任务名称：具体任务的名称
- 任务描述：任务的详细描述
- 链接：任务的链接地址`,
  inputSchema: {
    type: "object",
    properties: {
      // 无必填参数
    },
  },
};
