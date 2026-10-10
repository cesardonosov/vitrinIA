import { type Catalog, selectProducts } from "@/modules/catalog/application";
import {
  isPlaceholderWhatsApp,
  type StoreConfig,
  type StoreSection,
  toWhatsAppDigits,
} from "@/modules/store-config/application";
import { Hero } from "./hero";
import { ProductGrid } from "./product-grid";
import { StorefrontShell } from "./storefront-shell";
import { TextBlock } from "./text-block";
import { WhatsAppCta } from "./whatsapp-cta";

export interface StorefrontHomeProps {
  /** Already validated by `parseStoreConfig`. */
  readonly config: StoreConfig;
  readonly catalog: Catalog;
}

interface RenderContext {
  readonly catalog: Catalog;
  readonly showPrice: boolean;
  readonly whatsappDigits?: string;
  readonly firstGrid: boolean;
}

/**
 * Section registry: one renderer per `SECTION_TYPES` entry. The mapped type
 * makes a missing section type a compile error, and the registry test checks
 * the keys at runtime.
 */
export const SECTION_RENDERERS: {
  readonly [T in StoreSection["type"]]: (
    props: Extract<StoreSection, { type: T }>["props"],
    ctx: RenderContext,
  ) => React.ReactNode;
} = {
  hero: (props) => <Hero {...props} />,
  "product-grid": (props, ctx) => (
    <ProductGrid
      title={props.title}
      products={selectProducts(ctx.catalog, props.source, props.limit)}
      showPrice={ctx.showPrice}
      eager={ctx.firstGrid}
    />
  ),
  text: (props) => <TextBlock {...props} />,
  "whatsapp-cta": (props, ctx) => (
    <WhatsAppCta {...props} whatsappDigits={ctx.whatsappDigits} />
  ),
};

function renderSection(
  section: StoreSection,
  ctx: RenderContext,
): React.ReactNode {
  switch (section.type) {
    case "hero":
      return SECTION_RENDERERS.hero(section.props, ctx);
    case "product-grid":
      return SECTION_RENDERERS["product-grid"](section.props, ctx);
    case "text":
      return SECTION_RENDERERS.text(section.props, ctx);
    case "whatsapp-cta":
      return SECTION_RENDERERS["whatsapp-cta"](section.props, ctx);
  }
}

/** Returns the digits for wa.me, or undefined while the number is the placeholder. */
export function storeWhatsAppDigits(config: StoreConfig): string | undefined {
  const { whatsapp } = config.contact;
  return isPlaceholderWhatsApp(whatsapp)
    ? undefined
    : toWhatsAppDigits(whatsapp);
}

export function StorefrontHome({ config, catalog }: StorefrontHomeProps) {
  const sections = config.pages.home.sections;
  const firstGridIndex = sections.findIndex((s) => s.type === "product-grid");
  const base = {
    catalog,
    showPrice: config.features.showPrices,
    whatsappDigits: config.features.whatsappCheckout
      ? storeWhatsAppDigits(config)
      : undefined,
  };
  return (
    <StorefrontShell config={config}>
      {sections.map((section, i) => (
        // Sections have no id in Store Config v1; their order is their identity.
        <div key={i}>
          {renderSection(section, { ...base, firstGrid: i === firstGridIndex })}
        </div>
      ))}
    </StorefrontShell>
  );
}
