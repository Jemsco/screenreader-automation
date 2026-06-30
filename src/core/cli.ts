export type Mode = "all" | "actionable";

export interface CliOptions {
  mode: Mode;
  elementSelector: string | null;
  snapshotPath: string | null;
  comparePaths: [string, string] | null;
}

export function parseCliArgs(args: string[]): CliOptions {
  const mode: Mode = args.includes("--mode=all") ? "all" : "actionable";

  const elementArg = args.find((a) => a.startsWith("--element="));
  const elementSelector = elementArg
    ? elementArg.split("=").slice(1).join("=")
    : null;

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
    elementSelector,
    snapshotPath,
    comparePaths,
  };
}
