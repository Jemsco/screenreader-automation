import { runScreenReader } from "../core/runScreenReader.js";
import { execSync } from "node:child_process";

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ?? err.message;
  }
  try {
    return JSON.stringify(err, Object.getOwnPropertyNames(err));
  } catch {
    return String(err);
  }
}

/**
 * Force-kill any lingering NVDA process. NVDA runs as a separate OS process
 * that can outlive a crashed script and hold the automation channel, breaking
 * later runs. Ignores failure — `taskkill` throws when NVDA isn't running,
 * and cleanup in a crash handler must not throw.
 */
function killNvda(): void {
  try {
    execSync("taskkill /f /im nvda.exe /t", { stdio: "ignore" });
  } catch {
    // NVDA wasn't running (or already exited) — nothing to clean up.
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", formatError(reason));
});

process.on("uncaughtException", (error) => {
  console.error("uncaughtException:", formatError(error));
  killNvda();
  process.exit(1);
});

const url = "http://127.0.0.1:5500/src/pages/test-page.html";

async function main() {
  await runScreenReader({
    kind: "nvda",
    url,
    argv: process.argv,
  });
}

await main().catch((error) => {
  console.error("Fatal error:", formatError(error));
  killNvda();
  process.exit(1);
});
