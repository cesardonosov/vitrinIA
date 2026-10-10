import Image from "next/image";
import type { Product } from "@/modules/catalog/application";
import { AddToCart } from "../cart/add-to-cart";
import { formatMoney, whatsappHref } from "../format";

export interface ProductDetailProps {
  readonly product: Product;
  readonly categoryName?: string;
  readonly showPrice: boolean;
  readonly whatsappDigits?: string;
}

/** Product page body: formats, add to cart, details. */
export function ProductDetail({
  product,
  categoryName,
  showPrice,
  whatsappDigits,
}: ProductDetailProps) {
  const variantsText = product.variants
    .map((v) => (showPrice ? `${v.label} (${formatMoney(v.price)})` : v.label))
    .join(", ");
  return (
    <article className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:gap-10">
        <figure className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface">
            {product.image ? (
              <Image
                src={product.image.src}
                alt={product.image.alt}
                fill
                priority
                sizes="(min-width: 48rem) 40vw, 100vw"
                className="object-contain p-6"
              />
            ) : null}
          </div>
          {product.image?.provisional ? (
            <figcaption className="mt-2 text-small">
              Imagen referencial
            </figcaption>
          ) : null}
        </figure>

        <div className="flex flex-col gap-5">
          <div>
            <nav aria-label="Ruta" className="mb-3 text-small">
              <a href="/" className="underline underline-offset-4">
                Inicio
              </a>
              {categoryName ? <span aria-hidden> / </span> : null}
              {categoryName ? <span>{categoryName}</span> : null}
            </nav>
            {product.badge ? (
              <p className="mb-2 inline-block rounded-full bg-primary px-2.5 py-1 text-small font-semibold text-on-primary">
                {product.badge}
              </p>
            ) : null}
            <h1 className="font-display text-h1 font-bold break-words">
              {product.name}
            </h1>
            <p className="mt-3 text-body">{product.shortDescription}</p>
          </div>

          <AddToCart
            variants={product.variants.map((v) => ({
              id: v.id,
              label: v.label,
              ...(showPrice ? { priceText: formatMoney(v.price) } : {}),
            }))}
          />

          {whatsappDigits ? (
            <a
              href={whatsappHref(
                whatsappDigits,
                `Hola, tengo una consulta sobre ${product.name} (${variantsText}).`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="-mt-2 inline-flex min-h-touch items-center justify-center gap-1 underline underline-offset-4"
            >
              ¿Dudas? Pregúntanos por WhatsApp
              <span className="sr-only"> (abre WhatsApp)</span>
            </a>
          ) : null}

          {product.audience ? (
            <section aria-labelledby="para-quien">
              <h2 id="para-quien" className="mb-1 text-body font-semibold">
                Para quién es
              </h2>
              <p>{product.audience}</p>
            </section>
          ) : null}

          {product.highlights.length > 0 ? (
            <section aria-labelledby="destacados">
              <h2 id="destacados" className="mb-2 text-body font-semibold">
                Lo que tiene
              </h2>
              <ul className="space-y-2">
                {product.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span
                      className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.nutrition.length > 0 ? (
            <section aria-labelledby="nutricion">
              <h2 id="nutricion" className="mb-2 text-body font-semibold">
                Información nutricional
                {product.nutritionPer ? ` (por ${product.nutritionPer})` : ""}
              </h2>
              <table className="w-full text-left">
                <tbody className="divide-y divide-border">
                  {product.nutrition.map((n) => (
                    <tr key={n.label}>
                      <th scope="row" className="py-2 font-normal">
                        {n.label}
                      </th>
                      <td className="py-2 text-right font-semibold">
                        {n.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}
