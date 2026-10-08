import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURES } from "../store-config";
import { migrateV0ToV1 } from "./v0-to-v1";

describe("migrateV0ToV1", () => {
  it("maps the flat v0 shape into v1 groups with defaults", () => {
    const v1 = migrateV0ToV1({
      schemaVersion: 0,
      name: "Ropa Linda",
      whatsapp: "+56912345678",
    });
    expect(v1).toEqual({
      schemaVersion: 1,
      identity: { name: "Ropa Linda" },
      theme: {
        colors: { primary: "#1d4ed8", background: "#ffffff", text: "#111827" },
        font: "system-sans",
        radius: "md",
      },
      contact: { whatsapp: "+56912345678" },
      pages: { home: { sections: [] } },
      features: DEFAULT_FEATURES,
    });
  });

  it("keeps tagline, primaryColor, sections and known feature flags", () => {
    const sections = [{ type: "hero", props: { title: "Hola" } }];
    const v1 = migrateV0ToV1({
      schemaVersion: 0,
      name: "Café",
      tagline: "Granos",
      whatsapp: "+56987654321",
      primaryColor: "#7c2d12",
      sections,
      features: { showStock: true, search: false, unknownFlag: true },
    });
    expect(v1.identity).toEqual({ name: "Café", tagline: "Granos" });
    expect((v1.theme as { colors: { primary: string } }).colors.primary).toBe(
      "#7c2d12",
    );
    expect(v1.pages).toEqual({ home: { sections } });
    expect(v1.features).toEqual({
      ...DEFAULT_FEATURES,
      showStock: true,
      search: false,
    });
  });

  it("drops the v0 paymentLink (the allowlist decides in v1)", () => {
    const v1 = migrateV0ToV1({
      schemaVersion: 0,
      name: "x",
      whatsapp: "+56912345678",
      paymentLink: "https://mpago.la/abc",
    });
    expect(v1.contact).toEqual({ whatsapp: "+56912345678" });
  });

  it("is total: garbage in produces a v1-shaped object for the validator to reject", () => {
    const v1 = migrateV0ToV1({
      schemaVersion: 0,
      name: 42,
      whatsapp: null,
      sections: "not-an-array",
      features: "nope",
    });
    expect(v1.schemaVersion).toBe(1);
    expect(v1.identity).toEqual({ name: "" });
    expect(v1.contact).toEqual({ whatsapp: "" });
    expect(v1.pages).toEqual({ home: { sections: [] } });
    expect(v1.features).toEqual(DEFAULT_FEATURES);
  });
});
