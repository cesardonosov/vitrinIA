import type { WithStoreTx } from "@/infra/db/with-store-tx";
import { uuidv7 } from "@/infra/uuid-v7";
import type { StoreId } from "@/shared/kernel";
import type { Catalog } from "../application";
import { categories, products, productVariants } from "./schema";

/**
 * Loads a whole catalog into an empty store (VIT-183): the demo seed and the
 * adapter tests use it. It is not the seller's editing flow (that comes with
 * the store panel). New UUID v7 ids are generated; the ids in `catalog` only
 * link products to their category.
 *
 * Runs in one `withStoreTx`, so every row gets this store's id from RLS's
 * point of view and a failure leaves nothing behind.
 */
export async function insertCatalog(
  withStoreTx: WithStoreTx,
  storeId: StoreId,
  catalog: Catalog,
  options: { readonly published?: boolean } = {},
): Promise<void> {
  await withStoreTx(storeId, async (tx) => {
    const categoryIds = new Map<string, string>();
    for (const c of catalog.categories) {
      const id = uuidv7();
      categoryIds.set(c.id, id);
      await tx
        .insert(categories)
        .values({ id, storeId, name: c.name, position: c.position });
    }
    for (const p of catalog.products) {
      const categoryId = categoryIds.get(p.categoryId);
      if (!categoryId) {
        throw new Error(`product ${p.slug} has an unknown category`);
      }
      const productId = uuidv7();
      await tx.insert(products).values({
        id: productId,
        storeId,
        categoryId,
        slug: p.slug,
        name: p.name,
        position: p.position,
        featured: p.featured,
        published: options.published ?? true,
        shortDescription: p.shortDescription,
        badge: p.badge ?? null,
        audience: p.audience ?? null,
        highlights: [...p.highlights],
        nutritionPer: p.nutritionPer ?? null,
        nutrition: p.nutrition.map((n) => ({ label: n.label, value: n.value })),
        imageSrc: p.image?.src ?? null,
        imageAlt: p.image?.alt ?? null,
        imageWidth: p.image?.width ?? null,
        imageHeight: p.image?.height ?? null,
        imageProvisional: p.image?.provisional ?? false,
      });
      for (const [position, v] of p.variants.entries()) {
        if (v.price.currency !== "CLP") {
          throw new Error(`variant of ${p.slug} is not priced in CLP`);
        }
        await tx.insert(productVariants).values({
          id: uuidv7(),
          storeId,
          productId,
          label: v.label,
          priceClp: v.price.amount,
          position,
        });
      }
    }
  });
}
