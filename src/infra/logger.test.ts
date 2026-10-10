import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, REDACTED, scrub } from "./logger";

function capture(level = "trace") {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, done) {
      lines.push(String(chunk));
      done();
    },
  });
  // pino writes synchronously to a plain stream with a write() method.
  const log = createLogger({ level, destination: destination as never });
  return { log, output: () => lines.join("") };
}

/** The contract from VIT-126: no log line ever carries `@` or `+569`. */
function expectNoPersonalData(output: string) {
  expect(output).not.toContain("@");
  expect(output).not.toContain("+569");
}

const EMAIL = "comprador@example.cl";
const PHONE = "+56912345678";

describe("logger", () => {
  it("writes JSON lines with level, time, service and fields", () => {
    const { log, output } = capture();
    log.info(
      { event: "order.created", store_id: "s1", request_id: "r1" },
      "ok",
    );
    const line = JSON.parse(output());
    expect(line).toMatchObject({
      level: "info",
      service: "vitrinia",
      event: "order.created",
      store_id: "s1",
      request_id: "r1",
      msg: "ok",
    });
    expect(typeof line.time).toBe("string");
  });

  it("redacts sensitive keys at the top level and one level deep", () => {
    const { log, output } = capture();
    log.info({
      req: { headers: { authorization: "Bearer abc", cookie: "sid=9" } },
      email: EMAIL,
      authorization: "Bearer abc",
      buyer: { phone: PHONE, address: "Calle 1", rut: "11.111.111-1" },
      headers: { cookie: "sid=1", "set-cookie": "sid=2" },
    });
    const line = JSON.parse(output());
    expect(line.req.headers).toEqual({
      authorization: REDACTED,
      cookie: REDACTED,
    });
    expect(line.email).toBe(REDACTED);
    expect(line.authorization).toBe(REDACTED);
    expect(line.buyer).toEqual({
      phone: REDACTED,
      address: REDACTED,
      rut: REDACTED,
    });
    expect(line.headers).toEqual({ cookie: REDACTED, "set-cookie": REDACTED });
    expectNoPersonalData(output());
  });

  it("scrubs emails and phones under keys nobody foresaw", () => {
    const { log, output } = capture();
    log.warn({
      note: `escribir a ${EMAIL} o ${PHONE}`,
      deep: { a: { b: [EMAIL] } },
    });
    expectNoPersonalData(output());
  });

  it("scrubs the message and interpolation arguments", () => {
    const { log, output } = capture();
    log.error(`pedido de ${EMAIL}`);
    log.error("contacto %s", PHONE);
    expectNoPersonalData(output());
  });

  it("scrubs error messages and leaves the stack out", () => {
    const { log, output } = capture();
    const error = Object.assign(new Error(`duplicate key (email)=(${EMAIL})`), {
      code: "23505",
    });
    log.error({ err: error }, "insert failed");
    const line = JSON.parse(output());
    expect(line.err).toEqual({
      type: "Error",
      code: "23505",
      message: "duplicate key (email)=([email])",
    });
    expectNoPersonalData(output());
  });

  it("drops lines below the configured level", () => {
    const { log, output } = capture("warn");
    log.info({ event: "x" });
    expect(output()).toBe("");
  });

  it("falls back to info for an unknown level", () => {
    const { log, output } = capture("loud");
    log.debug({ event: "x" });
    log.info({ event: "y" });
    expect(output()).toContain('"event":"y"');
    expect(output()).not.toContain('"event":"x"');
  });
});

describe("scrub", () => {
  it.each([
    ["+56 9 1234 5678"],
    ["+56912345678"],
    ["56912345678"],
    ["912345678"],
    ["9 1234 5678"],
  ])("replaces the Chilean mobile %s", (phone) => {
    expect(scrub(`tel ${phone} fin`)).toBe("tel [phone] fin");
  });

  it("hides database URLs and secret query parameters", () => {
    expect(
      scrub("connect postgres://app_user:hunter2@db:5432/vitrinia failed"),
    ).toBe(`connect ${REDACTED} failed`);
    expect(scrub("GET /auth/callback?code=abc123&next=/panel")).toBe(
      `GET /auth/callback?code=${REDACTED}&next=/panel`,
    );
    expect(scrub("link https://x.cl/m?token=zzz")).toBe(
      `link https://x.cl/m?token=${REDACTED}`,
    );
  });

  it("leaves ids, counts and timestamps alone", () => {
    const text =
      "store 0199d0a0-0000-7000-8000-00000000c0de took 912 ms at 2026-10-10T18:00:00Z, ts 1760119123456";
    expect(scrub(text)).toBe(text);
  });
});
