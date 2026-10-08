import { describe, expect, it } from "vitest";
import { ROPA_PRESET } from "../../domain/presets/ropa";
import {
  MAX_SECTIONS_PER_PAGE,
  PRODUCT_GRID_MAX_LIMIT,
  type StoreConfigV1,
} from "../../domain/store-config";
import { TEXT_LIMITS } from "../../domain/text";
import { storeConfigV1Schema } from "./store-config-v1.schema";
import { zodStoreConfigValidator } from "./zod-store-config-validator";

/** Deep clone + mutate helper so each test starts from the valid preset. */
function withPatch(patch: (draft: Record<string, unknown>) => void): unknown {
  const draft = JSON.parse(JSON.stringify(ROPA_PRESET)) as Record<
    string,
    unknown
  >;
  patch(draft);
  return draft;
}

function issuesOf(
  input: unknown,
): ReadonlyArray<{ path: string; message: string }> {
  const result = zodStoreConfigValidator.validate(input);
  if (result.ok) throw new Error("expected validation to fail");
  return result.error.issues;
}

function pathsOf(input: unknown): string[] {
  return issuesOf(input).map((issue) => issue.path);
}

describe("StoreConfigV1 schema: valid input (AC1)", () => {
  it("parses the ropa preset into a typed object equal to the input", () => {
    const result = zodStoreConfigValidator.validate(
      JSON.parse(JSON.stringify(ROPA_PRESET)),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const typed: StoreConfigV1 = result.value;
      expect(typed).toEqual(ROPA_PRESET);
      expect(typed.pages.home.sections[0]?.type).toBe("hero");
    }
  });

  it("accepts a minimal config without optional fields", () => {
    const result = storeConfigV1Schema.safeParse({
      schemaVersion: 1,
      identity: { name: "Mínima" },
      theme: {
        colors: { primary: "#1d4ed8", background: "#ffffff", text: "#111827" },
        font: "system-serif",
        radius: "none",
      },
      contact: { whatsapp: "+56912345678" },
      pages: { home: { sections: [] } },
      features: ROPA_PRESET.features,
    });
    expect(result.success).toBe(true);
  });
});

describe("StoreConfigV1 schema: strict objects (AC2)", () => {
  it.each([
    ["root", (d: Record<string, unknown>) => (d.extra = 1), ""],
    [
      "identity",
      (d: Record<string, unknown>) =>
        ((d.identity as Record<string, unknown>).html = "<b>"),
      "identity",
    ],
    [
      "theme",
      (d: Record<string, unknown>) =>
        ((d.theme as Record<string, unknown>).css = "body{}"),
      "theme",
    ],
    [
      "theme.colors",
      (d: Record<string, unknown>) =>
        ((
          (d.theme as Record<string, unknown>).colors as Record<string, unknown>
        ).danger = "#ff0000"),
      "theme.colors",
    ],
    [
      "contact",
      (d: Record<string, unknown>) =>
        ((d.contact as Record<string, unknown>).email = "a@b.cl"),
      "contact",
    ],
    [
      "pages",
      (d: Record<string, unknown>) =>
        ((d.pages as Record<string, unknown>).about = { sections: [] }),
      "pages",
    ],
    [
      "section props",
      (d: Record<string, unknown>) => {
        const sections = (
          d.pages as {
            home: { sections: Array<{ props: Record<string, unknown> }> };
          }
        ).home.sections;
        if (sections[0]) sections[0].props.style = "color:red";
      },
      "pages.home.sections.0.props",
    ],
    [
      "features",
      (d: Record<string, unknown>) =>
        ((d.features as Record<string, unknown>).bypassRls = true),
      "features",
    ],
  ])("rejects an unknown key in %s", (_label, mutate, path) => {
    const paths = pathsOf(withPatch(mutate));
    expect(
      paths.some((p) => p === path || p.startsWith(`${path}.`) || path === ""),
    ).toBe(true);
  });
});

describe("StoreConfigV1 schema: issues never echo attacker-controlled keys", () => {
  const MARKER = "__vit_marker_7f3a9c__";

  it.each([
    ["root", (d: Record<string, unknown>) => (d[MARKER] = 1)],
    [
      "identity",
      (d: Record<string, unknown>) =>
        ((d.identity as Record<string, unknown>)[MARKER] = "x"),
    ],
    [
      "section props",
      (d: Record<string, unknown>) => {
        const sections = (
          d.pages as {
            home: { sections: Array<{ props: Record<string, unknown> }> };
          }
        ).home.sections;
        if (sections[0]) sections[0].props[MARKER] = true;
      },
    ],
    [
      "features",
      (d: Record<string, unknown>) =>
        ((d.features as Record<string, unknown>)[MARKER] = false),
    ],
  ])("unknown key in %s: not in any message or path", (_label, mutate) => {
    const issues = issuesOf(withPatch(mutate));
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue.message).not.toContain(MARKER);
      expect(issue.path).not.toContain(MARKER);
    }
    expect(JSON.stringify(issues)).not.toContain(MARKER);
  });
});

describe("StoreConfigV1 schema: colours and urls (AC3)", () => {
  it.each(["red", "#fff", "#ffffff;", "rgb(0,0,0)", "#ffffff00"])(
    "rejects colour %s with a typed error at theme.colors.primary",
    (color) => {
      const paths = pathsOf(
        withPatch((d) => {
          (
            (d.theme as Record<string, unknown>).colors as Record<
              string,
              unknown
            >
          ).primary = color;
        }),
      );
      expect(paths).toContain("theme.colors.primary");
    },
  );

  it("rejects text/background pairs below AA contrast", () => {
    const paths = pathsOf(
      withPatch((d) => {
        (
          (d.theme as Record<string, unknown>).colors as Record<string, unknown>
        ).text = "#fffaf5";
      }),
    );
    expect(paths).toContain("theme.colors.text");
  });

  it("rejects fonts and radii outside the closed lists", () => {
    expect(
      pathsOf(
        withPatch(
          (d) => ((d.theme as Record<string, unknown>).font = "Comic Sans"),
        ),
      ),
    ).toContain("theme.font");
    expect(
      pathsOf(
        withPatch((d) => ((d.theme as Record<string, unknown>).radius = "xl")),
      ),
    ).toContain("theme.radius");
  });

  it.each([
    "http://www.mercadopago.cl/x",
    "javascript:alert(1)",
    "https://user:pw@www.mercadopago.cl/x",
    "https://www.mercadopago.cl:8443/x",
    "https://127.0.0.1/x",
    "https://xn--mercadopago-xyz.cl/x",
    "https://evil.cl/x",
    "HTTPS://WWW.mercadopago.cl/x",
    "https://www.mercadopago.cl:443/x",
    "https://www.mercadopago.cl/x'><script>",
    // Pending E1: even a plausible provider is rejected until hosts are listed.
    "https://www.mercadopago.cl/checkout/abc",
  ])("rejects paymentLink %s (no host is allowed until E1)", (url) => {
    const issues = issuesOf(
      withPatch(
        (d) => ((d.contact as Record<string, unknown>).paymentLink = url),
      ),
    );
    const issue = issues.find((i) => i.path === "contact.paymentLink");
    expect(issue).toBeDefined();
    expect(issue?.message).not.toContain(url);
  });

  it("accepts a config without paymentLink (the field is optional)", () => {
    const result = zodStoreConfigValidator.validate(
      withPatch((d) => {
        (d.contact as Record<string, unknown>).paymentLink = undefined;
      }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("StoreConfigV1 schema: texts are plain text (AC4)", () => {
  it("keeps <script> as characters, not as HTML", () => {
    const result = zodStoreConfigValidator.validate(
      withPatch((d) => {
        (d.identity as Record<string, unknown>).name =
          '<script>alert("x")</script>';
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.identity.name).toBe('<script>alert("x")</script>');
  });

  it("has no html, css, style, className or markdown field anywhere", () => {
    const json = JSON.stringify(storeConfigV1Schema.def);
    const keys = new Set<string>();
    JSON.parse(json, (key, value) => {
      if (key === "shape" && value && typeof value === "object") {
        for (const k of Object.keys(value)) keys.add(k.toLowerCase());
      }
      return value;
    });
    for (const forbidden of [
      "html",
      "css",
      "style",
      "classname",
      "markdown",
      "script",
    ]) {
      expect(keys.has(forbidden), forbidden).toBe(false);
    }
  });

  it("rejects control characters and blank strings, with the field path", () => {
    expect(
      pathsOf(
        withPatch(
          (d) => ((d.identity as Record<string, unknown>).name = "a\u0000b"),
        ),
      ),
    ).toContain("identity.name");
    expect(
      pathsOf(
        withPatch(
          (d) => ((d.identity as Record<string, unknown>).name = "   "),
        ),
      ),
    ).toContain("identity.name");
  });

  it.each([
    ["NEL", "Ropa\u0085Linda"],
    ["RLO", "Ropa ‮adniL"],
    ["ZWSP", "Ropa​Linda"],
    ["BOM", "﻿Ropa Linda"],
    ["line separator", "Ropa Linda"],
    ["lone surrogate", "Ropa\ud800Linda"],
    ["only ZWSP", "​​"],
  ])("rejects invisible or malformed text (%s) at identity.name", (_l, v) => {
    expect(
      pathsOf(
        withPatch((d) => ((d.identity as Record<string, unknown>).name = v)),
      ),
    ).toContain("identity.name");
  });

  it("enforces the length limit per field", () => {
    expect(
      pathsOf(
        withPatch(
          (d) =>
            ((d.identity as Record<string, unknown>).name = "a".repeat(
              TEXT_LIMITS.storeName + 1,
            )),
        ),
      ),
    ).toContain("identity.name");
  });

  it("images are ids, never urls", () => {
    const paths = pathsOf(
      withPatch((d) => {
        (d.identity as Record<string, unknown>).logoImageId =
          "https://evil.cl/a.png";
      }),
    );
    expect(paths).toContain("identity.logoImageId");
    const ok = zodStoreConfigValidator.validate(
      withPatch((d) => {
        (d.identity as Record<string, unknown>).logoImageId =
          "01926f5a-9f3c-7b1e-8a2d-3c4e5f607182";
      }),
    );
    expect(ok.ok).toBe(true);
  });
});

describe("StoreConfigV1 schema: phone (AC6)", () => {
  it.each(["912345678", "+56221234567", "+54911234567", "+56 9 1234 5678", ""])(
    "rejects %s with the path contact.whatsapp",
    (phone) => {
      const issues = issuesOf(
        withPatch(
          (d) => ((d.contact as Record<string, unknown>).whatsapp = phone),
        ),
      );
      expect(issues.map((i) => i.path)).toContain("contact.whatsapp");
    },
  );
});

describe("StoreConfigV1 schema: sections and features", () => {
  it("rejects unknown section types", () => {
    const paths = pathsOf(
      withPatch((d) => {
        (d.pages as { home: { sections: unknown[] } }).home.sections = [
          { type: "iframe", props: { src: "https://evil.cl" } },
        ];
      }),
    );
    expect(paths.some((p) => p.startsWith("pages.home.sections.0"))).toBe(true);
  });

  it("limits sections per page and product-grid size", () => {
    const tooMany = Array.from({ length: MAX_SECTIONS_PER_PAGE + 1 }, () => ({
      type: "text",
      props: { body: "x" },
    }));
    expect(
      pathsOf(
        withPatch((d) => {
          (d.pages as { home: { sections: unknown[] } }).home.sections =
            tooMany;
        }),
      ),
    ).toContain("pages.home.sections");
    expect(
      pathsOf(
        withPatch((d) => {
          (d.pages as { home: { sections: unknown[] } }).home.sections = [
            {
              type: "product-grid",
              props: { source: "all", limit: PRODUCT_GRID_MAX_LIMIT + 1 },
            },
          ];
        }),
      ),
    ).toContain("pages.home.sections.0.props.limit");
  });

  it("requires every feature flag to be a boolean (no strings, no missing)", () => {
    expect(
      pathsOf(
        withPatch(
          (d) => ((d.features as Record<string, unknown>).search = "yes"),
        ),
      ),
    ).toContain("features.search");
    expect(
      pathsOf(
        withPatch((d) => {
          delete (d.features as Record<string, unknown>).search;
        }),
      ),
    ).toContain("features.search");
  });

  it("rejects a schemaVersion other than the current one", () => {
    expect(pathsOf(withPatch((d) => (d.schemaVersion = 2)))).toContain(
      "schemaVersion",
    );
    expect(pathsOf(withPatch((d) => (d.schemaVersion = "1")))).toContain(
      "schemaVersion",
    );
  });

  it("rejects non-objects", () => {
    expect(zodStoreConfigValidator.validate(null).ok).toBe(false);
    expect(zodStoreConfigValidator.validate("{}").ok).toBe(false);
  });
});
