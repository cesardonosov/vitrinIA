import { describe, expect, it } from "vitest";
import { isPortalHost, normalizeHost } from "./host";

describe("normalizeHost", () => {
  it.each([
    ["kanuwin.localhost:3000", "kanuwin.localhost"],
    ["Kanuwin.VitrinIA.cl", "kanuwin.vitrinia.cl"],
    ["kanuwin.vitrinia.cl.", "kanuwin.vitrinia.cl"],
    [" localhost ", "localhost"],
  ])("%s -> %s", (raw, host) => {
    expect(normalizeHost(raw)).toBe(host);
  });

  it.each([
    null,
    undefined,
    "",
    ":3000",
    "kanuwiñ.vitrinia.cl",
    "Kanuwin.cl", // Kelvin sign lowercases to "k"
    "a..b",
    "-a.cl",
    "a_b.cl",
    "x".repeat(261),
    `${"a".repeat(64)}.cl`,
    "*.vitrinia.cl",
    "evil.cl/path",
  ])("rejects %j", (raw) => {
    expect(normalizeHost(raw)).toBeUndefined();
  });
});

describe("isPortalHost", () => {
  it("knows the portal hosts and nothing else", () => {
    expect(isPortalHost("localhost")).toBe(true);
    expect(isPortalHost("app.vitrinia.cl")).toBe(true);
    expect(isPortalHost("kanuwin.localhost")).toBe(false);
    expect(isPortalHost("kanuwin.vitrinia.cl")).toBe(false);
  });
});
