#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = resolve("scripts/check-deploy-scripts.sh");

if (!existsSync(scriptPath)) {
  console.error(`Missing script: ${scriptPath}`);
  process.exit(1);
}

const candidates =
  process.platform === "win32"
    ? [
        process.env.BASH_PATH,
        "C:\\Program Files\\Git\\bin\\bash.exe",
        "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
        "bash",
      ].filter(Boolean)
    : ["bash"];

for (const bashCmd of candidates) {
  const result = spawnSync(bashCmd, [scriptPath], { stdio: "inherit" });

  if (result.error && result.error.code === "ENOENT") {
    continue;
  }

  process.exit(result.status ?? 1);
}

console.error(
  "Unable to find a usable bash runtime. On Windows, install Git for Windows or set BASH_PATH."
);
process.exit(1);
