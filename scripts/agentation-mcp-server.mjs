import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const appUrl = (process.env.AGENTATION_APP_URL || "http://127.0.0.1:5173").trim().replace(/\/+$/g, "");
const webhookUrl =
  process.env.AGENTATION_WEBHOOK_URL?.trim() || `${appUrl}/api/agentation/webhook`;

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(command, ["exec", "agentation-mcp", "server", ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    AGENTATION_WEBHOOK_URL: webhookUrl,
  },
});

console.error(`[agentation] webhook -> ${webhookUrl}`);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
