"use client";

import { useId, useState } from "react";
import { addToCart } from "../../domain/cart";
import { useCart } from "./use-cart";

export interface AddToCartVariant {
  readonly id: string;
  readonly label: string;
  /** Already formatted, e.g. "$8.900"; absent when prices are hidden. */
  readonly priceText?: string;
}

export interface AddToCartProps {
  readonly variants: ReadonlyArray<AddToCartVariant>;
}

export function AddToCart({ variants }: AddToCartProps) {
  const [, update] = useCart();
  const [selected, setSelected] = useState(variants[0]?.id ?? "");
  const [added, setAdded] = useState(false);
  const name = useId();
  if (variants.length === 0) return null;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        update((cart) => addToCart(cart, selected));
        setAdded(true);
      }}
    >
      <fieldset>
        <legend className="mb-2 text-body font-semibold">
          {variants.length > 1 ? "Elige el formato" : "Formato"}
        </legend>
        <div className="divide-y divide-border rounded-lg border border-border">
          {variants.map((v) => (
            <label
              key={v.id}
              className="flex min-h-touch cursor-pointer items-center gap-3 px-4 py-2"
            >
              <input
                type="radio"
                name={name}
                value={v.id}
                checked={selected === v.id}
                onChange={() => {
                  setSelected(v.id);
                  setAdded(false);
                }}
                className="size-5 accent-primary"
              />
              <span className="flex-1">{v.label}</span>
              {v.priceText ? (
                <span className="text-h3 font-bold">{v.priceText}</span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        className="inline-flex min-h-touch w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-body font-semibold text-on-primary hover:brightness-110"
      >
        Agregar al carrito
      </button>
      <p role="status" className="min-h-6 text-center">
        {added ? (
          <>
            Agregado.{" "}
            <a
              href="/carrito"
              className="font-semibold underline underline-offset-4"
            >
              Ver carrito
            </a>
          </>
        ) : null}
      </p>
    </form>
  );
}
