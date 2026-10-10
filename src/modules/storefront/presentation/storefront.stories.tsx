import type { Meta, StoryObj } from "@storybook/nextjs";
import { EMPTY_CATALOG } from "@/modules/catalog/application";
import { KANUWIN_CATALOG } from "@/modules/catalog/infrastructure/seed/kanuwin";
import {
  AVES_PRESET,
  ROPA_PRESET,
  type StoreConfig,
} from "@/modules/store-config/application";
import { ProductDetail } from "./components/product-detail";
import { StorefrontHome } from "./components/storefront-home";
import { StorefrontShell } from "./components/storefront-shell";

/** Kanuwiñ as the demo store sees it: preset `aves` with the store's name. Number is fictitious. */
const KANUWIN: StoreConfig = {
  ...AVES_PRESET,
  identity: { name: "Kanuwiñ", tagline: AVES_PRESET.identity.tagline },
  contact: { whatsapp: "+56900000001" },
};

const meta: Meta<typeof StorefrontHome> = {
  title: "Vitrina/Tienda",
  component: StorefrontHome,
  parameters: { a11y: { test: "error" } },
};
export default meta;

type Story = StoryObj<typeof StorefrontHome>;

export const KanuwinHome: Story = {
  name: "Kanuwiñ · home (aves)",
  args: { config: KANUWIN, catalog: KANUWIN_CATALOG },
};

export const KanuwinDesktop: Story = {
  name: "Kanuwiñ · home desktop",
  args: KanuwinHome.args,
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const SinNumeroDeWhatsApp: Story = {
  name: "Preset aves sin número (placeholder)",
  args: { config: AVES_PRESET, catalog: KANUWIN_CATALOG },
};

export const SinPrecios: Story = {
  name: "Kanuwiñ · precios ocultos",
  args: {
    config: {
      ...KANUWIN,
      features: { ...KANUWIN.features, showPrices: false },
    },
    catalog: KANUWIN_CATALOG,
  },
};

export const CatalogoVacio: Story = {
  name: "Catálogo vacío",
  args: { config: KANUWIN, catalog: EMPTY_CATALOG },
};

export const PresetRopa: Story = {
  name: "Preset ropa con el catálogo de Kanuwiñ",
  args: { config: ROPA_PRESET, catalog: KANUWIN_CATALOG },
};

export const TextosLargos: Story = {
  name: "Nombre de 80 caracteres y emojis",
  args: {
    config: {
      ...KANUWIN,
      identity: {
        name: "Alimentos premium para aves exóticas 🦜 de la Región de Los Ríos y alrededore",
      },
    },
    catalog: {
      ...KANUWIN_CATALOG,
      products: KANUWIN_CATALOG.products.map((p, i) =>
        i === 0
          ? {
              ...p,
              name: `${p.name} edición especial con nombre muy largo 🌻🌻`,
            }
          : p,
      ),
    },
  },
};

function productStory(slug: string): Story {
  const product = KANUWIN_CATALOG.products.find((p) => p.slug === slug);
  return {
    render: () =>
      product ? (
        <StorefrontShell config={KANUWIN}>
          <ProductDetail
            product={product}
            categoryName={
              KANUWIN_CATALOG.categories.find(
                (c) => c.id === product.categoryId,
              )?.name
            }
            showPrice
            whatsappDigits="56900000001"
          />
        </StorefrontShell>
      ) : (
        <p>Producto no encontrado en la semilla</p>
      ),
  };
}

export const ProductoConVariantes: Story = {
  name: "Producto · dos formatos",
  ...productStory("mezcla-pequenas-psitacidas"),
};

export const ProductoImagenProvisoria: Story = {
  name: "Producto · imagen provisoria",
  ...productStory("snack-de-gusanos"),
};
