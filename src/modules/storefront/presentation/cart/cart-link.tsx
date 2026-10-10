"use client";

import { cartCount } from "../../domain/cart";
import { useCart } from "./use-cart";

export function CartLink() {
  const [cart] = useCart();
  const count = cartCount(cart);
  return (
    <a
      href="/carrito"
      className="relative ml-auto inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md px-2"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span className="sr-only">Carrito,</span>
      {count > 0 ? (
        <span className="rounded-full bg-primary px-2 text-small font-bold text-on-primary">
          {count}
        </span>
      ) : (
        <span className="sr-only">vacío</span>
      )}
    </a>
  );
}
