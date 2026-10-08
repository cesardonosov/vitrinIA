import { DEFAULT_FEATURES, type StoreConfigV1 } from "../store-config";

/**
 * Preset "ropa" (first vertical, STATUS.md decision #10): a valid Store Config
 * v1 a new clothing store starts from. Texts in es-CL with clear placeholders,
 * never lorem ipsum. Only system fonts and AA-contrast colours.
 *
 * The Designer owns the visual choices (skill `create-preset`); this file is
 * the typed contract they fill. `whatsapp` is a placeholder the onboarding
 * form always replaces.
 */
const ropa: StoreConfigV1 = {
  schemaVersion: 1,
  identity: {
    name: "Tu tienda de ropa",
    tagline: "Prendas elegidas con cariño, pedidos por WhatsApp",
  },
  theme: {
    colors: {
      primary: "#7c2d12",
      background: "#fffaf5",
      text: "#1c1917",
      accent: "#b45309",
    },
    font: "system-sans",
    radius: "md",
  },
  contact: {
    whatsapp: "+56900000000",
  },
  pages: {
    home: {
      sections: [
        {
          type: "hero",
          props: {
            title: "Nueva temporada",
            subtitle: "Poleras, jeans y chaquetas con envío a todo Chile",
          },
        },
        {
          type: "product-grid",
          props: { title: "Destacados", source: "featured", limit: 8 },
        },
        {
          type: "product-grid",
          props: { title: "Recién llegados", source: "latest", limit: 12 },
        },
        {
          type: "text",
          props: {
            title: "Envíos y cambios",
            body: "Despachamos en 24 a 72 horas hábiles.\nCambios de talla dentro de 10 días con la prenda sin uso.",
          },
        },
        {
          type: "whatsapp-cta",
          props: {
            label: "Pregúntanos por WhatsApp",
            message: "Hola, vi tu tienda y quiero consultar por una prenda.",
          },
        },
      ],
    },
  },
  features: { ...DEFAULT_FEATURES, showStock: true },
};

export const ROPA_PRESET: StoreConfigV1 = Object.freeze(ropa);
