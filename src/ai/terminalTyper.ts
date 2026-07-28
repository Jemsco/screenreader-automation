// export async function typeText(
//   text: string,
//   options: {
//     initialDelay?: number;
//     finalDelay?: number;
//     acceleration?: number;
//   } = {},
// ): Promise<void> {
//   const { initialDelay = 80, finalDelay = 5, acceleration = 0.98 } = options;

//   let delay = initialDelay;

//   for (const char of text) {
//     process.stdout.write(char);

//     await new Promise((resolve) => setTimeout(resolve, delay));

//     delay = Math.max(finalDelay, delay * acceleration);
//   }

//   process.stdout.write("\n");
// }

export async function typeText(
  text: string,
  initialDelay = 80,
  finalDelay = 3,
): Promise<void> {
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text.charAt(i));

    const progress = i / text.length;

    // Gradually speed up as the prompt is typed
    const delay = initialDelay - (initialDelay - finalDelay) * progress;

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  process.stdout.write("\n");
}
