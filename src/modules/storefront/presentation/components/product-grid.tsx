import type { Product } from "@/modules/catalog/application";
import { ProductCard } from "./product-card";

export interface ProductGridProps {
  readonly title?: string;
  readonly products: ReadonlyArray<Product>;
  readonly showPrice: boolean;
  /** Marks the first cards as priority images (first grid on the page). */
  readonly eager?: boolean;
}

export function ProductGrid({
  title,
  products,
  showPrice,
  eager,
}: ProductGridProps) {
  if (products.length === 0) return null;
  return (
    <section className="px-4 py-6 md:px-8" aria-label={title ?? "Productos"}>
      <div className="mx-auto max-w-5xl">
        {title ? (
          <h2 className="mb-4 font-display text-h2 font-bold break-words">
            {title}
          </h2>
        ) : null}
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {products.map((product, i) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                showPrice={showPrice}
                priority={eager && i < 2}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
