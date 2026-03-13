/**
 * 工具函数模板
 *
 * 复制此文件并重命名为 getXxxInfo.js 来创建新工具
 *
 * 命名规范：
 * - 文件名：camelCase（如 getSigInfo.js）
 * - 函数名：camelCase（如 getSigInfo）
 * - 工具名：snake_case（如 get_sig_info）
 */

// 数据源 URL
const BASE_URL = "https://www.openubmc.cn/api/xxx";

// 缓存配置
let cachedData = null;
let cacheExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

/**
 * 主查询函数
 * @param {string} query - 查询关键词
 */
export async function getXxxInfo(query) {
  try {
    // 1. 检查缓存
    const now = Date.now();
    if (cachedData && now < cacheExpiry) {
      return formatResult(cachedData, query);
    }

    // 2. 发起 API 请求（带超时）
    const response = await fetch(`${BASE_URL}?query=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败：HTTP ${response.status}`);
    }

    // 3. 解析响应
    const data = await response.json();

    // 4. 更新缓存
    cachedData = data;
    cacheExpiry = now + CACHE_DURATION;

    // 5. 格式化输出
    return formatResult(data, query);
  } catch (e) {
    if (e.name === "AbortError") {
      return "网络请求超时，请稍后重试。";
    }
    return `查询时发生错误：${e.message}`;
  }
}

// 格式化输出（返回 Markdown 文本）
function formatResult(data, query) {
  let result = `=== 查询结果 ===\n\n`;
  result += `关键词：${query}\n\n`;
  // TODO: 根据实际数据结构格式化输出
  result += `数据来源: openUBMC\n`;
  result += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;
  return result;
}

// 工具定义
export const toolDefinition = {
  name: "get_xxx_info",
  description: `查询 openUBMC xxx 信息。

**使用场景：**
- 用户询问...
- 用户想了解...

**参数：**
- query (string, 必需): 查询关键词

**返回信息：**
- xxx 信息

**示例问题：**
- "查询..."`,
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "查询关键词",
      },
    },
  },
};
