"use client";

import { type FormEvent, useRef, useState } from "react";
import { FIELD_LIMITS } from "../../domain/limits";
import { CHILE_REGIONS } from "../../domain/regions";
import { formatClp } from "../../domain/whatsapp-message";
import { checkoutErrorMessage, shippingPreview } from "./guards";
import { type TurnstileHandle, TurnstileWidget } from "./turnstile-widget";
import type { CheckoutLine, CheckoutOptions, PlacedOrderView } from "./types";

export interface CheckoutPanelProps {
  readonly lines: ReadonlyArray<CheckoutLine>;
  /** Display subtotal from the server's catalog prices. The server recomputes it. */
  readonly subtotalClp: number;
  readonly options: CheckoutOptions;
  readonly onPlaced: (placed: PlacedOrderView) => void;
}

type Delivery =
  | { readonly kind: "zone"; readonly name: string }
  | { readonly kind: "pickup" };

const inputClass =
  "min-h-touch w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-text";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly error?: string | undefined;
  readonly hint?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children}
      {hint ? <p className="text-small">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="text-small text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const FIELD_MESSAGES: Readonly<Record<string, string>> = {
  required: "Completa este dato.",
  invalid: "Revisa este dato.",
  too_long: "Es demasiado largo.",
  unknown_zone: "Elige una de las opciones de despacho.",
  unavailable: "Esta opción no está disponible en esta tienda.",
};

/**
 * Checkout form (VIT-186). Mobile first: one column, 44 px targets, native inputs with
 * `autocomplete`. Nothing the buyer types is saved in the browser (threat model O16): the
 * state lives in memory until the order is sent. The idempotency key is made when the form
 * opens and kept across retries, so a double tap never creates two orders (O11).
 */
export function CheckoutPanel({
  lines,
  subtotalClp,
  options,
  onPlaced,
}: CheckoutPanelProps) {
  const firstZone = options.zones[0];
  const [delivery, setDelivery] = useState<Delivery>(
    firstZone ? { kind: "zone", name: firstZone.name } : { kind: "pickup" },
  );
  const [invoice, setInvoice] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const idempotencyKey = useRef<string>("");
  const widget = useRef<TurnstileHandle | null>(null);
  idempotencyKey.current ||= crypto.randomUUID();

  const zone =
    delivery.kind === "zone"
      ? options.zones.find((z) => z.name === delivery.name)
      : undefined;
  const shipping = shippingPreview(
    zone?.priceClp,
    subtotalClp,
    options.freeShippingFromClp,
  );
  const total = subtotalClp + shipping;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    if (!token) {
      setFormError("Confirma que eres una persona para enviar el pedido.");
      return;
    }
    const email = text("email");
    const note = text("note");
    const body = {
      idempotencyKey: idempotencyKey.current,
      turnstileToken: token,
      items: lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
      })),
      delivery:
        delivery.kind === "pickup"
          ? { type: "pickup" }
          : {
              type: "delivery",
              zone: delivery.name,
              address: {
                region: text("region"),
                commune: text("commune"),
                street: text("street"),
                ...(text("extra") ? { extra: text("extra") } : {}),
              },
            },
      ...(invoice
        ? {
            invoice: {
              rut: text("rut"),
              businessName: text("businessName"),
              businessActivity: text("businessActivity"),
            },
          }
        : {}),
      contact: {
        name: text("name"),
        phone: text("phone"),
        ...(email ? { email } : {}),
        ...(note ? { note } : {}),
      },
    };

    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        issues?: ReadonlyArray<{ path: string; code: string }>;
      } & Partial<PlacedOrderView>;
      if (response.ok && json.code && json.whatsappUrl && json.payment) {
        onPlaced(json as PlacedOrderView);
        return;
      }
      if (json.error === "IDEMPOTENCY_CONFLICT")
        idempotencyKey.current = crypto.randomUUID();
      if (json.issues) {
        const next: Record<string, string> = {};
        for (const issue of json.issues) {
          next[issue.path] ??=
            FIELD_MESSAGES[issue.code] ?? "Revisa este dato.";
        }
        setFieldErrors(next);
      }
      setFormError(checkoutErrorMessage(json.error));
    } catch {
      setFormError(checkoutErrorMessage(undefined));
    } finally {
      setBusy(false);
      // A Turnstile token works once.
      widget.current?.reset();
    }
  }

  const err = (path: string) => fieldErrors[path];

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-6"
      aria-label="Datos del pedido"
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-h3 font-semibold">
          ¿Cómo lo recibes?
        </legend>
        {options.zones.map((z) => (
          <label
            key={z.name}
            className="flex min-h-touch items-start gap-3 rounded-md border border-border p-3"
          >
            <input
              type="radio"
              name="delivery"
              className="mt-1 size-5"
              checked={delivery.kind === "zone" && delivery.name === z.name}
              onChange={() => setDelivery({ kind: "zone", name: z.name })}
            />
            <span>
              <span className="font-semibold">Despacho: {z.name}</span>
              {options.showPrices ? (
                <span>
                  {" "}
                  · {z.priceClp === 0 ? "gratis" : formatClp(z.priceClp)}
                </span>
              ) : null}
              {z.leadTime ? (
                <span className="block text-small">{z.leadTime}</span>
              ) : null}
            </span>
          </label>
        ))}
        {options.pickup ? (
          <label className="flex min-h-touch items-start gap-3 rounded-md border border-border p-3">
            <input
              type="radio"
              name="delivery"
              className="mt-1 size-5"
              checked={delivery.kind === "pickup"}
              onChange={() => setDelivery({ kind: "pickup" })}
            />
            <span>
              <span className="font-semibold">Retiro en tienda</span>
              <span className="block text-small">{options.pickup.details}</span>
            </span>
          </label>
        ) : null}
        {err("delivery.zone") ? (
          <p className="text-small text-danger-700">{err("delivery.zone")}</p>
        ) : null}
        {err("delivery.type") ? (
          <p className="text-small text-danger-700">{err("delivery.type")}</p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-h3 font-semibold">Tus datos</legend>
        <Field id="name" label="Nombre" error={err("contact.name")}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            maxLength={FIELD_LIMITS.name}
            className={inputClass}
          />
        </Field>
        <Field
          id="phone"
          label="Teléfono (WhatsApp)"
          hint="Ejemplo: 9 1234 5678"
          error={err("contact.phone")}
        >
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={FIELD_LIMITS.phone}
            className={inputClass}
          />
        </Field>
        <Field
          id="email"
          label="Correo (opcional)"
          error={err("contact.email")}
        >
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={FIELD_LIMITS.email}
            className={inputClass}
          />
        </Field>
      </fieldset>

      {delivery.kind === "zone" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-h3 font-semibold">
            Dirección de despacho
          </legend>
          <Field
            id="region"
            label="Región"
            error={err("delivery.address.region")}
          >
            <select
              id="region"
              name="region"
              autoComplete="address-level1"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Elige tu región
              </option>
              {CHILE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="commune"
            label="Comuna"
            error={err("delivery.address.commune")}
          >
            <input
              id="commune"
              name="commune"
              autoComplete="address-level2"
              required
              maxLength={FIELD_LIMITS.commune}
              className={inputClass}
            />
          </Field>
          <Field
            id="street"
            label="Calle y número"
            error={err("delivery.address.street")}
          >
            <input
              id="street"
              name="street"
              autoComplete="address-line1"
              required
              maxLength={FIELD_LIMITS.street}
              className={inputClass}
            />
          </Field>
          <Field
            id="extra"
            label="Depto o referencia (opcional)"
            error={err("delivery.address.extra")}
          >
            <input
              id="extra"
              name="extra"
              autoComplete="address-line2"
              maxLength={FIELD_LIMITS.addressExtra}
              className={inputClass}
            />
          </Field>
        </fieldset>
      ) : null}

      {options.invoiceOffered ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-h3 font-semibold">Factura</legend>
          <label className="flex min-h-touch items-center gap-3">
            <input
              type="checkbox"
              className="size-5"
              checked={invoice}
              onChange={(e) => setInvoice(e.target.checked)}
            />
            <span>Necesito factura</span>
          </label>
          {invoice ? (
            <>
              <Field
                id="rut"
                label="RUT de la empresa"
                hint="Ejemplo: 76.123.456-0"
                error={err("invoice.rut")}
              >
                <input
                  id="rut"
                  name="rut"
                  autoComplete="off"
                  required
                  maxLength={FIELD_LIMITS.rut + 4}
                  className={inputClass}
                />
              </Field>
              <Field
                id="businessName"
                label="Razón social"
                error={err("invoice.businessName")}
              >
                <input
                  id="businessName"
                  name="businessName"
                  autoComplete="organization"
                  required
                  maxLength={FIELD_LIMITS.businessName}
                  className={inputClass}
                />
              </Field>
              <Field
                id="businessActivity"
                label="Giro"
                error={err("invoice.businessActivity")}
              >
                <input
                  id="businessActivity"
                  name="businessActivity"
                  autoComplete="off"
                  required
                  maxLength={FIELD_LIMITS.businessActivity}
                  className={inputClass}
                />
              </Field>
            </>
          ) : null}
        </fieldset>
      ) : null}

      <Field
        id="note"
        label="Nota para la tienda (opcional)"
        error={err("contact.note")}
      >
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={FIELD_LIMITS.note}
          className={inputClass}
        />
      </Field>

      {options.showPrices ? (
        <dl className="flex flex-col gap-1 border-t border-border pt-4">
          <div className="flex justify-between">
            <dt>Productos</dt>
            <dd>{formatClp(subtotalClp)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Despacho</dt>
            <dd>
              {delivery.kind === "pickup"
                ? "Retiro"
                : shipping === 0
                  ? "Gratis"
                  : formatClp(shipping)}
            </dd>
          </div>
          <div className="flex justify-between text-h3 font-bold">
            <dt>Total</dt>
            <dd data-testid="checkout-total">{formatClp(total)}</dd>
          </div>
          <p className="text-small">
            La tienda confirma el valor final de tu pedido.
          </p>
        </dl>
      ) : null}

      <TurnstileWidget
        siteKey={options.siteKey}
        onToken={setToken}
        handleRef={widget}
      />

      {formError ? (
        <p role="alert" className="rounded-md bg-danger-50 p-3 text-danger-700">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-touch w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-body font-semibold text-on-primary hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
