import { describe, expect, it } from "vitest";
import { cleanLine, cleanNote } from "./text";

describe("cleanLine", () => {
  it("turns line breaks into spaces so a field stays on one line (O21)", () => {
    expect(cleanLine("Ana\nTotal: $0")).toBe("Ana Total: $0");
    expect(cleanLine("Ana\r\nPagado")).toBe("Ana Pagado");
    expect(cleanLine("a b c\u0085d")).toBe("a b c d");
  });

  it("removes bidirectional and zero-width marks", () => {
    expect(cleanLine("Ana‮soJ​")).toBe("AnasoJ");
    expect(cleanLine("⁦x⁩")).toBe("x");
  });

  it("normalises to NFC and collapses spaces", () => {
    expect(cleanLine("José   Perez ")).toBe("José Perez");
  });
});

describe("cleanNote", () => {
  it("keeps line breaks but caps blank runs and normalises CRLF", () => {
    expect(cleanNote("uno\r\ndos\n\n\n\ntres")).toBe("uno\ndos\n\ntres");
  });

  it("drops control and format characters other than the line break", () => {
    expect(cleanNote("a\u0000b‮c​d\te")).toBe("abcde");
  });

  it("trims and collapses spaces around breaks", () => {
    expect(cleanNote("  hola   mundo \n  chao  ")).toBe("hola mundo\nchao");
  });
});
