import { buildAccessibilityPrompt } from "./promptBuilder.js";
const key = process.env.GEMINI_API_KEY;
// export async function analyzeWithGemini(json: unknown) {
//   const prompt = buildAccessibilityPrompt(json);
//   const response = await fetch(
//     "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent&key=" +
//       key,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         contents: [
//           {
//             parts: [{ text: prompt }],
//           },
//         ],
//         // Optional: forces Gemini to respond back in valid JSON structure
//         generationConfig: {
//           responseMimeType: "application/json",
//         },
//       },
//       body: JSON.stringify({
//         // Gemini-specific request format
//       }),
//     },
//   );
//   return response;
// }
// code from Gemini
import fs from "node:fs";
const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
// Read your local JSON file
const jsonFileContent = fs.readFileSync("../current.json", "utf8");
const prompt = buildAccessibilityPrompt(jsonFileContent);
async function analyzeAccessibility() {
    const response = await fetch(URL, {
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
            // Optional: forces Gemini to respond back in valid JSON structure
            generationConfig: {
                responseMimeType: "application/json",
            },
        }),
    });
    const data = await response.json();
    // Extract the generated text response
    const resultText = data.candidates[0].content.parts[0].text;
    console.log(resultText);
}
analyzeAccessibility();
