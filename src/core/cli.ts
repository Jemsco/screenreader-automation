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

export function parseCliArgs(args: string[]): CliOptions {
  const mode: Mode = args.includes("--mode=all") ? "all" : "actionable";

  const urlArg = args.find((arg) => arg.startsWith("--url="));
  const url = urlArg ? urlArg.slice("--url=".length) : null;

  const pause = args.includes("--pause");

  const waitForArg = args.find((arg) => arg.startsWith("--wait-for="));
  const waitForSelector = waitForArg
    ? waitForArg.slice("--wait-for=".length)
    : null;

  const elementArg = args.find((arg) => arg.startsWith("--element="));

  const elementSelector = elementArg?.substring("--element=".length) ?? null;

  const snapshotArg = args.find((a) => a.startsWith("--snapshot="));
  const snapshotPath = snapshotArg
    ? snapshotArg.split("=").slice(1).join("=")
    : null;

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
