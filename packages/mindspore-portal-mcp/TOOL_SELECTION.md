# Agent 工具选择指南

## Agent 如何选择工具？

Agent（如 Claude）通过以下信息来决定调用哪个工具：

### 1. 工具名称 (`name`)
- 简洁、描述性的名称
- 使用下划线分隔的小写命名
- 例如：`get_product_info`, `get_model_info`

### 2. 工具描述 (`description`)
这是最重要的部分！Agent 主要依靠描述来理解工具的用途。

**好的描述应该包括：**
- **简短总结**：一句话说明工具的主要功能
- **使用场景**：列出具体的使用情况
- **示例**：提供具体的输入示例
- **返回信息**：说明会返回什么样的结果

### 3. 输入参数 (`inputSchema`)
- 参数名称和类型
- 参数描述（包含示例）
- 必需/可选标记

## 本项目的工具

### 工具 1: `get_product_info`

**何时使用：**
- 用户想了解 MindSpore 可用的产品信息
- 用户需要获取产品的名称、描述、仓库地址、版本信息等详细信息
- 用户为产品管理和使用提供参考依据

**触发关键词：**
- "产品"、"产品信息"
- "MindSpore 产品"
- "核心框架"、"大模型套件"
- "产品版本"

**示例用户问题：**
- "MindSpore 有哪些产品？"
- "MindSpore 大模型套件的详细信息"
- "MindSpore 的核心框架版本是什么？"

### 工具 2: `get_sig_info`

**何时使用：**
- 用户查询某个技术 SIG 的基本信息
- 用户想了解 SIG 的代码维护者和活跃贡献者
- 用户查看 SIG 管理的 Git 代码仓库列表
- 用户获取 SIG 的分支管理和开发信息

**触发关键词：**
- "SIG"、"特别兴趣小组"
- "维护者"、"maintainer"
- "仓库"、"repository"
- "贡献者"、"committer"

**示例用户问题：**
- "MindSpore 有哪些 SIG？"
- "AI SIG 的维护者是谁？"
- "某个仓库属于哪些 SIG 组？"

### 工具 3: `get_search_info`

**何时使用：**
- 用户搜索 MindSpore 相关的文档和内容
- 用户获取特定关键词的搜索结果
- 用户需要 MindSpore 相关信息的搜索能力

**触发关键词：**
- "搜索"、"查找"、"检索"
- "文档"、"内容"
- 技术术语（如 "安装"、"教程"、"API" 等）

**示例用户问题：**
- "搜索 MindSpore 的安装指南"
- "查找 MindSpore 的教程资源"
- "搜索 MindSpore 的 API 文档"

### 工具 4: `get_search_components`

**何时使用：**
- 用户了解 MindSpore 可搜索的组件列表
- 用户为搜索功能提供组件选项
- 用户辅助用户进行更精确的搜索

**触发关键词：**
- "搜索组件"、"组件列表"
- "可搜索的组件"
- "组件版本"

**示例用户问题：**
- "MindSpore 有哪些可搜索的组件？"
- "某个组件的版本信息"
- "MindSpore 的组件列表"

### 工具 5: `get_ecosystem_info`

**何时使用：**
- 用户了解 MindSpore 生态中的三方开发库
- 用户查询 MindSpore 相关的教程资源
- 用户查找 MindSpore 生态中的三方模型

**触发关键词：**
- "生态"、"生态资源"
- "三方库"、"三方开发库"
- "教程"、"模型"

**示例用户问题：**
- "MindSpore 有哪些三方开发库？"
- "查找 MindSpore 的教程资源"
- "MindSpore 生态中的三方模型"

### 工具 6: `get_case_info`

**何时使用：**
- 用户了解 MindSpore 在不同领域的应用案例
- 用户查询特定类型的应用案例
- 用户查找特定分类的应用案例

**触发关键词：**
- "案例"、"应用案例"
- "企业案例"、"开发者案例"、"高校案例"
- "应用场景"、"使用案例"

**示例用户问题：**
- "MindSpore 的企业应用案例"
- "医疗领域的 MindSpore 应用案例"
- "高校使用 MindSpore 的案例"

### 工具 7: `get_paper_info`

**何时使用：**
- 用户了解 MindSpore 相关的学术研究
- 用户查询特定领域的学术论文
- 用户查找特定年份的学术论文

**触发关键词：**
- "论文"、"学术论文"
- "研究"、"学术研究"
- "领域"、"年份"

**示例用户问题：**
- "MindSpore 相关的学术论文"
- "2024 年 MindSpore 的学术论文"
- "计算视觉领域的 MindSpore 论文"

### 工具 8: `get_dashboard_info`

**何时使用：**
- 用户了解 MindSpore 社区的活跃度和发展情况
- 用户分析 MindSpore 社区的贡献者和代码提交情况
- 用户监控 MindSpore 社区的下载量和问题处理情况

**触发关键词：**
- "社区"、"社区活跃度"
- "下载量"、"贡献者"
- "PR"、"Issue"

**示例用户问题：**
- "MindSpore 社区的活跃度如何？"
- "MindSpore 有多少贡献者？"
- "MindSpore 的下载量是多少？"

### 工具 9: `get_internship_task_info`

**何时使用：**
- 用户了解 MindSpore 社区的实习任务
- 用户查询不同类型的实习任务
- 用户查找具体任务的详细信息和链接

**触发关键词：**
- "实习"、"实习任务"
- "任务"、"社区任务"

**示例用户问题：**
- "MindSpore 有哪些实习任务？"
- "某个类型的实习任务详情"
- "MindSpore 的社区任务"

### 工具 10: `get_installation_guide`

**何时使用：**
- 用户了解 MindSpore 的安装和升级步骤
- 用户查询特定版本的安装指南
- 用户获取安装过程中的注意事项

**触发关键词：**
- "安装"、"安装指南"
- "升级"、"更新"
- "版本"、"安装步骤"

**示例用户问题：**
- "MindSpore 的安装教程"
- "MindSpore r2.8.0 的安装指南"
- "如何升级 MindSpore？"

### 工具 11: `get_model_info`

**何时使用：**
- 用户了解 MindSpore 模型库中的模型
- 用户搜索特定名称的模型
- 用户按不同维度排序模型
- 用户按任务类型、行业、许可证筛选模型

**触发关键词：**
- "模型"、"模型库"
- "搜索模型"、"排序模型"
- "模型筛选"、"任务类型"

**示例用户问题：**
- "MindSpore 模型库中有哪些模型？"
- "搜索图像分类相关的模型"
- "按下载量排序的模型"

### 工具 12: `get_dataset_info`

**何时使用：**
- 用户了解 MindSpore 数据集库中的数据集
- 用户搜索特定名称的数据集
- 用户按不同维度排序数据集
- 用户按任务类型、行业、许可证筛选数据集

**触发关键词：**
- "数据集"、"数据集库"
- "搜索数据集"、"排序数据集"
- "数据集筛选"、"数据任务"

**示例用户问题：**
- "MindSpore 数据集库中有哪些数据集？"
- "搜索图像分类相关的数据集"
- "按下载量排序的数据集"

## 工具描述优化原则

### ✅ 好的描述

```javascript
{
  name: "get_model_info",
  description: `查询 MindSpore 模型库信息。

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
- count_per_page: 每页数量，可取值为 16、32、64，默认为 16
- sort_by: 排序方式，可取值为 global_score（综合排序）、download_count（下载量）、update_time（最新更新）、first_letter（首字母）
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
        description: `每页数量，可取值为 16、32、64，默认为 16`,
        enum: [16, 32, 64],
        default: 16
      },
      sort_by: {
        type: "string",
        description: `排序方式，可取值为 global_score（综合排序）、download_count（下载量）、update_time（最新更新）、first_letter（首字母）`,
        enum: ["global_score", "download_count", "update_time", "first_letter"],
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
}
```

### ❌ 不好的描述

```javascript
{
  name: "get_model_info",
  description: "获取模型信息",  // 太简短，缺少上下文
  inputSchema: {
    type: "object",
    properties: {
      page_num: {
        type: "number",
        description: "页码",  // 缺少示例和默认值
      },
      name: {
        type: "string",
        description: "模型名称",  // 缺少示例
      },
    },
  },
}
```

## 测试工具选择

你可以通过以下方式测试 Agent 是否能正确选择工具：

### 测试场景 1：产品信息查询
**用户问题：** "MindSpore 有哪些产品？"
**期望工具：** `get_product_info`
**参数：** 无

### 测试场景 2：模型库查询
**用户问题：** "搜索图像分类相关的模型"
**期望工具：** `get_model_info`
**参数：** `name: "图像分类"` 或 `task: "image-classification"`

### 测试场景 3：数据集库查询
**用户问题：** "MindSpore 数据集库中有哪些数据集？"
**期望工具：** `get_dataset_info`
**参数：** 无

### 测试场景 4：安装教程查询
**用户问题：** "MindSpore 的安装教程"
**期望工具：** `get_installation_guide`
**参数：** 无

### 测试场景 5：社区活跃度查询
**用户问题：** "MindSpore 社区的活跃度如何？"
**期望工具：** `get_dashboard_info`
**参数：** 无

## 提示

1. **描述要详细**：Agent 只能通过描述来理解工具，描述越详细越好
2. **提供示例**：具体的示例帮助 Agent 理解如何使用
3. **说明场景**：明确列出使用场景，帮助 Agent 判断
4. **参数说明**：参数描述中包含示例值
5. **使用 Markdown**：描述支持 Markdown 格式，可以使用列表、加粗等

## 调试技巧

如果 Agent 选择了错误的工具：

1. **检查描述**：描述是否清晰地说明了工具的用途？
2. **添加场景**：在描述中添加更多使用场景
3. **提供示例**：添加具体的输入输出示例
4. **区分工具**：确保不同工具的描述有明显区别
5. **测试提示词**：尝试不同的用户问题，看 Agent 的选择是否合理