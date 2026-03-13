// 数据源 URL
const BASE_URL = "https://www.openeuler.openatom.cn/api-dsapi/query/repo/readme";
const INDEX_NAME = "oEEP-0000 oEEP  索引";

// oEEP 类型标签
const TYPE_LABELS = {
  D: "信息整理 (Document)",
  P: "流程设计 (Process)",
  S: "特性变更 (Standard)",
};

// oEEP 状态标签
const STATUS_LABELS = {
  I: "初始化 (Initial)",
  A: "接纳/活跃 (Accepted/Active)",
  D: "不活跃 (Deactive)",
  F: "已完成 (Final)",
  P: "基本成型 (Provision)",
  R: "被拒绝 (Rejected)",
  S: "被替代 (Substituted)",
  W: "撤回 (Withdraw)",
};

// 缓存配置
let cachedIndex = null;        // 缓存的索引数据（解析后的条目列表）
let cachedIndexRaw = null;     // 缓存的索引原始 Markdown
let indexCacheExpiry = 0;
const detailCache = new Map(); // 缓存各篇 oEEP 详情
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 构建查询 URL
function buildUrl(name) {
  return `${BASE_URL}?community=openeuler&name=${encodeURIComponent(name)}`;
}

// 通用 fetch 函数
async function fetchDoc(name) {
  const response = await fetch(buildUrl(name), {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败：HTTP ${response.status}`);
  }

  const json = await response.json();

  if (json.code !== 200 || !json.data) {
    throw new Error(`文档不存在或查询失败（code: ${json.code}）`);
  }

  return json.data; // Markdown 文本
}

// 解析索引表格，返回 oEEP 条目列表
function parseIndexTable(markdown) {
  const oEEPs = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    if (!line.startsWith("|")) continue;

    // 拆分单元格，过滤空串
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;

    // 第一列必须是 4 位数字（跳过表头和分隔符行）
    const numStr = cells[0];
    if (!/^\d{4}$/.test(numStr)) continue;

    const typeStatusRaw = cells[1]; // 如 "P,I" 或 "D,A"
    const titleCell = cells[2];
    const author = (cells[3] || "").replace(/\s+/g, " ").trim();
    const date = (cells[4] || "").trim();

    // 从 markdown 链接 [标题](URL) 中提取标题和完整名称
    const linkMatch = titleCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
    let title = titleCell;
    let docName = `oEEP-${numStr}`; // 兜底

    if (linkMatch) {
      title = linkMatch[1].trim();
      // URL decode + 去掉 .md 后缀
      const decoded = decodeURIComponent(linkMatch[2]);
      docName = decoded.endsWith(".md") ? decoded.slice(0, -3) : decoded;
    } else {
      // 纯文本标题（无链接）
      title = titleCell;
      docName = `oEEP-${numStr} ${title}`;
    }

    // 拆分类型和状态
    const [typeCode, statusCode] = typeStatusRaw.split(",").map((s) => s.trim());

    oEEPs.push({ number: numStr, typeCode, statusCode, title, docName, author, date });
  }

  return oEEPs;
}

// 获取并缓存索引
async function getIndex() {
  const now = Date.now();
  if (cachedIndex && now < indexCacheExpiry) {
    return { entries: cachedIndex, raw: cachedIndexRaw };
  }

  const markdown = await fetchDoc(INDEX_NAME);
  const entries = parseIndexTable(markdown);

  cachedIndex = entries;
  cachedIndexRaw = markdown;
  indexCacheExpiry = now + CACHE_DURATION;

  return { entries, raw: markdown };
}

// 将用户输入的编号规范化为 4 位字符串
function normalizeNumber(input) {
  // 接受 "1", "01", "0001", "oEEP-0001", "oEEP-1" 等格式
  const clean = input.replace(/^oEEP-/i, "").replace(/\D/g, "");
  if (!clean) return null;
  return clean.padStart(4, "0");
}

// 格式化列表输出
function formatList(entries, keyword) {
  let filtered = entries;
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = entries.filter(
      (e) =>
        e.title.toLowerCase().includes(kw) ||
        e.author.toLowerCase().includes(kw) ||
        e.number.includes(kw) ||
        e.typeCode?.toLowerCase().includes(kw) ||
        e.statusCode?.toLowerCase().includes(kw)
    );
  }

  const total = entries.length;
  const display = filtered.length;

  let output = `=== openEuler 演进提案 (oEEP) 列表 ===\n\n`;

  if (keyword) {
    output += `关键词：${keyword}\n`;
  }

  output += `共 ${total} 篇 oEEP，`;
  output += keyword ? `匹配 ${display} 篇\n\n` : `显示全部\n\n`;

  if (display === 0) {
    output += `未找到与"${keyword}"相关的 oEEP。\n`;
    output += `💡 提示：可以搜索标题关键词、作者名称、编号、类型（D/P/S）或状态（I/A/F 等）。\n`;
    return output;
  }

  output += `${"编号".padEnd(8)}${"类型".padEnd(16)}${"状态".padEnd(16)}${"标题"}\n`;
  output += `${"─".repeat(80)}\n`;

  for (const e of filtered) {
    const typeLabel = TYPE_LABELS[e.typeCode] || e.typeCode || "—";
    const statusLabel = STATUS_LABELS[e.statusCode] || e.statusCode || "—";
    const typePart = `[${e.typeCode || "?"}] ${typeLabel.split(" ")[0]}`;
    const statusPart = `[${e.statusCode || "?"}] ${statusLabel.split(" ")[0]}`;

    output += `oEEP-${e.number}  ${typePart.padEnd(14)}  ${statusPart.padEnd(14)}  ${e.title}\n`;
    if (e.author) output += `          作者: ${e.author}   ${e.date ? `提案日期: ${e.date}` : ""}\n`;
    output += "\n";
  }

  output += `─────────────────────────────────────────────────────────────────────────────\n`;
  output += `类型说明：[D]信息整理  [P]流程设计  [S]特性变更\n`;
  output += `状态说明：[I]初始化  [A]接纳/活跃  [P]基本成型  [F]已完成  [D]不活跃  [R]被拒绝  [S]被替代  [W]撤回\n`;
  output += `\n💡 如需查看某篇 oEEP 的详细内容，请使用 query_type="detail" 并指定 number（如 "0001"）\n`;
  output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;

  return output;
}

// 格式化详情输出
function formatDetail(entry, markdown) {
  const typeLabel = TYPE_LABELS[entry.typeCode] || entry.typeCode || "未知";
  const statusLabel = STATUS_LABELS[entry.statusCode] || entry.statusCode || "未知";

  let output = `=== oEEP-${entry.number} 详情 ===\n\n`;
  output += `**标题：** ${entry.title}\n`;
  output += `**编号：** oEEP-${entry.number}\n`;
  output += `**类型：** ${typeLabel}\n`;
  output += `**状态：** ${statusLabel}\n`;
  output += `**作者：** ${entry.author || "—"}\n`;
  output += `**提案日期：** ${entry.date || "—"}\n\n`;
  output += `─────────────────────────────────────────\n\n`;

  // 去掉 front matter（--- ... --- 包围的部分），输出正文
  const withoutFrontMatter = markdown.replace(/^---[\s\S]*?---\s*/m, "").trim();
  output += withoutFrontMatter;

  output += `\n\n─────────────────────────────────────────\n`;
  output += `数据来源: openEuler TC oEEP 仓库\n`;
  output += `查询时间: ${new Date().toLocaleString("zh-CN")}\n`;

  return output;
}

// 主查询函数
export async function getOEEPInfo(queryType = "list", number = "", keyword = "") {
  try {
    if (queryType === "list") {
      const { entries } = await getIndex();
      return formatList(entries, keyword.trim());
    }

    if (queryType === "detail") {
      if (!number) {
        return "请提供 oEEP 编号，如 \"0001\" 或 \"oEEP-0001\"。";
      }

      const num = normalizeNumber(number);
      if (!num) {
        return `无效的 oEEP 编号：${number}。请提供数字编号，如 "1"、"0001" 或 "oEEP-0001"。`;
      }

      // 从索引中查找对应条目以获取完整文档名
      const { entries } = await getIndex();
      const entry = entries.find((e) => e.number === num);

      if (!entry) {
        return `未找到编号 oEEP-${num}。\n\n可用 query_type="list" 查看全部 oEEP 列表。`;
      }

      // 检查缓存
      const now = Date.now();
      const cached = detailCache.get(num);
      if (cached && now < cached.expiry) {
        return formatDetail(entry, cached.markdown);
      }

      // 拉取文档
      const markdown = await fetchDoc(entry.docName);

      detailCache.set(num, { markdown, expiry: now + CACHE_DURATION });

      return formatDetail(entry, markdown);
    }

    return `不支持的查询类型：${queryType}。支持的类型：list（列表）、detail（详情）`;
  } catch (e) {
    if (e.name === "AbortError") {
      return "网络请求超时，请稍后重试。";
    }
    return `查询 oEEP 信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_oeep_info",
  description: `查询 openEuler 演进提案（oEEP, openEuler Evolution Proposal）信息。

oEEP 是 openEuler 社区用于规范化技术决策流程的提案机制，类似于 Python PEP 或 OpenStack Blueprint。每篇 oEEP 记录了一个具体的社区演进提案，包括特性变更、流程设计、信息整理等。

**使用场景：**
- 查询 openEuler 社区的全部演进提案列表
- 按关键词搜索特定主题的 oEEP（如"内核"、"镜像"、"安全"）
- 查看某篇 oEEP 的详细内容（背景、方案、流程图等）
- 了解某个社区决策的来龙去脉
- 查询特定类型或状态的 oEEP

**查询模式：**

1. 列表查询：query_type = "list"（默认）
   - 返回所有 oEEP 的摘要列表（编号、类型、状态、标题、作者、日期）
   - 支持 keyword 参数按标题、作者、编号、类型、状态进行关键词过滤

2. 详情查询：query_type = "detail"
   - 返回指定 oEEP 的完整内容（包括动机、方案详述、参考链接等）
   - 需要提供 number 参数（如 "1"、"0001" 或 "oEEP-0001"）

**oEEP 类型说明：**
- D (Document, 信息整理): 信息梳理形成的文档，如社区索引、指南、规范
- P (Process, 流程设计): 社区治理、CI/CD、测试等流程设计
- S (Standard, 特性变更): 代码、工具、配置变更，产生对用户可见的特性变化

**oEEP 状态说明：**
- I (Initial, 初始化): 活跃草稿，内容尚未达成共识
- A (Accepted/Active, 接纳/活跃): 已被接受或活跃维护中
- P (Provision, 基本成型): 基本形成共识，待技术委员会正式决策
- F (Final, 已完成): 已完成，不再需要跟进
- D (Deactive, 不活跃): 暂停，但可能重启
- R (Rejected, 被拒绝): 被技术委员会拒绝
- S (Substituted, 被替代): 被后续 oEEP 替代
- W (Withdraw, 撤回): 被提案人主动撤回

**参数说明：**
- query_type: 查询类型，"list"（列表，默认）或 "detail"（详情）
- number: oEEP 编号，query_type 为 "detail" 时必填。支持格式：1、01、0001、oEEP-0001
- keyword: 关键词（可选），query_type 为 "list" 时有效，用于过滤标题/作者/编号/类型/状态

**示例问题：**
- "openEuler 有哪些演进提案？"
- "查询 oEEP 列表"
- "有哪些关于内核的 oEEP？"
- "查看 oEEP-0001 的详细内容"
- "oEEP 5 的方案是什么？"
- "已完成（Final）的 oEEP 有哪些？"
- "胡欣蔚提交了哪些 oEEP？"`,
  inputSchema: {
    type: "object",
    properties: {
      query_type: {
        type: "string",
        enum: ["list", "detail"],
        description: "查询类型：'list'（列表查询，默认）、'detail'（详情查询，需提供 number）。",
        default: "list"
      },
      number: {
        type: "string",
        description: "oEEP 编号，query_type 为 'detail' 时必填。支持多种格式：'1'、'01'、'0001'、'oEEP-0001'。",
        default: ""
      },
      keyword: {
        type: "string",
        description: "关键词（可选），query_type 为 'list' 时有效。可按标题、作者、类型码（D/P/S）、状态码（I/A/F 等）过滤。",
        default: ""
      }
    }
  }
};
