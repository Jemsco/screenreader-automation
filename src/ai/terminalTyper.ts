export async function typeText(
  text: string,
  initialDelay = 80,
  finalDelay = 3,
): Promise<void> {
  const trimmed = text.trimEnd();
  const lines = trimmed.split("\n");

  // Pull off the last two lines separately
  const lastLine = lines.pop() ?? "";
  const secondToLastLine = lines.pop() ?? "";
  const mainText = lines.join("\n") + "\n";

  // Type the main body with gradual acceleration
  for (let i = 0; i < mainText.length; i++) {
    process.stdout.write(mainText.charAt(i));
    const progress = i / mainText.length;
    const delay = initialDelay - (initialDelay - finalDelay) * progress;
    await new Promise((r) => setTimeout(r, delay));
  }

  // Pause before second to last line
  await new Promise((r) => setTimeout(r, 1500));

  // Type second to last line at medium speed
  for (const char of secondToLastLine) {
    process.stdout.write(char);
    await new Promise((r) => setTimeout(r, 60));
  }
  process.stdout.write("\n");

  // Longer pause before the last line — the setup
  await new Promise((r) => setTimeout(r, 1500));

  // Type last line slowly — the payoff
  for (const char of lastLine) {
    process.stdout.write(char);
    await new Promise((r) => setTimeout(r, 100));
  }
  await new Promise((r) => setTimeout(r, 1500));
  process.stdout.write("\n");
}
