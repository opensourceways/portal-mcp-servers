/**
 * @created 2026-03-09 by sig-OpenDesign with Claude AI
 * @modified 2026-03-09 by sig-OpenDesign with Claude AI
 * @description 社区开放会议查询工具，支持按日期查询和按 SIG 组查询
 */

// 数据源 URL
const MEETING_URL = "https://www.openubmc.cn/api-meeting/v1/meeting/meeting/";
const MEETING_DATE_URL = "https://www.openubmc.cn/api-meeting/v1/meeting/meeting_date/";
const SIG_LIST_URL = "https://www.openubmc.cn/api-magic/stat/sig/info?community=openubmc";

// 缓存配置
let cachedSigList = null;
let sigListExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 获取今天的日期字符串（YYYY-MM-DD）
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

// 获取所有 SIG 列表（带缓存）
async function fetchSigList() {
  const now = Date.now();
  if (cachedSigList && now < sigListExpiry) return cachedSigList;

  const response = await fetch(SIG_LIST_URL, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];

  const data = await response.json();
  if (!data || data.code !== 1 || !data.data) return [];

  let list = [];
  if (Array.isArray(data.data)) {
    list = data.data.map(item => item.name || item.sig_name || item).filter(Boolean);
  } else if (data.data.sig_list) {
    list = data.data.sig_list.map(item => item.name || item.sig_name || item).filter(Boolean);
  }

  cachedSigList = list;
  sigListExpiry = now + CACHE_DURATION;
  return list;
}

/**
 * 解析用户输入的 SIG 名称：
 * - 精确匹配 → { resolved: name, similar: [] }
 * - 仅大小写不同 → { resolved: correctedName, similar: [] }
 * - 相似但不确定 → { resolved: null, similar: [...候选列表] }
 * - 无任何匹配 → { resolved: null, similar: [] }
 */
async function resolveSigName(input) {
  const sigList = await fetchSigList();
  if (!sigList || sigList.length === 0) return { resolved: input, similar: [] };

  // 精确匹配
  if (sigList.includes(input)) return { resolved: input, similar: [] };

  const lower = input.toLowerCase();

  // 仅大小写不同 → 自动修正
  const caseMatch = sigList.find(n => n.toLowerCase() === lower);
  if (caseMatch) return { resolved: caseMatch, similar: [] };

  // 相似匹配（前缀包含关系），最多返回 10 个供用户确认
  const similar = [];
  for (const name of sigList) {
    const nl = name.toLowerCase();
    if (nl.startsWith(lower) || lower.startsWith(nl) || nl.includes(lower) || lower.includes(nl)) {
      similar.push(name);
      if (similar.length >= 10) break;
    }
  }

  return { resolved: null, similar };
}

// 查询某一天的具体会议（支持可选 group_name）
async function fetchMeetings(date, groupName = "") {
  const params = new URLSearchParams({ date });
  if (groupName) params.set("group_name", groupName);

  const response = await fetch(`${MEETING_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`查询会议失败：HTTP ${response.status}`);
  return await response.json();
}

// 查询指定日期前后两个月内有会议的日期（支持可选 group_name）
async function fetchMeetingDates(date, groupName = "") {
  const params = new URLSearchParams({ date });
  if (groupName) params.set("group_name", groupName);

  const response = await fetch(`${MEETING_DATE_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`查询会议日期失败：HTTP ${response.status}`);
  return await response.json();
}

// 从 API 响应中提取会议列表
function extractMeetings(data) {
  if (Array.isArray(data)) return data;
  return data.data || data.meetings || data.result || [];
}

// 从 API 响应中提取日期列表
function extractDates(data) {
  if (Array.isArray(data)) return data;
  return data.data || data.dates || data.result || [];
}

// 格式化单个会议信息
function formatMeeting(meeting, index) {
  let output = `${index + 1}. **${meeting.topic || '未知议题'}**\n`;

  if (meeting.sig_name || meeting.group_name) {
    output += `   SIG 组: ${meeting.sig_name || meeting.group_name}\n`;
  }
  if (meeting.date) output += `   日期: ${meeting.date}\n`;

  const start = meeting.start || meeting.start_time;
  const end = meeting.end || meeting.end_time;
  if (start || end) output += `   时间: ${start || '?'} - ${end || '?'}\n`;

  if (meeting.agenda) {
    const agendaText = meeting.agenda.length > 100
      ? meeting.agenda.substring(0, 100) + '...'
      : meeting.agenda;
    output += `   议程: ${agendaText}\n`;
  }
  if (meeting.etherpad) output += `   协作文档: ${meeting.etherpad}\n`;
  if (meeting.url || meeting.meeting_url) output += `   会议链接: ${meeting.url || meeting.meeting_url}\n`;
  if (meeting.video_url) output += `   视频回放: ${meeting.video_url}\n`;

  return output;
}

// 格式化 SIG 名称未匹配时的提示
function formatSigNotFound(input, similar) {
  let out = `=== openUBMC 社区开放会议查询 ===\n\n`;
  out += `❌ 未找到名称为 "${input}" 的 SIG 组。\n\n`;

  if (similar.length > 0) {
    out += `以下是相似的 SIG 名称，请确认后重新查询：\n`;
    similar.forEach((name, i) => { out += `  ${i + 1}. ${name}\n`; });
    out += `\n💡 请使用以上 SIG 名称重新查询。\n`;
  } else {
    out += `💡 请检查 SIG 名称是否正确。可通过查询 SIG 列表获取完整名称。\n`;
  }
  return out;
}

// 格式化附近有会议的日期推荐
function formatNearbyDates(refDate, dates, sigLabel = "") {
  const sigHint = sigLabel ? `（${sigLabel} SIG）` : "";
  let out = `=== openUBMC 社区开放会议查询 ===\n\n`;
  out += `📅 日期：${refDate}${sigHint}\n\n`;
  out += `❌ 该日期暂无已安排的会议。\n`;

  if (dates.length > 0) {
    out += `\n### 附近有会议的日期推荐\n\n`;
    dates.slice(0, 10).forEach((item, i) => {
      const d = typeof item === 'string' ? item : (item.date || item);
      out += `  ${i + 1}. ${d}\n`;
    });
    out += `\n💡 您可以查询以上日期的具体会议安排。\n`;
  }
  return out;
}

/**
 * 查询某一天的会议（带 SIG 过滤）：
 * 先查会议详情，无数据则查附近日期推荐。
 */
async function queryByDate(date, resolvedSig = "") {
  const sigLabel = resolvedSig || "";

  // Step 1：查该日期的会议
  const meetingData = await fetchMeetings(date, resolvedSig);
  const meetings = extractMeetings(meetingData);

  if (meetings.length > 0) {
    let output = `=== openUBMC 社区开放会议查询 ===\n\n`;
    output += `📅 日期：${date}`;
    if (sigLabel) output += `（${sigLabel} SIG）`;
    output += `\n共找到 ${meetings.length} 场会议\n\n---\n\n`;

    meetings.forEach((meeting, index) => {
      output += formatMeeting(meeting, index);
      output += '\n';
    });

    output += `---\n数据来源: openUBMC 开放会议系统\n`;
    output += `查询时间: ${new Date().toLocaleString('zh-CN')}\n`;
    return output;
  }

  // Step 2：无会议，查附近有会议的日期
  try {
    const dateData = await fetchMeetingDates(date, resolvedSig);
    const dates = extractDates(dateData);
    return formatNearbyDates(date, dates, sigLabel);
  } catch (_) {
    return formatNearbyDates(date, [], sigLabel);
  }
}

/**
 * 查询某 SIG 的会议（可选指定日期）：
 * 无 date 时取今天作参考，先找该 SIG 有会议的日期，
 * 再逐日期查详情（最多展示前 3 个日期）。
 */
async function queryBySig(resolvedSig, date = "") {
  const refDate = date || getTodayStr();

  // Step 1：先查该 SIG 在参考日期附近有会议的日期
  const dateData = await fetchMeetingDates(refDate, resolvedSig);
  const nearbyDates = extractDates(dateData);

  if (nearbyDates.length === 0) {
    let out = `=== openUBMC 社区开放会议查询 ===\n\n`;
    out += `🏷️ SIG 组：${resolvedSig}\n\n`;
    out += `❌ 该 SIG 组在 ${refDate} 前后暂无已安排的会议记录。\n`;
    return out;
  }

  // Step 2：对最近的日期（最多 3 个）查会议详情
  const targetDates = nearbyDates.slice(0, 3);
  const results = await Promise.all(
    targetDates.map(item => {
      const d = typeof item === 'string' ? item : (item.date || item);
      return fetchMeetings(d, resolvedSig).then(data => ({ date: d, meetings: extractMeetings(data) }));
    })
  );

  let output = `=== openUBMC 社区开放会议查询 ===\n\n`;
  output += `🏷️ SIG 组：${resolvedSig}\n`;
  if (date) output += `📅 参考日期：${refDate}\n`;
  output += `\n`;

  let totalCount = 0;
  for (const { date: d, meetings } of results) {
    if (meetings.length === 0) continue;
    totalCount += meetings.length;
    output += `**${d}**（${meetings.length} 场）\n\n`;
    meetings.forEach((meeting, index) => {
      output += formatMeeting(meeting, index);
      output += '\n';
    });
  }

  if (totalCount === 0) {
    output += `❌ 以上日期均无具体会议数据。\n`;
  }

  if (nearbyDates.length > 3) {
    output += `\n📅 更多有会议的日期：\n`;
    nearbyDates.slice(3, 10).forEach((item, i) => {
      const d = typeof item === 'string' ? item : (item.date || item);
      output += `  ${i + 4}. ${d}\n`;
    });
  }

  output += `\n---\n数据来源: openUBMC 开放会议系统\n`;
  output += `查询时间: ${new Date().toLocaleString('zh-CN')}\n`;
  return output;
}

// 主查询函数
export async function getMeetingInfo(queryType = "date", date = "", sigName = "") {
  try {
    if (queryType === "date") {
      if (!date) return "请提供查询日期，格式为 YYYY-MM-DD，例如：2026-03-09";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return `日期格式错误：${date}。请使用 YYYY-MM-DD 格式，例如：2026-03-09`;
      }

      // 有 SIG 过滤时先解析名称
      if (sigName) {
        const { resolved, similar } = await resolveSigName(sigName);
        if (!resolved) return formatSigNotFound(sigName, similar);
        return await queryByDate(date, resolved);
      }
      return await queryByDate(date);

    } else if (queryType === "sig") {
      if (!sigName) return "请提供 SIG 组名称";

      // date 可选，先做格式验证，避免无效参数透传给 SIG 解析
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return `日期格式错误：${date}。请使用 YYYY-MM-DD 格式，例如：2026-03-09`;
      }

      const { resolved, similar } = await resolveSigName(sigName);
      if (!resolved) return formatSigNotFound(sigName, similar);

      return await queryBySig(resolved, date);

    } else {
      return `不支持的查询类型：${queryType}。支持的类型：date（按日期查询）、sig（按 SIG 查询）`;
    }
  } catch (e) {
    if (e.name === "AbortError") return "网络请求超时，请稍后重试。";
    return `查询会议信息时发生错误：${e.message}`;
  }
}

// 清除缓存（仅供测试使用）
export function _resetCache() {
  cachedSigList = null;
  sigListExpiry = 0;
}

// 工具定义
export const toolDefinition = {
  name: "get_meeting_info",
  description: `查询 openUBMC 社区开放会议信息，支持按日期查询和按 SIG 组查询，两种模式均可叠加 SIG 过滤。

**查询模式：**

1. 按日期查询：query_type = "date"（默认）
   - 查询指定日期的所有会议，可选 sig_name 过滤某个 SIG 的会议
   - 日期格式：YYYY-MM-DD（如 2026-03-09）
   - 若该日期无会议，自动推荐前后两个月内有会议的日期

2. 按 SIG 查询：query_type = "sig"
   - 查询指定 SIG 组的会议，以参考日期（默认今天）为基准查找附近有会议的日期及详情
   - 可选 date 指定参考日期
   - SIG 名称支持大小写自动修正；无精确匹配时返回相似 SIG 名称供确认

**SIG 名称匹配规则：**
- 精确匹配 → 直接使用
- 仅大小写不同 → 自动修正
- 相似名称 → 返回候选列表供用户确认

**返回信息：**
- 会议议题（topic）、所属 SIG 组、日期和时间、议程摘要
- 协作文档链接（etherpad）、会议参会链接、视频回放链接

**示例问题：**
- "2026年3月9日有哪些 openUBMC 社区会议？"
- "查询 infrastructure SIG 最近有什么会议安排？"
- "2026-03-09 BMC SIG 有会议吗？"
- "openUBMC 今天有开放会议吗？"`,
  inputSchema: {
    type: "object",
    properties: {
      query_type: {
        type: "string",
        enum: ["date", "sig"],
        description: "查询类型：'date'（按日期查询，默认）、'sig'（按 SIG 组查询）。",
        default: "date",
      },
      date: {
        type: "string",
        description: "查询日期，格式 YYYY-MM-DD。query_type='date' 时必填；query_type='sig' 时为可选参考日期（默认今天）。",
        default: "",
      },
      sig_name: {
        type: "string",
        description: "SIG 组名称。query_type='sig' 时必填；query_type='date' 时可选（过滤某个 SIG 的会议）。支持大小写自动修正。",
        default: "",
      },
    },
  },
};
