"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type Cart, parseCart } from "../../domain/cart";

/**
 * Cart persistence in localStorage. Storage is per origin, and every store
 * has its own host, so carts never mix between stores. Unavailable storage
 * (private mode, blocked) degrades to an in-memory cart for the page.
 */
const KEY = "vitrinia:cart:v1";
const EVENT = "vitrinia:cart";
const EMPTY: Cart = [];

let memory: Cart = EMPTY;
let cachedRaw: string | null | undefined;
let cachedCart: Cart = EMPTY;

function read(): Cart {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return memory;
  }
  if (raw === cachedRaw) return cachedCart;
  cachedRaw = raw;
  try {
    cachedCart = raw ? parseCart(JSON.parse(raw)) : EMPTY;
  } catch {
    cachedCart = EMPTY;
  }
  return cachedCart;
}

function write(cart: Cart): void {
  memory = cart;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // Storage full or blocked: keep the in-memory cart.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCart(): readonly [
  Cart,
  (update: (cart: Cart) => Cart) => void,
] {
  const cart = useSyncExternalStore(subscribe, read, () => EMPTY);
  const update = useCallback(
    (fn: (cart: Cart) => Cart) => write(fn(read())),
    [],
  );
  return [cart, update] as const;
}

/** Actions without subscribing to the cart (no re-render when it changes). */
export function useCartActions(): { readonly clear: () => void } {
  const clear = useCallback(() => write(EMPTY), []);
  return { clear };
}
