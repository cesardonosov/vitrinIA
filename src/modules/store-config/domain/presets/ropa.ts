import { deepFreeze } from "../deep-freeze";
import { PLACEHOLDER_WHATSAPP } from "../phone";
import { DEFAULT_FEATURES, type StoreConfigV1 } from "../store-config";

/**
 * Preset "ropa" (first vertical, STATUS.md decision #10): a valid Store Config
 * v1 a new clothing store starts from. Texts in es-CL with clear placeholders,
 * never lorem ipsum. Only system fonts and AA-contrast colours (all three
 * pairs of ADR-0004 §3, `onPrimary` set explicitly).
 *
 * The Designer owns the visual choices (skill `create-preset`); this file is
 * the typed contract they fill. `contact.whatsapp` is `PLACEHOLDER_WHATSAPP`,
 * a fictitious number (see `phone.ts`) that the onboarding form always
 * replaces; a seed must never persist it as a real store contact.
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
      onPrimary: "#ffffff",
      accent: "#b45309",
    },
    font: "system-sans",
    radius: "md",
  },
  contact: {
    whatsapp: PLACEHOLDER_WHATSAPP,
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

export const ROPA_PRESET: StoreConfigV1 = deepFreeze(ropa);
