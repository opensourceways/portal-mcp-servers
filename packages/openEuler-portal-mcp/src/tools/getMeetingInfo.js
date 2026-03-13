// 数据源 URL
const MEETING_BY_DATE_URL = "https://www.openeuler.openatom.cn/api-meeting-v2/meeting/meeting/";
const MEETING_BY_SIG_URL = "https://www.openeuler.openatom.cn/api-meeting-v2/meeting/sigmeetings/";
const MEETING_DATE_URL = "https://www.openeuler.openatom.cn/api-meeting-v2/meeting/meeting_date/";
const SIG_LIST_URL = "https://www.openeuler.openatom.cn/api-magic/stat/sig/info?community=openeuler";

// 缓存配置
let cachedSigList = null;
let sigListExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 获取所有 SIG 列表（带缓存）
async function fetchSigList() {
  const now = Date.now();
  if (cachedSigList && now < sigListExpiry) {
    return cachedSigList;
  }

  const response = await fetch(SIG_LIST_URL, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`获取 SIG 列表失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data || data.code !== 1 || !data.data) {
    return [];
  }

  // data.data 可能是数组或包含 sig_list 字段的对象
  let sigList = [];
  if (Array.isArray(data.data)) {
    sigList = data.data.map(item => item.name || item.sig_name || item).filter(Boolean);
  } else if (data.data.sig_list) {
    sigList = data.data.sig_list.map(item => item.name || item.sig_name || item).filter(Boolean);
  }

  cachedSigList = sigList;
  sigListExpiry = now + CACHE_DURATION;
  return sigList;
}

// 将用户输入匹配到正确大小写的 SIG 名称
async function matchSigName(userInput) {
  const sigList = await fetchSigList();
  if (!sigList || sigList.length === 0) {
    return userInput; // 无法获取列表时返回原始输入
  }

  const lowerInput = userInput.toLowerCase();

  // 1. 精确匹配
  const exactMatch = sigList.find(name => name === userInput);
  if (exactMatch) return exactMatch;

  // 2. 大小写不敏感匹配
  const caseInsensitive = sigList.find(name => name.toLowerCase() === lowerInput);
  if (caseInsensitive) return caseInsensitive;

  // 3. 包含关系匹配（用户输入是 SIG 名称的一部分）
  const partialMatch = sigList.find(name => name.toLowerCase().includes(lowerInput));
  if (partialMatch) return partialMatch;

  // 4. SIG 名称包含用户输入
  const reverseMatch = sigList.find(name => lowerInput.includes(name.toLowerCase()));
  if (reverseMatch) return reverseMatch;

  return userInput; // 无匹配时返回原始输入
}

// 按日期查询会议
async function fetchMeetingsByDate(date) {
  const url = `${MEETING_BY_DATE_URL}?date=${date}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`按日期查询会议失败：HTTP ${response.status}`);
  }

  return await response.json();
}

// 按 SIG 查询会议
async function fetchMeetingsBySig(sigName) {
  // 末尾加 / 避免服务器 301 重定向丢失 api-meeting-v2 前缀导致 404
  const url = `${MEETING_BY_SIG_URL}${encodeURIComponent(sigName)}/`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`按 SIG 查询会议失败：HTTP ${response.status}`);
  }

  return await response.json();
}

// 查询指定日期附近有会议的日期
async function fetchNearbyMeetingDates(date) {
  const url = `${MEETING_DATE_URL}?date=${date}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`查询附近会议日期失败：HTTP ${response.status}`);
  }

  return await response.json();
}

// 格式化单个会议信息
function formatMeeting(meeting, index) {
  let output = `${index + 1}. **${meeting.topic || '未知议题'}**\n`;

  if (meeting.sig_name || meeting.group_name) {
    output += `   SIG 组: ${meeting.sig_name || meeting.group_name}\n`;
  }

  if (meeting.date) {
    output += `   日期: ${meeting.date}\n`;
  }

  const start = meeting.start || meeting.start_time;
  const end = meeting.end || meeting.end_time;
  if (start || end) {
    output += `   时间: ${start || '?'} - ${end || '?'}\n`;
  }

  if (meeting.agenda) {
    const agendaText = meeting.agenda.length > 100
      ? meeting.agenda.substring(0, 100) + '...'
      : meeting.agenda;
    output += `   议程: ${agendaText}\n`;
  }

  if (meeting.etherpad) {
    output += `   协作文档: ${meeting.etherpad}\n`;
  }

  if (meeting.url || meeting.meeting_url) {
    output += `   会议链接: ${meeting.url || meeting.meeting_url}\n`;
  }

  if (meeting.video_url) {
    output += `   视频回放: ${meeting.video_url}\n`;
  }

  return output;
}

// 按日期查询会议主函数
async function getMeetingsByDate(date) {
  const data = await fetchMeetingsByDate(date);

  // 兼容多种 API 响应格式
  const meetings = Array.isArray(data)
    ? data
    : (data.data || data.meetings || data.result || []);

  if (!meetings || meetings.length === 0) {
    // 没有会议时，查询附近有会议的日期
    let nearbyOutput = '';
    try {
      const nearbyData = await fetchNearbyMeetingDates(date);
      const nearbyDates = Array.isArray(nearbyData)
        ? nearbyData
        : (nearbyData.data || nearbyData.dates || nearbyData.result || []);

      if (nearbyDates && nearbyDates.length > 0) {
        nearbyOutput = '\n### 附近有会议的日期推荐\n\n';
        // 显示最多10个附近日期
        const displayDates = nearbyDates.slice(0, 10);
        displayDates.forEach((item, i) => {
          const d = typeof item === 'string' ? item : (item.date || item);
          nearbyOutput += `${i + 1}. ${d}\n`;
        });
        nearbyOutput += '\n💡 您可以查询以上日期的具体会议安排。\n';
      }
    } catch (e) {
      // 忽略附近日期查询失败
    }

    return `=== openEuler 社区开放会议查询 ===\n\n📅 日期：${date}\n\n❌ 该日期暂无已安排的会议。${nearbyOutput}`;
  }

  let output = `=== openEuler 社区开放会议查询 ===\n\n`;
  output += `📅 日期：${date}\n`;
  output += `共找到 ${meetings.length} 场会议\n\n`;
  output += `---\n\n`;

  meetings.forEach((meeting, index) => {
    output += formatMeeting(meeting, index);
    output += '\n';
  });

  output += `---\n`;
  output += `数据来源: openEuler 开放会议系统\n`;
  output += `查询时间: ${new Date().toLocaleString('zh-CN')}\n`;

  return output;
}

// 按 SIG 查询会议主函数
async function getMeetingsBySig(userSigName) {
  // 先匹配正确的 SIG 名称（大小写敏感）
  const matchedSigName = await matchSigName(userSigName);

  const data = await fetchMeetingsBySig(matchedSigName);

  // 兼容多种 API 响应格式，提取 meetings 列表和总数
  const meetings = Array.isArray(data)
    ? data
    : (data.data || data.meetings || data.result || []);
  const total = data.total || meetings.length;

  const displaySigName = matchedSigName !== userSigName
    ? `${matchedSigName}（已自动匹配，您输入：${userSigName}）`
    : matchedSigName;

  if (!meetings || meetings.length === 0) {
    return `=== openEuler 社区开放会议查询 ===\n\n🏷️ SIG 组：${displaySigName}\n\n❌ 该 SIG 组暂无已安排的会议记录。\n\n💡 提示：SIG 名称大小写敏感，请确认 SIG 名称是否正确。`;
  }

  let output = `=== openEuler 社区开放会议查询 ===\n\n`;
  output += `🏷️ SIG 组：${displaySigName}\n`;
  output += `共找到 ${total} 场会议记录，显示最新 ${meetings.length} 场\n\n`;
  output += `---\n\n`;

  // 最多显示20条
  const displayMeetings = meetings.slice(0, 20);
  displayMeetings.forEach((meeting, index) => {
    output += formatMeeting(meeting, index);
    output += '\n';
  });

  if (total > meetings.length) {
    output += `⚠️ 共 ${total} 场会议，当前仅显示最新 ${meetings.length} 场。\n\n`;
  }

  output += `---\n`;
  output += `数据来源: openEuler 开放会议系统\n`;
  output += `查询时间: ${new Date().toLocaleString('zh-CN')}\n`;

  return output;
}

// 主查询函数
export async function getMeetingInfo(queryType = "date", date = "", sigName = "") {
  try {
    if (queryType === "date") {
      if (!date) {
        return "请提供查询日期，格式为 YYYY-MM-DD，例如：2026-03-03";
      }
      // 验证日期格式
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return `日期格式错误：${date}。请使用 YYYY-MM-DD 格式，例如：2026-03-03`;
      }
      return await getMeetingsByDate(date);
    } else if (queryType === "sig") {
      if (!sigName) {
        return "请提供 SIG 组名称，例如：Kernel、ai、Compiler";
      }
      return await getMeetingsBySig(sigName);
    } else {
      return `不支持的查询类型：${queryType}。支持的类型：date（按日期查询）、sig（按 SIG 查询）`;
    }
  } catch (e) {
    if (e.name === "AbortError") {
      return "网络请求超时，请稍后重试。";
    }
    return `查询会议信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_meeting_info",
  description: `查询 openEuler 社区开放会议信息。

本工具用于查询 openEuler 社区的公开会议安排，支持按日期查询和按 SIG 组查询。

**使用场景：**
- 查询某一天的所有社区会议安排
- 查询某个 SIG 组的会议记录
- 了解会议议题、时间、参与方式
- 查找会议的协作文档和视频回放
- 当某天没有会议时，自动推荐附近有会议的日期

**查询模式：**

1. 按日期查询：query_type = "date"（默认）
   - 查询指定日期的所有会议
   - 日期格式：YYYY-MM-DD（如 2026-03-03）
   - 若该日期无会议，自动查询并推荐附近有会议的日期

2. 按 SIG 查询：query_type = "sig"
   - 查询指定 SIG 组的所有会议记录
   - 支持大小写模糊匹配（自动匹配正确的 SIG 名称）
   - SIG 名称示例：Kernel、ai、Compiler、Networking

**参数说明：**
- query_type: 查询类型，"date"（按日期）或 "sig"（按SIG），默认 "date"
- date: 查询日期，格式 YYYY-MM-DD，query_type 为 "date" 时必填
- sig_name: SIG 组名称，query_type 为 "sig" 时必填

**特性：**
- 智能 SIG 匹配：自动将用户输入的 SIG 名称匹配为正确大小写的官方名称
- 无会议推荐：当查询日期没有会议时，自动推荐附近有会议的日期
- 15分钟缓存：SIG 列表数据缓存，减少 API 调用

**返回信息：**
- 会议议题（topic）
- 所属 SIG 组
- 会议日期和时间（开始/结束）
- 会议议程摘要
- 协作文档链接（etherpad）
- 会议参会链接
- 视频回放链接

**示例问题：**
- "2026年3月3日有哪些 openEuler 社区会议？"
- "Kernel SIG 最近有什么会议安排？"
- "明天的 openEuler 社区会议有哪些？"
- "查看 ai SIG 的会议记录"
- "openEuler 今天有开放会议吗？"`,
  inputSchema: {
    type: "object",
    properties: {
      query_type: {
        type: "string",
        enum: ["date", "sig"],
        description: "查询类型：'date'（按日期查询，默认）、'sig'（按 SIG 组查询）。",
        default: "date"
      },
      date: {
        type: "string",
        description: "查询日期，格式为 YYYY-MM-DD，例如：2026-03-03。query_type 为 'date' 时必填。",
        default: ""
      },
      sig_name: {
        type: "string",
        description: "SIG 组名称，例如：Kernel、ai、Compiler。query_type 为 'sig' 时必填。支持大小写模糊匹配。",
        default: ""
      }
    }
  }
};
