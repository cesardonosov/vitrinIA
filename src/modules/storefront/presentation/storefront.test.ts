import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KANUWIN_CATALOG } from "@/modules/catalog/infrastructure/seed/kanuwin";
import {
  AVES_PRESET,
  SECTION_TYPES,
  type StoreConfig,
} from "@/modules/store-config/application";
import { ProductDetail } from "./components/product-detail";
import {
  SECTION_RENDERERS,
  StorefrontHome,
  storeWhatsAppDigits,
} from "./components/storefront-home";
import { formatMoney, paragraphs, productHref, whatsappHref } from "./format";
import { storeThemeStyle } from "./theme";

const kanuwin: StoreConfig = {
  ...AVES_PRESET,
  identity: { name: "Kanuwiñ" },
  contact: { whatsapp: "+56912345678" },
};

function render(config: StoreConfig = kanuwin): string {
  return renderToStaticMarkup(
    createElement(StorefrontHome, { config, catalog: KANUWIN_CATALOG }),
  );
}

describe("section registry", () => {
  it("covers exactly the Store Config section types", () => {
    expect(Object.keys(SECTION_RENDERERS).sort()).toEqual(
      [...SECTION_TYPES].sort(),
    );
  });
});

describe("StorefrontHome", () => {
  it("renders the store name, every section and the products with prices", () => {
    const html = render();
    expect(html).toContain("Kanuwiñ");
    expect(html).toContain("Mezclas de semillas formuladas por veterinarios");
    expect(html).toContain("Mezcla Loros Grandes");
    expect(html).toContain("$15.500");
    expect(html).toContain("Desde ");
    expect(html).toContain('href="/p/mezcla-pequenas-psitacidas"');
    expect(html).toContain("https://wa.me/56912345678?text=");
  });

  it("hides prices when the store turns them off", () => {
    const html = render({
      ...kanuwin,
      features: { ...kanuwin.features, showPrices: false },
    });
    expect(html).not.toContain("$8.900");
  });

  it("never links to the placeholder WhatsApp number", () => {
    const html = render(AVES_PRESET);
    expect(html).not.toContain("wa.me");
    expect(html).toContain('aria-disabled="true"');
  });

  it("escapes seller text instead of interpreting it", () => {
    const html = render({
      ...kanuwin,
      identity: { name: "<script>alert(1)</script>" },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("ProductDetail", () => {
  const product = KANUWIN_CATALOG.products.find(
    (p) => p.slug === "snack-de-gusanos",
  );

  it("shows formats, nutrition and marks a provisional image", () => {
    if (!product) throw new Error("seed changed");
    const html = renderToStaticMarkup(
      createElement(ProductDetail, {
        product,
        showPrice: true,
        whatsappDigits: "56912345678",
      }),
    );
    expect(html).toContain("$9.300");
    expect(html).toContain("Proteína del tenebrio");
    expect(html).toContain("Imagen referencial");
  });
});

describe("helpers", () => {
  it("formats CLP", () => {
    const price = KANUWIN_CATALOG.products[0]?.variants[0]?.price;
    if (!price) throw new Error("seed changed");
    expect(formatMoney(price)).toBe("$8.900");
  });

  it("splits plain text into paragraphs", () => {
    expect(paragraphs("a\n\n b \n")).toEqual(["a", "b"]);
  });

  it("encodes URLs", () => {
    expect(whatsappHref("569", "hola & chao")).toBe(
      "https://wa.me/569?text=hola%20%26%20chao",
    );
    expect(productHref("a/b")).toBe("/p/a%2Fb");
  });

  it("detects the placeholder number", () => {
    expect(storeWhatsAppDigits(AVES_PRESET)).toBeUndefined();
    expect(storeWhatsAppDigits(kanuwin)).toBe("56912345678");
  });

  it("maps only validated theme values to CSS variables", () => {
    const style = storeThemeStyle(AVES_PRESET.theme) as Record<string, string>;
    expect(style["--color-bg"]).toBe("#0f1b2d");
    expect(style["--color-on-primary"]).toBe("#0f1b2d");
    expect(style["--radius-md"]).toBe("0.5rem");
    expect(Object.keys(style).every((k) => k.startsWith("--"))).toBe(true);
  });
});
