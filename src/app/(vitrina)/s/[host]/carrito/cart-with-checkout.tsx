"use client";

import { useState } from "react";
import {
  type CheckoutOptions,
  CheckoutPanel,
  OrderConfirmation,
  type PlacedOrderView,
} from "@/modules/orders/presentation/client";
import {
  CartView,
  type CartViewProps,
  useCartActions,
} from "@/modules/storefront/presentation/client";

/**
 * Wires the cart and the checkout, which live in different modules. After a successful
 * order the cart is emptied (O16) and the confirmation takes the screen, so the payment
 * methods stay visible; there is no page that can show the order again (O18).
 */
export function CartWithCheckout({
  checkout,
  ...cart
}: CartViewProps & { readonly checkout: CheckoutOptions }) {
  const [placed, setPlaced] = useState<PlacedOrderView | null>(null);
  const { clear } = useCartActions();
  if (placed) {
    return (
      <OrderConfirmation placed={placed} showPrices={checkout.showPrices} />
    );
  }
  return (
    <CartView
      {...cart}
      renderCheckout={({ lines, subtotalClp }) => (
        <CheckoutPanel
          lines={lines}
          subtotalClp={subtotalClp}
          options={checkout}
          onPlaced={(order) => {
            clear();
            setPlaced(order);
          }}
        />
      )}
    />
  );
}
