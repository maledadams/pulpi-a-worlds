# Agentation local setup

This repo is wired so Agentation only loads in local development and never in production.

## What is already configured

- The React toolbar is mounted from `src/components/dev/AgentationToolbar.tsx`.
- The toolbar reads `VITE_AGENTATION_ENDPOINT` and falls back to `http://localhost:4747`.
- Codex MCP config is in `.mcp.json` and starts `scripts/agentation-mcp-server.mjs`.
- That wrapper auto-injects a webhook URL for Agentation:
  - default app URL: `http://127.0.0.1:5173`
  - default webhook URL: `http://127.0.0.1:5173/api/agentation/webhook`
- Utility scripts are in `package.json`:
  - `pnpm agentation:doctor`
  - `pnpm agentation:mcp`

## How to use it

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start the app:
   ```bash
   pnpm dev
   ```
3. If your Agentation MCP server is not on `http://localhost:4747`, set `VITE_AGENTATION_ENDPOINT` in `.env` and `.dev.vars` to the URL your browser should call.
4. Verify Agentation:
   ```bash
   pnpm agentation:doctor
   ```
5. Restart Codex after changing `.mcp.json` so the MCP server is picked up.
6. Open the site in a desktop browser. The Agentation toolbar should appear automatically in development.
7. Add annotations in the browser, then ask Codex to read pending Agentation items.

## Webhook setup

- Agentation MCP now computes `AGENTATION_WEBHOOK_URL` automatically when it starts.
- By default it points to:
  - `http://127.0.0.1:5173/api/agentation/webhook`
- If your app runs on another port, launch Agentation MCP with:
  ```powershell
  $env:AGENTATION_APP_URL="http://127.0.0.1:4173"
  pnpm agentation:mcp
  ```
- You can inspect received webhook calls in the browser or terminal:
  - `GET /api/agentation/webhook`
  - example: `http://127.0.0.1:5173/api/agentation/webhook`

## Running against an existing MCP server

- If Codex should launch Agentation for this repo, keep the `.mcp.json` entry as-is.
- If you already run Agentation MCP elsewhere, point `VITE_AGENTATION_ENDPOINT` at that server and update `.mcp.json` only if you also want Codex to manage that process.
- The browser toolbar URL and the MCP server URL need to match, otherwise annotations will be created in one place and Codex will read from another.

## Important constraints

- Agentation is desktop-focused.
- The toolbar is dev-only by design.
- If you change the port for the local server, update `.mcp.json` and `VITE_AGENTATION_ENDPOINT` together.
- `pnpm agentation:doctor` may still mention missing `Claude Code` config. In this repo that warning is irrelevant as long as `.mcp.json` exists and the local server is healthy.
