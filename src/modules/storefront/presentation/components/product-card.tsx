import Image from "next/image";
import { lowestPrice, type Product } from "@/modules/catalog/application";
import { formatMoney, productHref } from "../format";

export interface ProductCardProps {
  readonly product: Product;
  readonly showPrice: boolean;
  /** Above the fold: loads eagerly (LCP). */
  readonly priority?: boolean;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function ProductCard({
  product,
  showPrice,
  priority,
}: ProductCardProps) {
  const from = lowestPrice(product.variants.map((v) => v.price));
  const several = product.variants.length > 1;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border">
      <div className="relative aspect-[4/5] bg-surface">
        {product.image ? (
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(min-width: 64rem) 22rem, (min-width: 48rem) 33vw, 50vw"
            className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <span
            className="absolute inset-0 grid place-items-center font-display text-h2 font-bold"
            aria-hidden
          >
            {initials(product.name)}
          </span>
        )}
        {product.badge ? (
          <span className="absolute top-2 left-2 rounded-full bg-primary px-2.5 py-1 text-small font-semibold text-on-primary">
            {product.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-body font-semibold break-words line-clamp-2">
          {/* The whole card is the link target; the stretched ::after keeps one tab stop per product. */}
          <a
            href={productHref(product.slug)}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {product.name}
          </a>
        </h3>
        <p className="text-small">
          {product.variants.map((v) => v.label).join(" · ")}
        </p>
        {showPrice && from ? (
          <p className="mt-auto pt-1 text-body font-bold">
            {several ? (
              <span className="text-small font-normal">Desde </span>
            ) : null}
            {formatMoney(from)}
          </p>
        ) : null}
      </div>
    </article>
  );
}
