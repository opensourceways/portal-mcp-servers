// 数据源 URL
const ORGANIZATION_DATA_URL = "https://www.openeuler.openatom.cn/data/portal/organization.json";

// 缓存数据和过期时间（15分钟）
let cachedData = null;
let cacheExpiry = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// 获取组织架构数据
async function fetchOrganizationData() {
  const now = Date.now();

  // 如果缓存有效，直接返回缓存数据
  if (cachedData && now < cacheExpiry) {
    return cachedData;
  }

  // 从远程获取数据
  const response = await fetch(ORGANIZATION_DATA_URL, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`获取组织架构数据失败：HTTP ${response.status}`);
  }

  const data = await response.json();

  // 更新缓存
  cachedData = data;
  cacheExpiry = now + CACHE_DURATION;

  return data;
}

// 查询 openEuler 组织架构信息
export async function getOrganizationInfo(query) {
  try {
    const CommitteeData = await fetchOrganizationData();
    const data = CommitteeData.zh; // 使用中文数据

  // 如果查询"所有"或"全部"，返回所有委员会列表
  if (query === '所有' || query === '全部' || query.toLowerCase() === 'all') {
    let result = '=== openEuler 组织架构 ===\n\n';
    data.memberList.forEach((committee, index) => {
      result += `${index + 1}. ${committee.title}\n`;
    });
    result += `\n${data.notice}\n`;
    return result;
  }

  // 搜索委员会名称
  const matchedCommittees = data.memberList.filter(committee =>
    committee.title.includes(query)
  );

  if (matchedCommittees.length > 0) {
    let result = '';
    matchedCommittees.forEach(committee => {
      result += formatCommittee(committee);
      result += '\n' + '='.repeat(60) + '\n\n';
    });
    return result;
  }

  // 搜索成员姓名
  const memberResults = [];
  data.memberList.forEach(committee => {
    const members = findMemberInCommittee(committee, query);
    if (members.length > 0) {
      memberResults.push({
        committee: committee.title,
        members: members
      });
    }
  });

  if (memberResults.length > 0) {
    let result = `=== 查询到 "${query}" 的相关信息 ===\n\n`;
    memberResults.forEach(item => {
      result += `【${item.committee}】\n`;
      item.members.forEach(member => {
        result += formatMember(member);
      });
      result += '\n';
    });
    return result;
  }

  return `未找到与 "${query}" 相关的信息。\n\n提示：\n- 可以查询委员会名称，如："技术委员会"、"品牌委员会"\n- 可以查询成员姓名，如："胡欣蔚"、"熊伟"\n- 可以输入"所有"查看全部委员会列表`;
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `查询组织架构信息时发生错误：${e.message}`;
  }
}

// 格式化委员会信息
function formatCommittee(committee) {
  let result = `=== ${committee.title} ===\n\n`;

  // 处理不同的数据结构
  if (committee.list && Array.isArray(committee.list)) {
    // 检查是否有嵌套的 personalList 结构（如主委员会）
    const hasPersonalList = committee.list.some(item => item.personalList);

    if (hasPersonalList) {
      // 主委员会结构
      committee.list.forEach(group => {
        if (group.title && group.personalList) {
          result += `【${group.title}】\n`;
          group.personalList.forEach(person => {
            result += formatMember(person);
          });
          result += '\n';
        }
      });
    } else {
      // 普通列表结构
      committee.list.forEach(member => {
        result += formatMember(member);
      });
    }
  }

  return result;
}

// 格式化成员信息
function formatMember(member) {
  let result = `  • ${member.name}`;

  if (member.post) {
    result += ` - ${member.post}`;
  }

  if (member.position && Array.isArray(member.position)) {
    result += ` - ${member.position.join('、')}`;
  }

  if (member.email) {
    result += `\n    邮箱: ${member.email}`;
  }

  if (member.gitee) {
    result += `\n    Gitee: ${member.gitee}`;
  }

  result += '\n';
  return result;
}

// 在委员会中查找成员
function findMemberInCommittee(committee, query) {
  const results = [];

  if (committee.list && Array.isArray(committee.list)) {
    committee.list.forEach(item => {
      // 检查是否有 personalList
      if (item.personalList && Array.isArray(item.personalList)) {
        item.personalList.forEach(person => {
          if (person.name && person.name.includes(query)) {
            results.push({
              ...person,
              groupTitle: item.title // 添加分组标题
            });
          }
        });
      } else if (item.name && item.name.includes(query)) {
        // 直接成员
        results.push(item);
      }
    });
  }

  return results;
}

// 工具定义
export const toolDefinition = {
  name: "get_organization_info",
  description: `查询 openEuler 治理组织架构和委员会成员信息。

⚠️ 重要区分：
- 本工具用于查询【治理委员会】：如技术委员会、品牌委员会、用户委员会等治理组织
- 如需查询【技术 SIG】：如 Kernel SIG、Cloud SIG 等技术工作组，请使用 get_sig_info 工具

openEuler 社区的治理架构由多个委员会和工作组组成，负责社区的战略决策、技术方向、品牌推广、用户服务等治理工作。

**使用场景：**
- 查询 openEuler 治理委员会的组织结构和成员名单
- 查找特定委员会的职责和成员信息
- 搜索某个人在 openEuler 治理组织中的职位和所属委员会
- 了解 openEuler 的治理架构和决策机制
- 获取委员会成员的联系方式（邮箱、Gitee账号等）

**可查询的治理组织（委员会/工作组）：**
- 顾问专家委员会：openEuler 的顾问和专家
- 委员会：包括主席、常务委员会委员、委员、执行总监、执行秘书
- 技术委员会：负责技术战略决策和方向（注意：这是治理组织，不是技术 SIG）
- 品牌委员会：负责品牌推广和营销
- 用户委员会：代表用户利益和需求
- 业务发展工作组：负责业务拓展
- 社区运营工作组：负责社区日常运营
- 教育工作组：负责教育培训
- 法务工作组：负责法律事务
- AI联合工作组：负责AI战略规划

**查询方式：**
- 按委员会名称查询：例如 "技术委员会"、"品牌委员会"、"用户委员会"
- 按成员姓名查询：例如 "胡欣蔚"、"熊伟"、"梁冰"
- 查询所有委员会：使用 "所有" 或 "全部"

**典型查询示例：**
- "openEuler 技术委员会有哪些成员" → 使用本工具
- "技术委员会主席是谁" → 使用本工具
- "胡欣蔚在哪个委员会" → 使用本工具
- "Kernel SIG 的维护者" → 使用 get_sig_info 工具

**返回信息包括：**
- 委员会名称和成员列表
- 成员姓名、职位
- 联系方式（如有：邮箱、Gitee账号）
- 所属单位或机构`,
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "查询关键词。可以是治理委员会名称（如'技术委员会'、'品牌委员会'、'用户委员会'），或成员姓名（如'胡欣蔚'、'熊伟'），或'所有'查看全部委员会列表。注意：这里查询的是治理组织，不是技术 SIG。"
      }
    }
  }
};
