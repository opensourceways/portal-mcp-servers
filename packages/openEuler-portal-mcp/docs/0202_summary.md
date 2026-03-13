# GEO

## GEO 是什么？

GEO，全称Generative Engine Optimization（生成式引擎优化），是**专为AI生成式搜索引擎设计的内容优化体系**。

## GEO VS SEO

**SEO**：提高网站在Google、Bing等传统搜索引擎中的排名。

**GEO**：提高网站在AI生成的搜索结果中的可见性。

**区别**：

* 结果交付模式：从“给链接” 到 “给答案”
* 产品形态：从“单次无状态” 到 “多轮上下文交互”
* 底层技术实现：从“关键词匹配” 到 “意图识别 + 内容重构”
* 是否访问源网站：从“为算法服务” 到 生产“权威准确内容”

## 如何提升GEO效果？

### 内容层面

引用权威内容或者外部链接、多平台进行分发、增加引述和引用、在文章中添加更新日期等。

### IT层面（以openEuler为例）

不同于专为搜索引擎设计的 [robots.txt](https://www.openeuler.openatom.cn/robots.txt) 和 [sitemap.xml](https://www.openeuler.openatom.cn/sitemap.xml)，[llms.txt](https://llmstxt.org/)专门针对 LLM 推理引擎进行了优化。它以一种易于 LLM 推理引擎理解的方式，提供了网站的详细信息。

* [llms.txt](https://openeuler.test.osinfra.cn/llms.txt)：这是一个简化版的文档导航视图，旨在帮助 AI 系统迅速把握网站的框架结构。
* [llms-full.txt](https://openeuler.test.osinfra.cn/llms-full.txt)：这是一个集成了所有文档的完整文件，方便集中查阅。

## 如何在AI中使用llms.txt？

和主动抓取网络的搜索引擎或者爬虫不同，由于 llms-txt 还没有成为被完全认可的标准，因此目前 LLMs 还不会自动发现和索引 llms.txt 文件。可以通过以下方式使用：

* 使用工具集成：[context7](https://context7.com)，其可以拉去最新的、基于特定版本的文档、代码示例，将示例直接加入到Claude Code、Cursor、Trae中。
* 直接引入：Cursor支持直接添加并索引外部文档。
* 主动暴露：直接将链接或文档内容主动暴露。

使用效果：[0129.md](./0129.md)、[0130.md](./0130.md)。

# MCP Server

## 如何让LLM更懂社区？

MCP 可以通过**上下文共享**、**工具暴露**帮助模型获取更丰富的上下文信息，生成更准确的回复。

社区官网信息来源主要分为三类：**文档**、**API**、**静态结构化数据**，针对这三种场景分别添加工具。

* 文档：官网承载大量业务、技术MarkDown文档，这部分内容可以通过llms.txt检索。
* API: 起服务或工具调用API返回相关信息。
* 静态结构化数据：后续考虑Headless CMS形态获取。

## 思路

* 应用决定用什么：根据核心信息范围，提供正确的llms.txt及信息、暴露正确且安全的API。
* 用户选择用什么：提供标准化的prompt模板，尽量健全非标准化prompt下的检索能力。
* AI决定用什么：定义清晰的inputSchema及description，给AI指导文档。

## 怎么建MCP Server

我也不知道，去问Claude Code吧...

* Python 转 js
* 新增工具函数
* 拆分文件
* 优化工具说明
* 撰写文档

