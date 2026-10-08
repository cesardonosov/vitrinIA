import {
  domainError,
  Result,
  type Result as ResultType,
} from "@/shared/kernel";
import type { UrlNotAllowed } from "./errors";

/**
 * URL allowlist per field (ADR-0004 §3, threat model tenancy §9).
 *
 * Every URL field of the Store Config declares its own allowed schemes AND
 * hosts. Anything outside the row is rejected: `http:`, `javascript:`, `data:`,
 * IP literals, ports, userinfo and punycode (`xn--`) hosts. A field without a
 * row here cannot hold a URL at all.
 *
 * Owner: Architect. Changing a row goes through Security (`security-review`).
 * It is code, never per-store or MCP configurable.
 *
 * Rows:
 * - `contact.paymentLink`: `https:` only. The host list is EMPTY on purpose:
 *   it depends on Cesar's decision E1 (which payment-link providers a store may
 *   use; see docs/STATUS.md "Esperando a Cesar" #1). Until E1 lands, every
 *   value for this field is rejected and the field stays optional.
 */

export interface UrlFieldRule {
  /** Allowed `URL.protocol` values, with the trailing colon (`https:`). */
  readonly schemes: ReadonlyArray<string>;
  /** Exact lowercase hosts; no wildcards, no subdomain matching. */
  readonly hosts: ReadonlyArray<string>;
}

export const URL_FIELD_ALLOWLIST = Object.freeze({
  "contact.paymentLink": Object.freeze({
    schemes: Object.freeze(["https:"]),
    hosts: Object.freeze([]),
  }),
}) satisfies Readonly<Record<string, UrlFieldRule>>;

export type UrlField = keyof typeof URL_FIELD_ALLOWLIST;

export const URL_MAX_LENGTH = 2048;

const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;

function notAllowed(
  field: string,
  reason: UrlNotAllowed["reason"],
  message: string,
): UrlNotAllowed {
  return Object.freeze({
    ...domainError("UrlNotAllowed", message),
    field,
    reason,
  });
}

/**
 * Validates `value` against a rule. Exported with an explicit rule so the
 * mechanism can be tested independently of the (currently empty) rows.
 */
export function checkUrlAgainstRule(
  field: string,
  rule: UrlFieldRule,
  value: string,
): ResultType<string, UrlNotAllowed> {
  if (value.length > URL_MAX_LENGTH) {
    return Result.err(
      notAllowed(
        field,
        "too-long",
        `url must have at most ${URL_MAX_LENGTH} characters`,
      ),
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return Result.err(
      notAllowed(field, "unparseable", "url is not absolute or not parseable"),
    );
  }
  if (!rule.schemes.includes(url.protocol)) {
    return Result.err(
      notAllowed(field, "scheme", "url scheme is not allowed for this field"),
    );
  }
  if (url.username !== "" || url.password !== "") {
    return Result.err(
      notAllowed(field, "credentials", "url must not carry credentials"),
    );
  }
  if (url.port !== "") {
    return Result.err(notAllowed(field, "port", "url must not specify a port"));
  }
  const host = url.hostname.toLowerCase();
  if (host.startsWith("[") || IPV4_LITERAL.test(host)) {
    return Result.err(
      notAllowed(field, "ip-address", "url host must be a domain name"),
    );
  }
  if (host.split(".").some((label) => label.startsWith("xn--"))) {
    return Result.err(
      notAllowed(field, "punycode", "url host must not be punycode"),
    );
  }
  if (!rule.hosts.includes(host)) {
    return Result.err(
      notAllowed(field, "host", "url host is not allowed for this field"),
    );
  }
  return Result.ok(value);
}

/** Validates a URL for a field of the Store Config using the allowlist above. */
export function checkUrlForField(
  field: UrlField,
  value: string,
): ResultType<string, UrlNotAllowed> {
  return checkUrlAgainstRule(field, URL_FIELD_ALLOWLIST[field], value);
}
