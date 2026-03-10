#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";

// 导入工具函数
import { getProductInfo, toolDefinition as getProductInfoDef } from "./tools/getProductInfo.js";
import { getSigInfo, toolDefinition as getSigInfoDef } from "./tools/getSigInfo.js";
import { getSearchInfo, toolDefinition as getSearchInfoDef } from "./tools/getSearchInfo.js";
import { getSearchComponents, toolDefinition as getSearchComponentsDef } from "./tools/getSearchComponents.js";
import { getEcosystemInfo, toolDefinition as getEcosystemInfoDef } from "./tools/getEcosystemInfo.js";
import { getCaseInfo, toolDefinition as getCaseInfoDef } from "./tools/getCaseInfo.js";
import { getPaperInfo, toolDefinition as getPaperInfoDef } from "./tools/getPaperInfo.js";
import { getDashboardInfo, toolDefinition as getDashboardInfoDef } from "./tools/getDashboardInfo.js";
import { getInternshipTaskInfo, toolDefinition as getInternshipTaskInfoDef } from "./tools/getInternshipTaskInfo.js";
import { getInstallationGuide, toolDefinition as getInstallationGuideDef } from "./tools/getInstallationGuide.js";
import { getModelInfo, toolDefinition as getModelInfoDef } from "./tools/getModelInfo.js";
import { getDatasetInfo, toolDefinition as getDatasetInfoDef } from "./tools/getDatasetInfo.js";

// 工具列表
const tools = [
  getProductInfoDef,
  getSigInfoDef,
  getSearchInfoDef,
  getSearchComponentsDef,
  getEcosystemInfoDef,
  getCaseInfoDef,
  getPaperInfoDef,
  getDashboardInfoDef,
  getInternshipTaskInfoDef,
  getInstallationGuideDef,
  getModelInfoDef,
  getDatasetInfoDef,
];

// 工具处理器
const toolHandlers = {
  get_product_info: getProductInfo,
  get_sig_info: getSigInfo,
  get_search_info: getSearchInfo,
  get_search_components: getSearchComponents,
  get_ecosystem_info: getEcosystemInfo,
  get_case_info: getCaseInfo,
  get_paper_info: getPaperInfo,
  get_dashboard_info: getDashboardInfo,
  get_internship_task_info: getInternshipTaskInfo,
  get_installation_guide: getInstallationGuide,
  get_model_info: getModelInfo,
  get_dataset_info: getDatasetInfo,
};

// 创建服务器实例的工厂函数
function createServer() {
  const server = new Server(
    {
      name: "mindspore-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 处理工具列表请求
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // 处理工具调用请求
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;

    try {
      const handler = toolHandlers[name];

      if (!handler) {
        return {
          content: [
            {
              type: "text",
              text: `错误：未知工具：${name}`,
            },
          ],
          isError: true,
        };
      }

      // 调用对应的工具处理函数，传递参数
      const result = await handler(request.params.arguments || {});

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `执行工具时发生错误：${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// 启动服务器
async function main() {
  // 检查命令行参数或环境变量
  const args = process.argv.slice(2);
  const transportMode = args.includes("--sse") || process.env.TRANSPORT === "sse" ? "sse" : "stdio";

  if (transportMode === "sse") {
    // SSE 模式 - 用于远程连接
    const PORT = process.env.PORT || 3000;

    // 存储活动的传输连接
    const transports = new Map();

    const httpServer = http.createServer(async (req, res) => {
      // 添加 CORS 头
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      // 处理 OPTIONS 预检请求
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === "/sse" && req.method === "GET") {
        console.error(`[${new Date().toISOString()}] 新的 SSE 连接 from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);

        try {
          // 为每个连接创建新的服务器实例
          const server = createServer();
          const transport = new SSEServerTransport("/message", res);

          // 保存传输实例
          const sessionId = Date.now().toString();
          transports.set(sessionId, { server, transport });

          await server.connect(transport);
          console.error(`[${new Date().toISOString()}] SSE 连接已建立 (session: ${sessionId})`);

          // 设置保活心跳（每30秒发送一次）
          const keepAliveInterval = setInterval(() => {
            if (!res.writableEnded) {
              res.write(': keepalive\n\n');
              console.error(`[${new Date().toISOString()}] 发送保活心跳 (session: ${sessionId})`);
            } else {
              clearInterval(keepAliveInterval);
            }
          }, 30000);

          // 监听连接关闭
          req.on("close", () => {
            console.error(`[${new Date().toISOString()}] SSE 连接关闭 (session: ${sessionId})`);
            clearInterval(keepAliveInterval);
            transports.delete(sessionId);
          });

          // 监听错误
          req.on("error", (error) => {
            console.error(`[${new Date().toISOString()}] SSE 连接错误 (session: ${sessionId}):`, error);
            clearInterval(keepAliveInterval);
            transports.delete(sessionId);
          });

        } catch (error) {
          console.error(`[${new Date().toISOString()}] SSE 连接错误:`, error);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
          }
        }
      } else if (url.pathname === "/message" && req.method === "POST") {
        // 处理客户端消息
        console.error(`[${new Date().toISOString()}] 收到消息请求`);

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            console.error(`[${new Date().toISOString()}] 消息内容: ${body.substring(0, 100)}...`);

            // 返回成功响应
            res.writeHead(202, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "accepted" }));
          } catch (error) {
            console.error(`[${new Date().toISOString()}] 处理消息错误:`, error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (url.pathname === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          activeConnections: transports.size
        }));
      } else {
        console.error(`[${new Date().toISOString()}] 404: ${req.method} ${url.pathname}`);
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });

    httpServer.on("error", (error) => {
      console.error("HTTP 服务器错误:", error);
    });

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.error(`\n========================================`);
      console.error(`MindSpore MCP 服务器已启动 (SSE 模式)`);
      console.error(`监听地址: 0.0.0.0:${PORT}`);
      console.error(`SSE 端点: http://0.0.0.0:${PORT}/sse`);
      console.error(`消息端点: http://0.0.0.0:${PORT}/message`);
      console.error(`健康检查: http://0.0.0.0:${PORT}/health`);
      console.error(`外部访问: http://<your-domain>:${PORT}/sse`);
      console.error(`========================================\n`);
    });
  } else {
    // Stdio 模式 - 用于 Cursor 等 IDE
    console.error("MindSpore MCP 服务器启动 (Stdio 模式)");
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP 服务器已就绪，等待连接...");
  }
}

main().catch((error) => {
  console.error("服务器启动错误：", error);
  process.exit(1);
});