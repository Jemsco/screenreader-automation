export type Mode = "all" | "actionable";

export interface CliOptions {
  mode: Mode;
  url: string | null;
  pause: boolean;
  waitForSelector: string | null;
  elementSelector: string | null;
  snapshotPath: string | null;
  comparePaths: [string, string] | null;
}

function flagValue(args: string[], name: string): string | null {
  const prefix = `${name}=`;
  const arg = args.find((arg) => arg.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

export function parseCliArgs(args: string[]): CliOptions {
  console.log("Parsing CLI args", args);
  const mode: Mode = args.includes("--mode=all") ? "all" : "actionable";

  const url = flagValue(args, "--url");

  const pause = args.includes("--pause");
  const waitForSelector = flagValue(args, "--wait-for");
  const elementSelector = flagValue(args, "--element");
  const snapshotPath = flagValue(args, "--snapshot");
  const compareIdx = args.indexOf("--compare");
  let comparePaths: [string, string] | null = null;

  if (compareIdx !== -1) {
    const compareArg = args[compareIdx];
    if (compareArg?.includes("=")) {
      const compareValue = compareArg.split("=").slice(1).join("=");
      if (compareValue.includes(",")) {
        const parts = compareValue.split(",");
        if (parts[0] && parts[1]) {
          comparePaths = [parts[0], parts[1]];
        }
      } else {
        const nextArg = args[compareIdx + 1];
        if (nextArg && !nextArg.startsWith("--")) {
          comparePaths = [compareValue, nextArg];
        }
      }
    } else if (compareArg) {
      const fileA = args[compareIdx + 1];
      const fileB = args[compareIdx + 2];
      if (
        fileA &&
        fileB &&
        !fileA.startsWith("--") &&
        !fileB.startsWith("--")
      ) {
        comparePaths = [fileA, fileB];
      }
    }
  }

  return {
    mode,
    url,
    pause,
    waitForSelector,
    elementSelector,
    snapshotPath,
    comparePaths,
  };
}
