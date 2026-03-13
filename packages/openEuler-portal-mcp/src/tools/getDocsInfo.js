// 获取 openEuler 文档信息的检索功能（暂未对外开放）
export async function getDocsInfo(query) {
  try {
    const txtUrl = "https://openeuler.test.osinfra.cn/llms-full.txt";
    const response = await fetch(txtUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const content = await response.text();
      const lines = content.split("\n");

      // 支持多关键词搜索（用空格分隔）
      const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);

      // 存储匹配结果，使用 Set 去重
      const matchedSections = new Map(); // key: 段落标识, value: {score, content, lineNumber}

      // 遍历所有行，查找匹配
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();

        // 计算匹配分数
        let matchScore = 0;
        let matchedKeywords = [];

        for (const keyword of keywords) {
          if (lineLower.includes(keyword)) {
            matchScore++;
            matchedKeywords.push(keyword);
          }
        }

        // 如果有匹配，提取上下文
        if (matchScore > 0) {
          // 扩展上下文范围，获取更完整的段落
          let start = i;
          let end = i;

          // 向上查找段落开始（空行或标题）
          while (start > 0 && lines[start - 1].trim() !== "" && !lines[start - 1].match(/^#{1,6}\s/)) {
            start--;
            // 限制向上查找范围
            if (i - start > 10) break;
          }

          // 向下查找段落结束（空行或下一个标题）
          while (end < lines.length - 1 && lines[end + 1].trim() !== "" && !lines[end + 1].match(/^#{1,6}\s/)) {
            end++;
            // 限制向下查找范围
            if (end - i > 10) break;
          }

          // 提取完整段落
          const contextLines = lines.slice(start, end + 1);
          const context = contextLines.join("\n").trim();

          // 使用段落内容的哈希作为唯一标识，避免重复
          const sectionId = `${start}-${end}`;

          if (!matchedSections.has(sectionId)) {
            matchedSections.set(sectionId, {
              score: matchScore,
              content: context,
              lineNumber: i + 1,
              matchedKeywords: matchedKeywords,
              start: start + 1,
              end: end + 1
            });
          } else {
            // 如果已存在，更新分数
            const existing = matchedSections.get(sectionId);
            existing.score = Math.max(existing.score, matchScore);
            existing.matchedKeywords = [...new Set([...existing.matchedKeywords, ...matchedKeywords])];
          }
        }
      }

      if (matchedSections.size > 0) {
        // 按匹配分数排序
        const sortedResults = Array.from(matchedSections.values())
          .sort((a, b) => b.score - a.score);

        // 格式化输出所有结果
        const formattedResults = sortedResults.map((result, index) => {
          const keywords = result.matchedKeywords.join(", ");
          return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【匹配 ${index + 1}】行 ${result.start}-${result.end} | 匹配关键词: ${keywords} | 相关度: ${result.score}/${keywords.length}

${result.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        });

        const summary = `
╔════════════════════════════════════════════════════════════╗
║  openEuler 文档检索结果                                      ║
╠════════════════════════════════════════════════════════════╣
║  查询关键词: ${query}
║  找到匹配: ${sortedResults.length} 个相关段落
║  文档来源: https://openeuler.test.osinfra.cn/
╚════════════════════════════════════════════════════════════╝

${formattedResults.join("\n\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
检索完成，共返回 ${sortedResults.length} 个相关结果
如需查看完整文档，请访问: https://openeuler.test.osinfra.cn/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        return summary;
      } else {
        return `
╔════════════════════════════════════════════════════════════╗
║  openEuler 文档检索结果                                      ║
╠════════════════════════════════════════════════════════════╣
║  查询关键词: ${query}
║  找到匹配: 0 个
╚════════════════════════════════════════════════════════════╝

未在 openEuler 文档中找到与 "${query}" 相关的信息。

建议：
1. 尝试使用不同的关键词
2. 使用更通用的术语
3. 访问完整文档: https://openeuler.test.osinfra.cn/
4. 访问官方网站: https://www.openeuler.org/`;
      }
    } else {
      return `文档检索服务暂不可用（HTTP ${response.status}），请访问 https://openeuler.test.osinfra.cn/ 查看 openEuler 相关文档。`;
    }
  } catch (e) {
    if (e.name === "AbortError") {
      return `文档检索服务请求超时，请稍后重试或访问 https://openeuler.test.osinfra.cn/ 查看 openEuler 相关文档。`;
    }
    return `文档检索服务发生错误：${e.message}\n请访问 https://openeuler.test.osinfra.cn/ 查看 openEuler 相关文档。`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_openEuler_info",
  description: `在 openEuler 官方文档中检索相关信息和内容。

这个工具会搜索 openEuler 的完整文档库，包括技术文档、特性介绍、使用指南等。

**使用场景：**
- 搜索 openEuler 的技术特性和功能
- 查找特定技术的文档说明
- 了解 openEuler 的项目和工具
- 搜索技术术语、概念解释
- 查找使用指南和最佳实践

**搜索能力：**
- 支持单个或多个关键词搜索（用空格分隔）
- 智能提取完整段落上下文
- 按相关度排序结果
- 返回所有匹配的段落（不限数量）
- 显示匹配的关键词和相关度分数

**搜索示例：**
- "kernel" - 搜索内核相关内容
- "container docker" - 搜索容器和 Docker 相关内容
- "security vulnerability" - 搜索安全漏洞相关内容
- "performance optimization" - 搜索性能优化相关内容

**返回信息包括：**
- 匹配段落的完整内容
- 匹配的关键词列表
- 相关度分数
- 文档中的行号位置
- 匹配结果总数统计`,
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "搜索关键词。可以是单个词（如 'kernel'）或多个词（如 'kernel security'）。支持中英文。",
      },
    },
  },
};
