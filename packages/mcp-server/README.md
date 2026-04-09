/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

# TiltCheck MCP Server

Exposes TiltCheck site context, casino trust data, and RGaaS API tools to any MCP-compatible AI agent (Claude Desktop, Cursor, Copilot, etc.).

Once connected, every AI session automatically has context about:
- What TiltCheck is and how it works
- All casino grades/risk/categories
- Live trust scores from the API
- Domain scanning and license checking
- Brand rules and code conventions

## Setup

### 1. Build

```bash
cd packages/mcp-server
pnpm build
```

### 2. Connect to Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):

```json
{
  "mcpServers": {
    "tiltcheck": {
      "command": "node",
      "args": ["C:/Users/<you>/tiltcheck-monorepo/packages/mcp-server/dist/index.js"],
      "env": {
        "TILTCHECK_API_URL": "https://api.tiltcheck.me",
        "MONOREPO_ROOT": "C:/Users/<you>/tiltcheck-monorepo"
      }
    }
  }
}
```

Replace `<you>` with your Windows username.

### 3. Connect to Cursor

Create `.cursor/mcp.json` in the monorepo root (already created — see that file).

### 4. Connect to VS Code Copilot

Add to `.vscode/mcp.json` (already created — see that file).

## Available Tools

| Tool | Description |
| :--- | :--- |
| `get_site_context` | Full TiltCheck context — mission, tools, API, brand rules |
| `get_casino_scores` | Live trust scores from the running API |
| `get_casino_info` | Look up a casino by name (partial match) |
| `check_domain` | SusLink + license scan for any casino domain |
| `list_api_endpoints` | All RGaaS API endpoints with descriptions |
| `get_shadow_bans` | Current community-reported casino flags |

## Available Resources

| URI | Description |
| :--- | :--- |
| `tiltcheck://context` | Full site context (Markdown) |
| `tiltcheck://casinos` | Casino list JSON |

## Environment Variables

| Var | Default | Description |
| :--- | :--- | :--- |
| `TILTCHECK_API_URL` | `https://api.tiltcheck.me` | Override to point at local API (`http://localhost:3001`) |
| `MONOREPO_ROOT` | Auto-detected | Path to monorepo root for loading `casinos.json` |
