export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  ontimeout: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => resolve(ontimeout), timeoutMs),
    ),
  ]);
}
