import type { Money } from "@/shared/kernel";

/**
 * Catalog domain types (VIT-179). A store sells products grouped in categories;
 * what the buyer adds to the cart is a variant (for Kanuwiñ, the bag size).
 *
 * Every text here is plain text from the seller: the storefront renders it
 * escaped and never as HTML (AGENTS.md §9).
 */

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly position: number;
}

export interface Variant {
  readonly id: string;
  /** What tells variants apart, e.g. "1,2 kg". */
  readonly label: string;
  /** Final price with VAT. Always positive (see `price.ts`). */
  readonly price: Money;
}

export interface ProductImage {
  /** Same-origin path. Becomes an `ImageStorage` reference with VIT-123. */
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  /** Stand-in until the seller uploads the real photo. */
  readonly provisional: boolean;
}

/** One line of the nutrition table, already worded for the buyer. */
export interface NutritionFact {
  readonly label: string;
  readonly value: string;
}

export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly categoryId: string;
  readonly position: number;
  readonly featured: boolean;
  readonly shortDescription: string;
  readonly badge?: string;
  /** Who the product is for (species, sizes). */
  readonly audience?: string;
  readonly highlights: ReadonlyArray<string>;
  /** Reference amount for the facts, e.g. "100 g". */
  readonly nutritionPer?: string;
  readonly nutrition: ReadonlyArray<NutritionFact>;
  /** At least one, in display order. */
  readonly variants: ReadonlyArray<Variant>;
  readonly image?: ProductImage;
}

export interface Catalog {
  readonly categories: ReadonlyArray<Category>;
  readonly products: ReadonlyArray<Product>;
}

export const EMPTY_CATALOG: Catalog = Object.freeze({
  categories: Object.freeze([]),
  products: Object.freeze([]),
});
