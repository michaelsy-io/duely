import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { DUELY_TOOLS, type ToolCtx } from "./tools";

function buildServer(ctx: ToolCtx): McpServer {
  const server = new McpServer({ name: "duely", version: "0.1.0" });
  for (const t of DUELY_TOOLS) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.inputSchema.shape },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: any) => {
        try {
          const result = await (t.execute as (i: unknown, c: ToolCtx) => Promise<unknown>)(t.inputSchema.parse(args ?? {}), ctx);
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 1) }] };
        } catch (e) {
          return { isError: true, content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
  }
  return server;
}

function authorized(req: Request): boolean {
  const token = process.env.MCP_TOKEN;
  if (!token) return true;
  const h = req.headers.get("authorization") ?? "";
  return h === `Bearer ${token}`;
}

/** Stateless Streamable-HTTP MCP endpoint (one server + transport per request). */
export async function handleMcp(req: Request, ctx: ToolCtx): Promise<Response> {
  if (!authorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", "www-authenticate": 'Bearer realm="duely-mcp"' },
    });
  }
  if (req.method === "GET" || req.method === "DELETE") {
    // stateless server: no SSE stream / sessions
    return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }), {
      status: 405,
      headers: { "content-type": "application/json", allow: "POST" },
    });
  }
  const server = buildServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // JSON-response mode has fully produced the body by now
    void transport.close().catch(() => {});
    void server.close().catch(() => {});
  }
}
