import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { storefrontDeps } from "@/infra/container";
import { loadStorefront } from "@/modules/storefront/application";
import { StorefrontHome } from "@/modules/storefront/presentation";

interface Params {
  readonly params: Promise<{ host: string }>;
}

async function load({ params }: Params) {
  const { host } = await params;
  return loadStorefront(storefrontDeps, (await headers()).get("host"), host);
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const storefront = await load(props);
  if (!storefront) return {};
  const { identity } = storefront.config;
  return { title: identity.name, description: identity.tagline };
}

export default async function StorefrontHomePage(props: Params) {
  const storefront = await load(props);
  if (!storefront) notFound();
  return (
    <StorefrontHome config={storefront.config} catalog={storefront.catalog} />
  );
}
