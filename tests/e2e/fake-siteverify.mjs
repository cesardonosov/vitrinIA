// Stand-in for Cloudflare's siteverify endpoint, for E2E only (the sandbox and CI have no
// route to Cloudflare). Accepts the dummy token the stubbed widget produces and nothing else,
// like Cloudflare's own test keys. Started by playwright.config.ts.
import { createServer } from "node:http";

const port = Number(process.env.FAKE_SITEVERIFY_PORT ?? 8788);
createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    const params = new URLSearchParams(body);
    const ok =
      req.method === "POST" &&
      params.get("secret")?.startsWith("1x") &&
      params.get("response") === "XXXX.DUMMY.TOKEN.XXXX";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: ok }));
  });
}).listen(port, "127.0.0.1");
