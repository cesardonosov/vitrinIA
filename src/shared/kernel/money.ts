import { type DomainError, domainError } from "./errors";
import { Result } from "./result";

/**
 * Money: an exact integer amount in a currency's minor unit (VITRINIA.md §7).
 *
 * - Never a float. `amount` is a safe integer; CLP has no minor unit, so 1990 means $1.990.
 * - Never throws for business failures: construction and arithmetic return `Result`.
 * - Immutable: every operation returns a new frozen instance.
 * - `-0` is normalised to `0` on every construction.
 * - Sign is allowed (refunds, discounts, ledger lines). Module value objects such as a
 *   product `Price` add the "non-negative" rule on top.
 */

export const CURRENCIES = Object.freeze({
  CLP: Object.freeze({ minorUnits: 0 }),
});

export type Currency = keyof typeof CURRENCIES;

export type InvalidMoney = DomainError<"InvalidMoney"> & {
  readonly reason: "NotAnInteger" | "OutOfRange" | "UnknownCurrency";
};

export type CurrencyMismatch = DomainError<"CurrencyMismatch"> & {
  readonly expected: Currency;
  readonly actual: string;
};

export type MoneyError = InvalidMoney | CurrencyMismatch;

function invalidMoney(
  reason: InvalidMoney["reason"],
  message: string,
): InvalidMoney {
  return Object.freeze({ ...domainError("InvalidMoney", message), reason });
}

function currencyMismatch(
  expected: Currency,
  actual: string,
): CurrencyMismatch {
  return Object.freeze({
    ...domainError(
      "CurrencyMismatch",
      `Expected ${expected} but got ${actual}`,
    ),
    expected,
    actual,
  });
}

function isCurrency(value: string): value is Currency {
  return Object.hasOwn(CURRENCIES, value);
}

function checkAmount(amount: number): Result<number, InvalidMoney> {
  if (!Number.isInteger(amount)) {
    return Result.err(
      invalidMoney("NotAnInteger", "Money amount must be an integer"),
    );
  }
  if (!Number.isSafeInteger(amount)) {
    return Result.err(
      invalidMoney(
        "OutOfRange",
        "Money amount is outside the safe integer range",
      ),
    );
  }
  // `-0` is an integer too; normalise so Object.is, JSON and toString never see it.
  return Result.ok(amount === 0 ? 0 : amount);
}

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {
    Object.freeze(this);
  }

  /** Validates an amount and currency coming from any boundary (DB row, form, JSON). */
  static of(amount: number, currency: string): Result<Money, InvalidMoney> {
    if (!isCurrency(currency)) {
      return Result.err(
        invalidMoney("UnknownCurrency", "Unsupported currency"),
      );
    }
    return Result.map(
      checkAmount(amount),
      (checked) => new Money(checked, currency),
    );
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  static isCurrency(value: string): value is Currency {
    return isCurrency(value);
  }

  add(other: Money): Result<Money, MoneyError> {
    return this.combine(other, (a, b) => a + b);
  }

  subtract(other: Money): Result<Money, MoneyError> {
    return this.combine(other, (a, b) => a - b);
  }

  /** Multiplies by an integer factor (for example a cart quantity). */
  multiply(factor: number): Result<Money, InvalidMoney> {
    if (!Number.isInteger(factor)) {
      return Result.err(
        invalidMoney("NotAnInteger", "Money factor must be an integer"),
      );
    }
    return Result.map(
      checkAmount(this.amount * factor),
      (checked) => new Money(checked, this.currency),
    );
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isNegative(): boolean {
    return this.amount < 0;
  }

  toJSON(): { readonly amount: number; readonly currency: Currency } {
    return { amount: this.amount, currency: this.currency };
  }

  toString(): string {
    return `${this.amount} ${this.currency}`;
  }

  private combine(
    other: Money,
    op: (a: number, b: number) => number,
  ): Result<Money, MoneyError> {
    if (other.currency !== this.currency) {
      return Result.err(currencyMismatch(this.currency, other.currency));
    }
    return Result.map(
      checkAmount(op(this.amount, other.amount)),
      (checked) => new Money(checked, this.currency),
    );
  }
}
