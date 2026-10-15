# Duely MCP server

Duely exposes its collections data tools over MCP (Streamable HTTP, stateless):

`https://<deployment>/api/mcp/mcp` — append `?period=P2` to default to the September run (default P1).

Tools: `get_today_list`, `get_client`, `get_kpis`, `get_pdc_calendar`, `search_ledger`, `log_contact`, `draft_message`. Every tool also accepts an optional `period` (`P1` = 31 Aug 2026, `P2` = 30 Sep 2026). All numbers come from the rules engine; `draft_message` only queues a draft for supervisor approval — nothing is sent.

When the deployment has `MCP_TOKEN` set, clients must send `Authorization: Bearer <MCP_TOKEN>`.

## Claude Code

```bash
claude mcp add --transport http duely https://<deployment>/api/mcp/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

or in `.mcp.json`:

```json
{
  "mcpServers": {
    "duely": {
      "type": "http",
      "url": "https://<deployment>/api/mcp/mcp",
      "headers": { "Authorization": "Bearer ${DUELY_MCP_TOKEN}" }
    }
  }
}
```

Then run `/daily-brief`.

## Claude Desktop

Settings → Connectors → Add custom connector → URL `https://<deployment>/api/mcp/mcp` (works when `MCP_TOKEN` is unset). With a token, use `mcp-remote` in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "duely": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://<deployment>/api/mcp/mcp", "--header", "Authorization: Bearer ${DUELY_MCP_TOKEN}"],
      "env": { "DUELY_MCP_TOKEN": "<MCP_TOKEN>" }
    }
  }
}
```

## Quick test

```bash
curl -X POST https://<deployment>/api/mcp/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -H "authorization: Bearer $MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Implementation note: `mcp-handler@2` requires `@modelcontextprotocol/server@2` + `zod@4`; this project ships `@modelcontextprotocol/sdk@1` + `zod@3`, so the route mounts the SDK's `WebStandardStreamableHTTPServerTransport` directly (`lib/mcp/server.ts`).
