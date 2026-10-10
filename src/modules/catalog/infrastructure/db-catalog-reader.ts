import { and, asc, eq } from "drizzle-orm";
import type { WithStoreTx } from "@/infra/db/with-store-tx";
import { Result } from "@/shared/kernel";
import type {
  Catalog,
  Category,
  NutritionFact,
  Product,
  Variant,
} from "../application";
import { createPrice } from "../application";
import type { CatalogReader } from "../application/ports/catalog-reader";
import { categories, products, productVariants } from "./schema";

/**
 * Database catalog adapter (VIT-183). Reads inside `withStoreTx`, so RLS only
 * shows the rows of `storeId`; the explicit `store_id` filter is a second fence
 * and lets Postgres use the `(store_id, ...)` indexes.
 *
 * Only published products with at least one variant reach the storefront.
 */
export function createDbCatalogReader(withStoreTx: WithStoreTx): CatalogReader {
  return {
    getCatalog: (storeId) =>
      withStoreTx(storeId, async (tx) => {
        const categoryRows = await tx
          .select()
          .from(categories)
          .where(eq(categories.storeId, storeId))
          .orderBy(asc(categories.position), asc(categories.name));
        const productRows = await tx
          .select()
          .from(products)
          .where(
            and(eq(products.storeId, storeId), eq(products.published, true)),
          )
          .orderBy(asc(products.position), asc(products.slug));
        const variantRows = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.storeId, storeId))
          .orderBy(asc(productVariants.position), asc(productVariants.label));

        const variantsByProduct = new Map<string, Variant[]>();
        for (const row of variantRows) {
          const price = createPrice(row.priceClp, "CLP");
          // The CHECK on price_clp makes this unreachable; never show a bad price.
          if (Result.isErr(price)) continue;
          const list = variantsByProduct.get(row.productId) ?? [];
          list.push({ id: row.id, label: row.label, price: price.value });
          variantsByProduct.set(row.productId, list);
        }

        const categoryList: Category[] = categoryRows.map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
        }));

        const productList: Product[] = [];
        for (const p of productRows) {
          const variants = variantsByProduct.get(p.id);
          if (!variants || variants.length === 0) continue;
          productList.push({
            id: p.id,
            slug: p.slug,
            name: p.name,
            categoryId: p.categoryId,
            position: p.position,
            featured: p.featured,
            shortDescription: p.shortDescription,
            ...(p.badge ? { badge: p.badge } : {}),
            ...(p.audience ? { audience: p.audience } : {}),
            highlights: p.highlights,
            ...(p.nutritionPer ? { nutritionPer: p.nutritionPer } : {}),
            nutrition: nutritionFacts(p.nutrition),
            variants,
            ...(p.imageSrc && p.imageAlt && p.imageWidth && p.imageHeight
              ? {
                  image: {
                    src: p.imageSrc,
                    alt: p.imageAlt,
                    width: p.imageWidth,
                    height: p.imageHeight,
                    provisional: p.imageProvisional,
                  },
                }
              : {}),
          });
        }

        const catalog: Catalog = {
          categories: categoryList,
          products: productList,
        };
        return catalog;
      }),
  };
}

/** Keeps only well-formed `{label, value}` string pairs from the jsonb column. */
function nutritionFacts(value: unknown): NutritionFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    typeof item === "object" &&
    item !== null &&
    typeof item.label === "string" &&
    typeof item.value === "string"
      ? [{ label: item.label, value: item.value }]
      : [],
  );
}
