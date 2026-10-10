import { ordersDeps, trustedProxy } from "@/infra/container";
import { createPlaceOrderHandler } from "@/modules/orders/presentation";

const handler = createPlaceOrderHandler(ordersDeps, { trustedProxy });

export async function POST(request: Request) {
  return handler(request);
}
