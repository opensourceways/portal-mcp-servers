// 获取 MindSpore 共享看板数据
import fs from 'fs';
import path from 'path';

export async function getDashboardInfo() {
  try {
    // API 接口地址
    const apiUrl = 'https://datastat.mindspore.cn/api-magic/stat/overview/count?community=mindspore';
    
    // 发送 GET 请求
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return `获取共享看板数据时 API 返回错误状态码：${response.status}`;
    }

    const responseData = await response.json();

    // 验证数据结构
    if (!responseData || typeof responseData !== 'object' || !responseData.data) {
      return `获取共享看板数据失败：返回数据格式不正确。`;
    }

    const data = responseData.data;

    const sections = [];
    sections.push(`
╔════════════════════════════════════════════════════════════╗
║  MindSpore 共享看板数据                                 ║
╚════════════════════════════════════════════════════════════╝`);

    // 输出各项数据
    sections.push(`\n【社区下载量】: ${data.download_all || 0}`);
    sections.push(`【贡献者数量】: ${data.contributor_all || 0}`);
    sections.push(`【单位会员数量】: ${data.company_all || 0}`);
    sections.push(`【合并请求 PR 数量】: ${data.merged_pr_all || 0}`);
    sections.push(`【需求&问题 Issue 数量】: ${data.issue_all || 0}`);
    sections.push(`【评审 Comment 数量】: ${data.comment_all || 0}`);

    sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return sections.join("\n");
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `获取共享看板数据时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_dashboard_info",
  description: `获取 MindSpore 共享看板数据。

获取 MindSpore 社区的共享看板数据，包括社区下载量、贡献者数量、单位会员数量、合并请求 PR 数量、需求&问题 Issue 数量和评审 Comment 数量。

**使用场景：**
- 了解 MindSpore 社区的活跃度和发展情况
- 分析 MindSpore 社区的贡献者和代码提交情况
- 监控 MindSpore 社区的下载量和问题处理情况

**返回信息包括：**
- 社区下载量：MindSpore 社区的总下载量
- 贡献者数量：MindSpore 社区的贡献者总数
- 单位会员数量：MindSpore 社区的单位会员数量
- 合并请求 PR 数量：MindSpore 社区的合并 PR 总数
- 需求&问题 Issue 数量：MindSpore 社区的 Issue 总数
- 评审 Comment 数量：MindSpore 社区的评审 Comment 总数`,
  inputSchema: {
    type: "object",
    properties: {
      // 无必填参数
    },
  },
};
