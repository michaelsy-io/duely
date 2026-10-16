// Duely MCP server — the same data tools the in-app chat uses.
// URL: https://<deployment>/api/mcp/mcp   (Streamable HTTP, stateless)
// Auth: `Authorization: Bearer $MCP_TOKEN` when MCP_TOKEN is set.
//
// Note: mcp-handler@2 needs @modelcontextprotocol/server@2 + zod@4, which this project does not have
// (it has @modelcontextprotocol/sdk@1 + zod@3), so we mount the SDK's web-standard transport directly.
import { handleMcp } from "@/lib/mcp/server";
import { normalizePeriod } from "@/lib/ai/context";
import { DEFAULT_PERIOD } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const period = normalizePeriod(url.searchParams.get("period") ?? req.headers.get("x-duely-period")) ?? DEFAULT_PERIOD;
  return handleMcp(req, { period });
}

export { handler as GET, handler as POST, handler as DELETE };
