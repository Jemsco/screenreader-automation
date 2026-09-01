const start = performance.now();

export function log(message: string): void {
  const now = performance.now();
  const elapsed = now - start;
  console.log(`[${elapsed.toFixed(2)}ms] ${message}`);
}
