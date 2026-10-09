import { deepFreeze } from "../deep-freeze";
import { PLACEHOLDER_WHATSAPP } from "../phone";
import { DEFAULT_FEATURES, type StoreConfigV1 } from "../store-config";

/**
 * Preset "aves" (second vertical, first real store: Kanuwiñ, premium bird-seed
 * mixes). Dark theme: navy background, warm-white text, gold primary, sage
 * accent. All three contrast pairs of ADR-0004 §3 pass with room to spare
 * (numbers in docs/design/presets.md, enforced by aves.test.ts).
 *
 * Texts in es-CL, voz cercana. `contact.whatsapp` is `PLACEHOLDER_WHATSAPP`
 * (the seller's real number comes from onboarding). The delivery sentence in
 * "Cómo pedir" is a marked placeholder: delivery terms are unknown and the
 * seller must replace it before publishing.
 */
const aves: StoreConfigV1 = {
  schemaVersion: 1,
  identity: {
    name: "Tu tienda de alimento para aves",
    tagline: "Nutrición premium para aves, pedidos por WhatsApp",
  },
  theme: {
    colors: {
      primary: "#d4a63a",
      background: "#0f1b2d",
      text: "#f4efe3",
      onPrimary: "#0f1b2d",
      accent: "#9db08b",
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
            title: "Mezclas de semillas formuladas por veterinarios",
            subtitle:
              "Alimento premium para tus aves, hecho en Chile y listo para pedir por WhatsApp",
          },
        },
        {
          type: "product-grid",
          props: { title: "Nuestras mezclas", source: "featured", limit: 8 },
        },
        {
          type: "product-grid",
          props: { title: "Todo el catálogo", source: "all", limit: 24 },
        },
        {
          type: "text",
          props: {
            title: "Cómo elegir tu mezcla",
            body: "Cada mezcla está pensada para un tipo de ave: pequeñas psitácidas, passeriformes, loros grandes o insectívoros.\nLas mezclas cubren entre el 40% y el 50% de la dieta; el resto es fruta, verdura y pellet.\nSi tienes dudas sobre qué darle a tu ave, escríbenos y te ayudamos.",
          },
        },
        {
          type: "text",
          props: {
            title: "Cómo pedir",
            body: "Elige tus productos, arma tu pedido y envíalo por WhatsApp.\nREEMPLAZAR: aquí van tus plazos y zonas de despacho y tus formas de pago.",
          },
        },
        {
          type: "whatsapp-cta",
          props: {
            label: "Pregúntanos por WhatsApp",
            message: "Hola, vi tu tienda y quiero consultar por una mezcla.",
          },
        },
      ],
    },
  },
  features: { ...DEFAULT_FEATURES },
};

export const AVES_PRESET: StoreConfigV1 = deepFreeze(aves);
