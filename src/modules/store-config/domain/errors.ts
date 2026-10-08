import type { DomainError } from "@/shared/kernel";

/**
 * Typed errors of the store-config domain (ADR-0004).
 *
 * `path` is the JSON path of the offending field (`contact.whatsapp`,
 * `pages.home.sections.2.props.title`) so callers (portal form, MCP tool) can
 * point at the field. Messages never echo the rejected value: it may be
 * attacker-controlled.
 */

/** One field failed validation. */
export interface StoreConfigIssue {
  readonly path: string;
  readonly message: string;
}

export type InvalidStoreConfig = DomainError<"InvalidStoreConfig"> & {
  readonly issues: ReadonlyArray<StoreConfigIssue>;
};

/** `schemaVersion` is missing, not an integer, or newer than this build knows. */
export type UnsupportedSchemaVersion =
  DomainError<"UnsupportedSchemaVersion"> & {
    readonly schemaVersion: number | undefined;
  };

export type InvalidSlug = DomainError<"InvalidSlug"> & {
  readonly reason:
    | "empty"
    | "too-short"
    | "too-long"
    | "invalid-characters"
    | "punycode"
    | "reserved";
  /** Canonical candidate after normalisation, when one exists. */
  readonly normalized?: string;
};

export type UrlNotAllowed = DomainError<"UrlNotAllowed"> & {
  readonly field: string;
  readonly reason:
    | "unparseable"
    | "too-long"
    | "scheme"
    | "host"
    | "credentials"
    | "port"
    | "ip-address"
    | "punycode";
};

export type StoreConfigError =
  | InvalidStoreConfig
  | UnsupportedSchemaVersion
  | InvalidSlug
  | UrlNotAllowed;
