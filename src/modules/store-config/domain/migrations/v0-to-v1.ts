import { DEFAULT_FEATURES, FEATURE_FLAGS } from "../store-config";
import type { Migration, VersionedConfig } from "./types";

/**
 * v0 -> v1.
 *
 * v0 is the flat shape of the Sprint 0 onboarding prototype
 * (`tests/fixtures/store-config/v0/`): `name`, `whatsapp`, `primaryColor`,
 * optional `tagline`, `sections` and `features`. v1 (ADR-0004 v2) groups it
 * into `identity`, `theme`, `contact`, `pages.home.sections`, `features` and
 * removes the free `paymentLink` (it now goes through the URL allowlist).
 *
 * Migrations are total: they map what they understand and leave the rest to the
 * validator, which reports precise issues. They never throw.
 */

const V0_DEFAULT_COLORS = Object.freeze({
  primary: "#1d4ed8",
  background: "#ffffff",
  text: "#111827",
});

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function pickFeatures(raw: unknown): Record<string, boolean> {
  const source = asRecord(raw) ?? {};
  const features: Record<string, boolean> = { ...DEFAULT_FEATURES };
  for (const flag of FEATURE_FLAGS) {
    const value = source[flag];
    if (typeof value === "boolean") features[flag] = value;
  }
  return features;
}

export const migrateV0ToV1: Migration = (
  v0: VersionedConfig,
): VersionedConfig => {
  const identity: Record<string, unknown> = { name: asString(v0.name) ?? "" };
  const tagline = asString(v0.tagline);
  if (tagline !== undefined) identity.tagline = tagline;

  const contact: Record<string, unknown> = {
    whatsapp: asString(v0.whatsapp) ?? "",
  };
  // v0 `paymentLink` is intentionally dropped: v1 only accepts hosts from the
  // allowlist and the list is empty until E1. The vendor re-enters it.

  // v0 accepted `#7C2D12`; v1 only accepts lowercase hex (ADR-0004 §1), so
  // the migration normalises instead of making every old config invalid.
  const primary = asString(v0.primaryColor)?.toLowerCase();

  return {
    schemaVersion: 1,
    identity,
    theme: {
      colors: {
        ...V0_DEFAULT_COLORS,
        ...(primary === undefined ? {} : { primary }),
      },
      font: "system-sans",
      radius: "md",
    },
    contact,
    pages: {
      home: { sections: Array.isArray(v0.sections) ? v0.sections : [] },
    },
    features: pickFeatures(v0.features),
  };
};
