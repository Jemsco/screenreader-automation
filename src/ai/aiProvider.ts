// HTTP statuses worth retrying — transient rate-limit / server errors.
const RETRYABLE_STATUS = [429, 500, 502, 503, 504];

/**
 * Decides whether a failed request should be retried. Returns true after
 * sleeping the backoff delay (caller should `continue`); returns false when the
 * status is terminal or attempts are exhausted (caller should throw with the
 * response detail). Shared by both providers so their retry behavior matches.
 */
async function shouldRetry(
  label: string,
  status: number,
  attempt: number,
  maxRetries: number,
): Promise<boolean> {
  if (!RETRYABLE_STATUS.includes(status) || attempt === maxRetries) {
    return false;
  }

  const delay = attempt * 2000;
  console.log(
    `${label} temporarily unavailable (${status}). ` +
      `Retrying in ${delay / 1000}s... (attempt ${attempt} of ${maxRetries})`,
  );
  await new Promise((r) => setTimeout(r, delay));
  return true;
}

// ---------------------------------------------------------------------------
// Gemini provider — returns the markdown report text, throwing on failure.
// Same error contract as the Claude path: callers get either a usable result
// or an exception, never a non-ok Response to re-check.
// ---------------------------------------------------------------------------

export async function analyzeWithGemini(
  prompt: string,
  maxRetries = 3,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // The shared prompt asks for a markdown document, so we let Gemini
        // return markdown text directly (no responseMimeType: application/json).
        // The caller writes that text to the report file verbatim, matching
        // the Claude path.
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      if (await shouldRetry("Gemini", response.status, attempt, maxRetries)) {
        continue;
      }
      const errorText = await response.text();
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}\n${errorText}`,
      );
    } // Gemini wraps its output in a JSON envelope; the `text` part is the
    // markdown document the prompt asked for.

    const rawPayload = await response.json();
    const markdownReport =
      rawPayload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!markdownReport) {
      throw new Error("Failed to extract content from Gemini response.");
    }
    return markdownReport;
  } // Unreachable in practice — the loop returns or throws on every path — but
  // satisfies the compiler and guards against a future edit dropping a case.

  throw new Error("Gemini request failed after all retry attempts.");
}

// ---------------------------------------------------------------------------
// Claude provider — streams response chunks directly to a writable sink
// so the caller can pipe them to stdout in real time.
//
// Uses the Anthropic Messages API with stream: true.
// SSE events arrive as:
//   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
// We extract the text delta from each event and pass it to onChunk.
// ---------------------------------------------------------------------------

export async function analyzeWithClaude(
  prompt: string,
  onChunk: (text: string) => void,
  maxRetries = 3,
): Promise<void> {
  const key = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is missing.");
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
  const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? "claude-sonnet-5";
  const url = `${baseUrl}/v1/messages`;

  console.log(`Calling Claude at: ${baseUrl}`);
  console.log(`Model: ${model}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model, // The audit describes every element on the page; 4096 truncates the
        // report after the first element. This path streams, so a large cap
        // doesn't risk an HTTP timeout.
        max_tokens: 64000,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (await shouldRetry("Claude", response.status, attempt, maxRetries)) {
        continue;
      }
      const errorText = await response.text();
      throw new Error(
        `Claude API error: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error("Claude response has no body.");
    } // Read the SSE stream and call onChunk for each text delta

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }); // SSE events are separated by double newlines

      const events = buffer.split("\n\n"); // Keep the last incomplete chunk in the buffer
      buffer = events.pop() ?? "";

      for (const event of events) {
        // Each event may have multiple lines; find the data line
        const dataLine = event
          .split("\n")
          .find((line) => line.startsWith("data: "));

        if (!dataLine) continue;

        const jsonStr = dataLine.slice("data: ".length).trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonStr);
          if (
            parsed.type === "content_block_delta" &&
            parsed.delta?.type === "text_delta"
          ) {
            onChunk(parsed.delta.text);
          }
        } catch {
          // Malformed SSE chunk — skip silently
        }
      }
    }

    return; // Success — don't retry
  }
}
