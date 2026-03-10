// 获取 MindSpore 模型库信息
import { COUNT_PER_PAGE, SORT_OPTIONS } from '../config/query.js';
import { MODEL_TASKS } from '../config/model-task.js';
import { INDUSTRY } from '../config/industry.js';
import { LICENSES } from '../config/license.js';

export async function getModelInfo({ page_num = 1, count_per_page = 16, sort_by = 'global_score', name = '', task = '', industry = [], license = '' }) {
  try {
    // 验证参数
    if (typeof page_num !== 'number' || page_num < 1) {
      return `参数错误：page_num 必须是大于等于 1 的数字`;
    }
    
    if (!COUNT_PER_PAGE.includes(count_per_page)) {
      return `参数错误：count_per_page 必须是 ${COUNT_PER_PAGE.join('、')} 中的一个`;
    }
    
    const validSortValues = SORT_OPTIONS.map(option => option.value);
    if (!validSortValues.includes(sort_by)) {
      return `参数错误：sort_by 必须是 ${validSortValues.join('、')} 中的一个`;
    }
    
    if (typeof name !== 'string') {
      return `参数错误：name 必须是字符串`;
    }
    
    if (task && !MODEL_TASKS.includes(task)) {
      return `参数错误：task 必须是 ${MODEL_TASKS.join('、')} 中的一个`;
    }
    
    if (!Array.isArray(industry)) {
      return `参数错误：industry 必须是数组`;
    }
    
    for (const item of industry) {
      if (!INDUSTRY.includes(item)) {
        return `参数错误：industry 中的值必须是 ${INDUSTRY.join('、')} 中的一个`;
      }
    }
    
    if (license) {
      const validLicenseValues = LICENSES.map(license => license.value);
      if (!validLicenseValues.includes(license)) {
        return `参数错误：license 必须是 ${validLicenseValues.join('、')} 中的一个`;
      }
    }
    
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('page_num', page_num);
    params.append('count_per_page', count_per_page);
    params.append('sort_by', sort_by);
    
    if (name) {
      params.append('name', name);
    }
    
    // 合并所有 tags 值，用逗号拼接
    const tags = [];
    if (task) {
      tags.push(task);
    }
    tags.push(...industry);
    if (license) {
      tags.push(license);
    }
    
    if (tags.length > 0) {
      params.append('tags', tags.join(','));
    }
    
    // 发送请求
    const response = await fetch(`https://xihe.mindspore.cn/server/model?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return `获取模型库信息时 API 返回错误状态码：${response.status}`;
    }

    const data = await response.json();

    // 检查返回数据格式
    if (!data || typeof data !== 'object') {
      return `获取模型库信息失败：返回数据格式不正确`;
    }

    const sections = [];
    sections.push(`
╔════════════════════════════════════════════════════════════╗
║  MindSpore 模型库查询结果                                 ║
╚════════════════════════════════════════════════════════════╝`);

    // 显示查询参数
    sections.push(`\n查询参数：`);
    sections.push(`  页码: ${page_num}`);
    sections.push(`  每页数量: ${count_per_page}`);
    sections.push(`  排序方式: ${SORT_OPTIONS.find(option => option.value === sort_by)?.label || sort_by}`);
    sections.push(`  模型名称: ${name || '无'}`);
    sections.push(`  任务类型: ${task || '无'}`);
    sections.push(`  行业: ${industry.length > 0 ? industry.join('、') : '无'}`);
    sections.push(`  许可证: ${license || '无'}`);

    // 显示结果
    if (data.data && data.data.projects && Array.isArray(data.data.projects)) {
      sections.push(`\n共找到 ${data.data.total || 0} 个模型，当前页显示 ${data.data.projects.length} 个`);
      
      data.data.projects.forEach((model, index) => {
        const modelName = model.title || model.name || '未知';
        const updateTime = model.updated_at || model.update_time || '未知';
        const modelUrl = model.owner && model.name ? `https://xihe.mindspore.cn/models/${model.owner}/${model.name}` : '未知';
        const likeCount = model.like_count || 0;
        
        sections.push(`\n【模型 ${(page_num - 1) * count_per_page + index + 1}】`);
        sections.push(`  名称: ${modelName}`);
        sections.push(`  描述: ${model.desc || '未知'}`);
        sections.push(`  标签: ${model.tags && model.tags.length > 0 ? model.tags.join('、') : '无'}`);
        sections.push(`  下载量: ${model.download_count || 0}`);
        sections.push(`  收藏量: ${likeCount}`);
        sections.push(`  更新时间: ${updateTime}`);
        sections.push(`  链接: ${modelUrl}`);
      });
    } else {
      sections.push(`\n未找到模型数据`);
    }

    sections.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    sections.push(`查询时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return sections.join("\n");
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `获取模型库信息时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_model_info",
  description: `获取 MindSpore 模型库信息。

从 MindSpore 模型库中查询模型信息，支持分页、排序和搜索功能。

**使用场景：**
- 了解 MindSpore 模型库中的模型
- 搜索特定名称的模型
- 按不同维度排序模型
- 按任务类型筛选模型
- 按行业筛选模型
- 按许可证筛选模型

**参数说明：**
- page_num: 页码，默认为 1
- count_per_page: 每页数量，可取值为 ${COUNT_PER_PAGE.join('、')}，默认为 16
- sort_by: 排序方式，可取值为 ${SORT_OPTIONS.map(option => `${option.label} (${option.value})`).join('、')}，其中 global_score 表示综合排序，download_count 表示下载量，update_time 表示最新更新，first_letter 表示首字母
- name: 搜索的模型名称关键词
- task: 任务类型，从 MODEL_TASKS 中取值，最多传递一个
- industry: 行业，从 INDUSTRY 中取值，可以传递多个
- license: 许可证，从 LICENSES 中取值，只能传递一个

**返回信息包括：**
- 模型名称、描述、标签
- 下载量、收藏量、更新时间
- 模型链接`,
  inputSchema: {
    type: "object",
    properties: {
      page_num: {
        type: "number",
        description: "页码，默认为 1",
        minimum: 1,
        default: 1
      },
      count_per_page: {
        type: "number",
        description: `每页数量，可取值为 ${COUNT_PER_PAGE.join('、')}，默认为 16`,
        enum: COUNT_PER_PAGE,
        default: 16
      },
      sort_by: {
        type: "string",
        description: `排序方式，可取值为 ${SORT_OPTIONS.map(option => `${option.label} (${option.value})`).join('、')}`,
        enum: SORT_OPTIONS.map(option => option.value),
        default: "global_score"
      },
      name: {
        type: "string",
        description: "搜索的模型名称关键词"
      },
      task: {
        type: "string",
        description: "任务类型，从 MODEL_TASKS 中取值，最多传递一个",
        enum: MODEL_TASKS
      },
      industry: {
        type: "array",
        description: "行业，从 INDUSTRY 中取值，可以传递多个",
        items: {
          type: "string",
          enum: INDUSTRY
        }
      },
      license: {
        type: "string",
        description: "许可证，从 LICENSES 中取值，只能传递一个",
        enum: LICENSES.map(license => license.value)
      }
    },
  },
};
