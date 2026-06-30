import { runScreenReader } from "../core/runScreenReader.js";

const url = "http://127.0.0.1:5500/src/pages/test-page.html";

(async () => {
  await runScreenReader({
    kind: "voiceover",
    url,
    argv: process.argv,
  });
})();
