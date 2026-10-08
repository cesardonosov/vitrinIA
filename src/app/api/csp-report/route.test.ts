import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/csp-report", () => {
  it("delegates to the wired handler", async () => {
    const res = await POST(
      new Request("http://localhost/api/csp-report", {
        method: "POST",
        body: "{",
      }),
    );
    expect(res.status).toBe(400);
  });
});
