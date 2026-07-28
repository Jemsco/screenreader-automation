export async function analyzeWithGemini(
  prompt: string,
  maxRetries = 3,
): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (response.ok) {
      return response;
    }

    const retryableStatuses = [429, 500, 502, 503, 504];

    if (
      !retryableStatuses.includes(response.status) ||
      attempt === maxRetries
    ) {
      return response;
    }

    const delay = attempt * 2000;

    console.log(
      `AI service temporarily unavailable (${response.status}). ` +
        `Retrying in ${delay / 1000} seconds... ` +
        `(attempt ${attempt} of ${maxRetries})`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("AI request failed after all retry attempts.");
}

// // code from Gemini
// import fs from "node:fs";

// const API_KEY = process.env.GEMINI_API_KEY;
// const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// // Read your local JSON file
// const jsonFileContent = fs.readFileSync("../current.json", "utf8");
// const prompt = buildAccessibilityPrompt(jsonFileContent);
// async function analyzeAccessibility() {
//   const response = await fetch(URL, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       contents: [
//         {
//           parts: [{ text: prompt }],
//         },
//       ],
//       // Optional: forces Gemini to respond back in valid JSON structure
//       generationConfig: {
//         responseMimeType: "application/json",
//       },
//     }),
//   });

//   const data = await response.json();

//   // Extract the generated text response
//   const resultText = data.candidates[0].content.parts[0].text;
//   console.log(resultText);
// }

// analyzeAccessibility();
