import { Result, type StoreId } from "@/shared/kernel";
import type {
  Catalog,
  NutritionFact,
  Product,
  ProductImage,
  Variant,
} from "../../application";
import { createPrice, EMPTY_CATALOG } from "../../application";
import type { CatalogReader } from "../../application/ports/catalog-reader";

/**
 * Seed catalog adapter (VIT-179): serves catalogs from versioned JSON files
 * until the catalog tables exist (VIT-183). Read-only and keyed by `StoreId`,
 * so it honours the same contract as the database adapter.
 */

interface SeedVariant {
  readonly label: string;
  readonly priceClp: number;
  readonly currency: string;
}

interface SeedNutrition {
  readonly per?: string;
  readonly proteinG?: number;
  readonly fatG?: number;
  readonly kcal?: number;
  readonly proteinPercentTenebrio?: number;
  readonly proteinPercentLarva?: number;
}

interface SeedProduct {
  readonly slug: string;
  readonly name: string;
  readonly category: string;
  readonly featured?: boolean;
  readonly shortDescription: string;
  readonly species?: string;
  readonly bullets?: ReadonlyArray<string>;
  readonly nutrition?: SeedNutrition;
  readonly variants: ReadonlyArray<SeedVariant>;
  readonly image?: { readonly file: string; readonly provisional?: boolean };
  readonly badge?: string;
}

export interface SeedCatalogFile {
  readonly categories: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly position: number;
  }>;
  readonly products: ReadonlyArray<SeedProduct>;
}

export interface SeedImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

const decimal = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });

function nutritionFacts(n: SeedNutrition | undefined): NutritionFact[] {
  if (!n) return [];
  const facts: NutritionFact[] = [];
  if (n.proteinG !== undefined)
    facts.push({ label: "Proteína", value: `${decimal.format(n.proteinG)} g` });
  if (n.fatG !== undefined)
    facts.push({ label: "Grasa", value: `${decimal.format(n.fatG)} g` });
  if (n.kcal !== undefined)
    facts.push({ label: "Energía", value: `${decimal.format(n.kcal)} kcal` });
  if (n.proteinPercentTenebrio !== undefined)
    facts.push({
      label: "Proteína del tenebrio",
      value: `${n.proteinPercentTenebrio}%`,
    });
  if (n.proteinPercentLarva !== undefined)
    facts.push({
      label: "Proteína de la larva",
      value: `${n.proteinPercentLarva}%`,
    });
  return facts;
}

/**
 * Turns a seed file into a `Catalog`. Throws on invalid data: a broken seed is
 * a programming error caught by its test, never a runtime condition.
 */
export function parseSeedCatalog(
  file: SeedCatalogFile,
  images: Readonly<Record<string, SeedImage>>,
): Catalog {
  const categoryIds = new Set(file.categories.map((c) => c.id));
  const products: Product[] = file.products.map((p, position) => {
    if (!categoryIds.has(p.category)) {
      throw new Error(`Seed product ${p.slug} has an unknown category`);
    }
    if (p.variants.length === 0) {
      throw new Error(`Seed product ${p.slug} has no variants`);
    }
    const variants: Variant[] = p.variants.map((v, i) => {
      const price = createPrice(v.priceClp, v.currency);
      if (Result.isErr(price)) {
        throw new Error(`Seed product ${p.slug} has an invalid price`);
      }
      return { id: `${p.slug}--${i + 1}`, label: v.label, price: price.value };
    });
    let image: ProductImage | undefined;
    if (p.image) {
      const asset = images[p.image.file];
      if (!asset) throw new Error(`Seed image ${p.image.file} is missing`);
      image = {
        ...asset,
        alt: p.image.provisional
          ? `${p.name} (imagen referencial)`
          : `Bolsa de ${p.name}`,
        provisional: p.image.provisional === true,
      };
    }
    return {
      id: p.slug,
      slug: p.slug,
      name: p.name,
      categoryId: p.category,
      position,
      featured: p.featured === true,
      shortDescription: p.shortDescription,
      ...(p.badge ? { badge: p.badge } : {}),
      ...(p.species ? { audience: p.species } : {}),
      highlights: p.bullets ?? [],
      ...(p.nutrition?.per ? { nutritionPer: p.nutrition.per } : {}),
      nutrition: nutritionFacts(p.nutrition),
      variants,
      ...(image ? { image } : {}),
    };
  });
  return deepFreezeCatalog({
    categories: [...file.categories].sort((a, b) => a.position - b.position),
    products,
  });
}

function deepFreezeCatalog(catalog: Catalog): Catalog {
  for (const product of catalog.products) {
    Object.freeze(product.highlights);
    Object.freeze(product.nutrition);
    Object.freeze(product.variants);
    for (const v of product.variants) Object.freeze(v);
    if (product.image) Object.freeze(product.image);
    Object.freeze(product);
  }
  Object.freeze(catalog.products);
  for (const c of catalog.categories) Object.freeze(c);
  Object.freeze(catalog.categories);
  return Object.freeze(catalog);
}

export function createSeedCatalogReader(
  catalogs: ReadonlyMap<StoreId, Catalog>,
): CatalogReader {
  return {
    async getCatalog(storeId) {
      return catalogs.get(storeId) ?? EMPTY_CATALOG;
    },
  };
}
