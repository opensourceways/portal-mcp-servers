// 获取 SIG 信息
export async function getSigInfo() {
  try {
    const url = `https://www.mindspore.cn/api-magicapi/sig/all/mindspore`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const responseData = await response.json();

      if (responseData && responseData.data && Array.isArray(responseData.data.sigList)) {
        const sigList = responseData.data.sigList;
        const sections = [];
        sections.push(`
╔════════════════════════════════════════════════════════════╗
║  SIG 信息查询结果                                         ║
╚════════════════════════════════════════════════════════════╝`);

        sections.push(`\n共找到 ${sigList.length} 个 SIG\n`);

        sigList.forEach((sig, index) => {
          sections.push(`\n【SIG ${index + 1}】${sig.name || '未知'}`);
          sections.push(`  描述: ${sig.description || '未知'}`);
          sections.push(`  邮箱: ${sig.mailing_list || '未知'}`);
          sections.push(`  创建时间: ${sig.created_on || '未知'}`);
          
          // Maintainer信息
          if (sig.maintainers && Array.isArray(sig.maintainers)) {
            const maintainerNames = sig.maintainers.map(m => m.name || m).join('、');
            sections.push(`  Maintainer: ${maintainerNames || '未知'}`);
          } else {
            sections.push(`  Maintainer: ${sig.maintainers || '未知'}`);
          }
          
          // 仓库信息
          if (sig.repositories && Array.isArray(sig.repositories)) {
            sig.repositories.forEach((repo, repoIndex) => {
              if (repo.repo && Array.isArray(repo.repo)) {
                repo.repo.forEach((repoName, repoNameIndex) => {
                  sections.push(`\n  【仓库 ${repoIndex + 1}】`);
                  sections.push(`    仓库地址: https://atomgit.com/${repoName || ''}`);
                  
                  // Committers 信息
                  if (repo.committers && Array.isArray(repo.committers)) {
                    const committerNames = repo.committers.map(c => c.name || c).join('、');
                    sections.push(`    Committers: ${committerNames || '未知'}`);
                  } else {
                    sections.push(`    Committers: 未知`);
                  }
                });
              }
            });
          } else if (sig.repos && Array.isArray(sig.repos)) {
            sig.repos.forEach((repo, repoIndex) => {
              sections.push(`\n  【仓库 ${repoIndex + 1}】`);
              sections.push(`    仓库地址: https://atomgit.com/${repo.repo_name || ''}`);
              sections.push(`    Committers: 未知`);
            });
          } else {
            sections.push(`  仓库: 暂无`);
          }
        });

        sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
        sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        return sections.join("\n");
      } else {
        return `获取 SIG 信息失败：返回数据格式不正确，期望包含 sigList 数组。`;
      }
    } else {
      return `获取 SIG 信息时 API 返回错误状态码：${response.status}`;
    }
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `获取 SIG 信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_sig_info",
  description: `获取 SIG 信息。

获取 MindSpore 的 SIG 信息，返回 SIG 列表及其详细信息。

**使用场景：**
- 查询某个技术 SIG 的基本信息（名称、描述、邮件列表）
- 了解 SIG 的代码维护者（Maintainers）和活跃贡献者（Committers）
- 查看 SIG 管理的 Git 代码仓库列表
- 获取 SIG 的分支管理和开发信息
- 查询某个仓库属于哪些 SIG 组
- 查询某个 maintainer 参与了哪些 SIG 组

**返回信息包括：**
- 名称：SIG 名称
- 描述：SIG 描述
- 邮箱：SIG 邮箱地址
- 创建时间：SIG 创建时间
- Maintainer：SIG 维护者列表
- 仓库：SIG 管理的仓库列表，包括仓库地址和 committers`,
  inputSchema: {
    type: "object",
    properties: {
      // 无必填参数
    },
  },
};