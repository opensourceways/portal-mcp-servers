// 获取 MindSpore 安装教程
export async function getInstallationGuide({ version = 'r2.8.0' } = {}) {
  try {
    // 构建安装教程的 URL
    const guideUrl = `https://www.mindspore.cn/install/${version}/mindspore_ascend_install_pip.md`;
    
    // 发送 GET 请求
    const response = await fetch(guideUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return `获取安装教程时 API 返回错误状态码：${response.status}`;
    }

    const content = await response.text();

    // 验证内容
    if (!content) {
      return `获取安装教程失败：返回内容为空。`;
    }

    return content.trim();
  } catch (e) {
    if (e.name === "AbortError") {
      return `网络请求超时，请稍后重试。`;
    }
    return `获取安装教程时发生错误：${e.message}`;
  }
}

// 工具定义
export const toolDefinition = {
  name: "get_installation_guide",
  description: `获取 MindSpore 安装教程。

获取 MindSpore 指定版本的安装教程 markdown 内容，包括依赖软件安装、MindSpore 安装、升级、环境变量配置和验证安装等步骤。

**使用场景：**
- 了解 MindSpore 的安装和升级步骤
- 查询特定版本的安装指南
- 获取安装过程中的注意事项

**参数说明：**
- version: MindSpore 版本号，默认为 r2.8.0，格式为 rX.X.X

**返回信息包括：**
- 安装教程的详细步骤和说明`,
  inputSchema: {
    type: "object",
    properties: {
      version: {
        type: "string",
        description: "MindSpore 版本号，格式为 rX.X.X，默认为 r2.8.0",
        default: "r2.8.0"
      }
    },
  },
};
