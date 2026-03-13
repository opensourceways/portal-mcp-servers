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
import { getSigInfo, toolDefinition as getSigInfoDef } from "./tools/getSigInfo.js";
import { getMeetingInfo, toolDefinition as getMeetingInfoDef } from "./tools/getMeetingInfo.js";
import { getAppInfo, toolDefinition as getAppInfoDef } from "./tools/getAppInfo.js";
import { getDocInfo, toolDefinition as getDocInfoDef } from "./tools/getDocInfo.js";

// 工具列表
const tools = [
  getSigInfoDef,
  getMeetingInfoDef,
  getAppInfoDef,
  getDocInfoDef,
];

// 工具处理函数映射
const toolHandlers = {
  get_sig_info: getSigInfo,
  get_meeting_info: getMeetingInfo,
  get_app_info: getAppInfo,
  get_doc_info: getDocInfo,
};

// 创建服务器实例
function createServer() {
  const server = new Server(
    {
      name: "openubmc-mcp-server",
      version: "0.1.0",
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
    const { name, arguments: args } = request.params;

    try {
      const handler = toolHandlers[name];

      if (!handler) {
        return {
          content: [{ type: "text", text: `错误：未知工具：${name}` }],
          isError: true,
        };
      }

      let result;
      if (name === "get_sig_info") {
        result = await handler(
          args.sig_name || "",
          args.query_type || "sig",
          args.contribute_type || "pr"
        );
      } else if (name === "get_meeting_info") {
        result = await handler(
          args.query_type || "date",
          args.date || "",
          args.sig_name || ""
        );
      } else if (name === "get_app_info") {
        result = await handler(
          args.query_type || "list",
          args.package_name || "",
          args.version || "",
          args.list_type || ""
        );
      } else if (name === "get_doc_info") {
        result = await handler(
          args.query_type || "toc",
          args.keyword || "",
          args.section || "",
          args.lang || "all",
          args.url || ""
        );
      }

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `执行工具时发生错误：${error.message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// 启动服务器
async function main() {
  const args = process.argv.slice(2);
  const transportMode =
    args.includes("--sse") || process.env.TRANSPORT === "sse" ? "sse" : "stdio";

  if (transportMode === "sse") {
    // SSE 模式 - 用于远程连接
    const PORT = process.env.PORT || 3000;
    const transports = new Map();

    const httpServer = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === "/sse" && req.method === "GET") {
        console.error(
          `[${new Date().toISOString()}] 新的 SSE 连接 from ${req.headers["x-forwarded-for"] || req.socket.remoteAddress}`
        );

        try {
          const server = createServer();
          const transport = new SSEServerTransport("/message", res);
          const sessionId = Date.now().toString();
          transports.set(sessionId, { server, transport });

          await server.connect(transport);
          console.error(
            `[${new Date().toISOString()}] SSE 连接已建立 (session: ${sessionId})`
          );

          const keepAliveInterval = setInterval(() => {
            if (!res.writableEnded) {
              res.write(": keepalive\n\n");
            } else {
              clearInterval(keepAliveInterval);
            }
          }, 30000);

          req.on("close", () => {
            console.error(
              `[${new Date().toISOString()}] SSE 连接关闭 (session: ${sessionId})`
            );
            clearInterval(keepAliveInterval);
            transports.delete(sessionId);
          });

          req.on("error", (error) => {
            console.error(
              `[${new Date().toISOString()}] SSE 连接错误 (session: ${sessionId}):`,
              error
            );
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
        let body = "";
        req.on("data", (chunk) => { body += chunk.toString(); });

        req.on("end", async () => {
          try {
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
          activeConnections: transports.size,
        }));
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });

    httpServer.on("error", (error) => {
      console.error("HTTP 服务器错误:", error);
    });

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.error(`\n========================================`);
      console.error(`openUBMC MCP 服务器已启动 (SSE 模式)`);
      console.error(`监听地址: 0.0.0.0:${PORT}`);
      console.error(`SSE 端点: http://0.0.0.0:${PORT}/sse`);
      console.error(`消息端点: http://0.0.0.0:${PORT}/message`);
      console.error(`健康检查: http://0.0.0.0:${PORT}/health`);
      console.error(`========================================\n`);
    });
  } else {
    // Stdio 模式 - 用于 Cursor 等 IDE
    console.error("openUBMC MCP 服务器启动 (Stdio 模式)");
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
