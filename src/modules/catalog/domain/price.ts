import { type DomainError, domainError, Money, Result } from "@/shared/kernel";

export type InvalidPrice = DomainError<"InvalidPrice">;

/** A selling price: valid `Money` and strictly positive (a free product is not sold here). */
export function createPrice(
  amount: number,
  currency: string,
): Result<Money, InvalidPrice> {
  const money = Money.of(amount, currency);
  if (Result.isErr(money) || money.value.amount <= 0) {
    return Result.err(
      domainError("InvalidPrice", "Price must be a positive integer amount"),
    );
  }
  return money;
}

/** Lowest variant price: what the card shows as "Desde". */
export function lowestPrice(prices: ReadonlyArray<Money>): Money | undefined {
  let lowest: Money | undefined;
  for (const price of prices) {
    if (lowest === undefined || price.amount < lowest.amount) lowest = price;
  }
  return lowest;
}
