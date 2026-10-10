import { ordersDeps } from "@/infra/container";
import { createPlaceOrderHandler } from "@/modules/orders/presentation";

const handler = createPlaceOrderHandler(ordersDeps);

export async function POST(request: Request) {
  return handler(request);
}
