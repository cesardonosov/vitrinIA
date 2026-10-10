import { z } from "zod";
import { isUuidV7 } from "@/shared/kernel";
import {
  DEFAULT_ON_PRIMARY_COLOR,
  HEX_COLOR_PATTERN,
  meetsAaContrast,
  meetsAaUiContrast,
} from "../../domain/color";
import { FONT_IDS, RADIUS_IDS } from "../../domain/fonts";
import { CHILEAN_MOBILE_E164_PATTERN } from "../../domain/phone";
import {
  FEATURE_FLAGS,
  MAX_DELIVERY_PRICE_CLP,
  MAX_DELIVERY_ZONES,
  MAX_FREE_SHIPPING_FROM_CLP,
  MAX_SECTIONS_PER_PAGE,
  PRODUCT_GRID_MAX_LIMIT,
  PRODUCT_GRID_SOURCES,
  STORE_CONFIG_SCHEMA_VERSION,
  type StoreConfigV1,
} from "../../domain/store-config";
import { isBlankText, isPlainText, TEXT_LIMITS } from "../../domain/text";
import {
  checkUrlForField,
  URL_MAX_LENGTH,
  type UrlField,
} from "../../domain/url-allowlist";

/**
 * Zod schema of Store Config v1 (ADR-0004 §1, issue VIT-110).
 *
 * Rules:
 * - Every object is `z.strictObject`: unknown keys are rejected, never stripped.
 * - No `z.any()`, `z.unknown()`, `z.record()`, no HTML/CSS/markdown field.
 * - Each rule delegates to a pure domain function so that the Zod schema and
 *   the domain agree by construction (colour regex, font list, E.164, URL
 *   allowlist, plain text, limits).
 * - No `.transform()`: what comes in is what is stored, so the read-side and
 *   write-side validations see the same bytes.
 *
 * The inferred type is checked against the domain `StoreConfigV1` below: if
 * the two drift, `pnpm typecheck` fails.
 */

const plainText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !isBlankText(value), {
      message: "text must not be blank",
    })
    .refine(isPlainText, {
      message:
        "control, format, separator or malformed characters are not allowed",
    });

const optionalPlainText = (max: number) => plainText(max).optional();

const hexColor = z
  .string()
  .regex(HEX_COLOR_PATTERN, { message: "color must be #rrggbb" });

const imageId = z.string().refine(isUuidV7, {
  message: "image reference must be an ImageStorage id (UUID v7)",
});

const whatsapp = z.string().regex(CHILEAN_MOBILE_E164_PATTERN, {
  message: "whatsapp must be a Chilean mobile in E.164 (+569XXXXXXXX)",
});

const allowlistedUrl = (field: UrlField) =>
  z
    .string()
    .max(URL_MAX_LENGTH)
    .superRefine((value, ctx) => {
      const checked = checkUrlForField(field, value);
      if (!checked.ok) {
        ctx.addIssue({
          code: "custom",
          message: `${checked.error.message} (${checked.error.reason})`,
        });
      }
    });

const paymentLink = allowlistedUrl("contact.paymentLink");

export const identitySchema = z.strictObject({
  name: plainText(TEXT_LIMITS.storeName),
  tagline: optionalPlainText(TEXT_LIMITS.tagline),
  logoImageId: imageId.optional(),
});

export const themeSchema = z
  .strictObject({
    colors: z.strictObject({
      primary: hexColor,
      background: hexColor,
      text: hexColor,
      onPrimary: hexColor.optional().meta({
        default: DEFAULT_ON_PRIMARY_COLOR,
        description:
          "Texto sobre primary (botones, badges). Si falta, la vitrina usa #ffffff y el validador comprueba ese valor.",
      }),
      accent: hexColor.optional(),
    }),
    font: z.enum(FONT_IDS),
    radius: z.enum(RADIUS_IDS),
  })
  .superRefine((theme, ctx) => {
    const { primary, background, text } = theme.colors;
    const onPrimary = theme.colors.onPrimary ?? DEFAULT_ON_PRIMARY_COLOR;
    if (!meetsAaContrast(text, background)) {
      ctx.addIssue({
        code: "custom",
        path: ["colors", "text"],
        message: "text on background must reach WCAG AA contrast (4.5:1)",
      });
    }
    if (!meetsAaUiContrast(primary, background)) {
      ctx.addIssue({
        code: "custom",
        path: ["colors", "primary"],
        message:
          "primary on background must reach WCAG AA contrast for UI components (3:1)",
      });
    }
    if (!meetsAaContrast(onPrimary, primary)) {
      ctx.addIssue({
        code: "custom",
        path: ["colors", "onPrimary"],
        message:
          "onPrimary (or its default #ffffff) on primary must reach WCAG AA contrast (4.5:1)",
      });
    }
  });

export const contactSchema = z.strictObject({
  whatsapp,
  paymentLink: paymentLink.optional(),
});

export const heroSectionSchema = z.strictObject({
  type: z.literal("hero"),
  props: z.strictObject({
    title: plainText(TEXT_LIMITS.sectionTitle),
    subtitle: optionalPlainText(TEXT_LIMITS.sectionSubtitle),
    imageId: imageId.optional(),
  }),
});

export const productGridSectionSchema = z.strictObject({
  type: z.literal("product-grid"),
  props: z.strictObject({
    title: optionalPlainText(TEXT_LIMITS.sectionTitle),
    source: z.enum(PRODUCT_GRID_SOURCES),
    limit: z.int().min(1).max(PRODUCT_GRID_MAX_LIMIT),
  }),
});

export const textSectionSchema = z.strictObject({
  type: z.literal("text"),
  props: z.strictObject({
    title: optionalPlainText(TEXT_LIMITS.sectionTitle),
    body: plainText(TEXT_LIMITS.sectionBody),
  }),
});

export const whatsappCtaSectionSchema = z.strictObject({
  type: z.literal("whatsapp-cta"),
  props: z.strictObject({
    label: plainText(TEXT_LIMITS.buttonLabel),
    message: optionalPlainText(TEXT_LIMITS.sectionSubtitle),
  }),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  productGridSectionSchema,
  textSectionSchema,
  whatsappCtaSectionSchema,
]);

export const pageSchema = z.strictObject({
  sections: z.array(sectionSchema).max(MAX_SECTIONS_PER_PAGE),
});

export const pagesSchema = z.strictObject({
  home: pageSchema,
});

export const paymentMethodSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("mercado-pago-link"),
    url: allowlistedUrl("checkout.mercadoPagoLink"),
  }),
  z.strictObject({
    type: z.literal("flow-link"),
    url: allowlistedUrl("checkout.flowLink"),
  }),
  z.strictObject({
    type: z.literal("bank-transfer"),
    details: plainText(TEXT_LIMITS.paymentDetails),
  }),
]);

const clpAmount = (max: number) => z.int().min(0).max(max);

export const deliverySchema = z
  .strictObject({
    zones: z
      .array(
        z.strictObject({
          name: plainText(TEXT_LIMITS.deliveryZoneName),
          priceClp: clpAmount(MAX_DELIVERY_PRICE_CLP),
          leadTime: optionalPlainText(TEXT_LIMITS.deliveryLeadTime),
        }),
      )
      .max(MAX_DELIVERY_ZONES),
    freeShippingFromClp: clpAmount(MAX_FREE_SHIPPING_FROM_CLP)
      .min(1)
      .optional(),
    pickup: z
      .strictObject({ details: plainText(TEXT_LIMITS.pickupDetails) })
      .optional(),
  })
  .superRefine((delivery, ctx) => {
    if (delivery.zones.length === 0 && delivery.pickup === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["zones"],
        message: "offer at least one delivery zone or pickup",
      });
    }
    const names = delivery.zones.map((zone) => zone.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: "custom",
        path: ["zones"],
        message: "delivery zone names must be unique",
      });
    }
  });

export const checkoutSchema = z.strictObject({
  paymentMethods: z
    .array(paymentMethodSchema)
    .min(1)
    .max(3)
    .superRefine((methods, ctx) => {
      const types = methods.map((method) => method.type);
      if (new Set(types).size !== types.length) {
        ctx.addIssue({
          code: "custom",
          message: "each payment method type may appear only once",
        });
      }
    }),
  delivery: deliverySchema,
  invoice: z.boolean(),
});

const featureEntries = Object.fromEntries(
  FEATURE_FLAGS.map((flag) => [flag, z.boolean()]),
) as Record<(typeof FEATURE_FLAGS)[number], z.ZodBoolean>;

export const featuresSchema = z.strictObject(featureEntries);

export const storeConfigV1Schema = z
  .strictObject({
    schemaVersion: z.literal(STORE_CONFIG_SCHEMA_VERSION),
    identity: identitySchema,
    theme: themeSchema,
    contact: contactSchema,
    pages: pagesSchema,
    features: featuresSchema,
    checkout: checkoutSchema.optional(),
  })
  .meta({
    id: "StoreConfigV1",
    title: "VitrinIA Store Config v1",
    description:
      "Configuración de una tienda VitrinIA (ADR-0004). Todos los objetos son estrictos; textos en texto plano; imágenes por id; URLs solo de la allowlist por campo.",
  });

export type StoreConfigV1Input = z.input<typeof storeConfigV1Schema>;
export type StoreConfigV1Output = z.output<typeof storeConfigV1Schema>;

// Compile-time guard: the Zod output must be assignable to the domain type
// (`pnpm typecheck` fails on drift). The other direction is covered by the
// test that parses the domain-typed ROPA_PRESET.
const _storeConfigTypesMatch: StoreConfigV1 = {} as StoreConfigV1Output;
void _storeConfigTypesMatch;
