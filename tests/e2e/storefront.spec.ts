import { type APIRequestContext, expect, test } from "@playwright/test";

/**
 * Storefront by host (VIT-181, ADR-0003, threat model tenancy). The viewport comes from the
 * project: 375 px first, then desktop. Hosts under *.localhost resolve to loopback in Chromium.
 * Fixtures: Kanuwiñ (kanuwin.localhost), a second store (otra.localhost, one product that only
 * exists there) and an unverified host of Kanuwiñ (sinverificar.localhost); see second-store.sql.
 */
const PORT = 3100;

/** Node's resolver does not know *.localhost: connect to loopback and send the Host header. */
function get(
  request: APIRequestContext,
  host: string,
  path = "/",
  headers: Record<string, string> = {},
) {
  return request.get(`http://127.0.0.1:${PORT}${path}`, {
    headers: { ...headers, host: `${host}:${PORT}` },
    maxRedirects: 0,
  });
}

test("a verified host shows its store home with products", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/Kanuwiñ/);
  await expect(
    page.getByRole("link", { name: /Mezcla Loros Grandes/ }).first(),
  ).toBeVisible();
  // Mobile first: nothing pushes the page wider than the viewport.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a product page shows the detail of a product of that store", async ({
  page,
}) => {
  const response = await page.goto("/p/mezcla-loros-grandes");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Mezcla Loros Grandes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Agregar al carrito" }),
  ).toBeVisible();
});

test("a product that does not exist is a 404", async ({ page }) => {
  const response = await page.goto("/p/no-existe");
  expect(response?.status()).toBe(404);
});

test("a product of another store is a 404 on this host (cross-store)", async ({
  page,
}) => {
  const response = await page.goto("/p/solo-otra-tienda");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Producto de otra tienda")).toHaveCount(0);
});

test("unknown and unverified hosts answer the same uniform 404 on every route", async ({
  request,
}) => {
  const signatures = new Map<string, Set<string>>();
  for (const host of ["desconocida.localhost", "sinverificar.localhost"]) {
    for (const path of ["/", "/p/mezcla-loros-grandes", "/carrito"]) {
      const response = await get(request, host, path);
      expect(response.status(), `${host}${path}`).toBe(404);
      expect(await response.text()).not.toContain("Mezcla Loros Grandes");
      const seen = signatures.get(path) ?? new Set<string>();
      seen.add(`${response.status()} ${response.headers()["content-type"]}`);
      signatures.set(path, seen);
    }
  }
  // Unknown and unverified look the same: the host's existence is not revealed.
  for (const seen of signatures.values()) expect(seen.size).toBe(1);
});

test("a store without a published config does not leak its catalog", async ({
  request,
}) => {
  for (const path of ["/", "/p/solo-otra-tienda"]) {
    const response = await get(request, "otra.localhost", path);
    expect(response.status(), path).toBe(404);
    expect(await response.text()).not.toContain("Producto de otra tienda");
  }
});

test("the internal storefront segment is not reachable by path", async ({
  request,
}) => {
  for (const host of ["kanuwin.localhost", "otra.localhost", "localhost"]) {
    const response = await get(request, host, "/s/kanuwin.localhost");
    expect(response.status(), host).toBe(404);
  }
});

test("a forged routing header does not pick the store", async ({ request }) => {
  const response = await get(request, "desconocida.localhost", "/", {
    "x-store-id": "0199d0a0-0000-7000-8000-00000000c0de",
  });
  expect(response.status()).toBe(404);
});

test("the portal host still serves the portal, not a store", async ({
  request,
}) => {
  const response = await get(request, "localhost");
  expect(response.status()).toBe(200);
  expect(await response.text()).not.toContain("Mezcla Loros Grandes");
});
