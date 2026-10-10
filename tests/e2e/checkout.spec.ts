import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

/**
 * Cart -> order -> WhatsApp on the Kanuwiñ demo store (VIT-186, threat model orders O16, O17,
 * O19, O20). The viewport comes from the project: 375 px first, then desktop.
 */

/** wa.me path of the seeded store: its WhatsApp number (KANUWIN_WHATSAPP) as digits. */
const SELLER_DIGITS = (
  JSON.parse(
    readFileSync(
      "src/modules/catalog/infrastructure/seed/kanuwin.json",
      "utf8",
    ),
  ) as { contact: { whatsapp: string } }
).contact.whatsapp.replace(/\D/g, "");

const SENTINELS = [
  "comprador-centinela@ejemplo.cl",
  "+56900000000",
  "Calle Centinela 123",
];

async function stubTurnstile(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `let cb = () => {};
      window.turnstile = {
        render(el, o) { el.textContent = "ok"; cb = o.callback; queueMicrotask(() => cb("XXXX.DUMMY.TOKEN.XXXX")); return "w1"; },
        // A token works once: hand out a new one after a reset, like the real widget does.
        reset() { queueMicrotask(() => cb("XXXX.DUMMY.TOKEN.XXXX")); },
        remove() {},
      };`,
    }),
  );
}

async function addProduct(page: Page) {
  await page.goto("/p/mezcla-loros-grandes");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.goto("/carrito");
}

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
});

test("cart to WhatsApp: the server prices the order and opens the seller's wa.me", async ({
  page,
}) => {
  let waUrl = "";
  await page.route("https://wa.me/**", (route) => {
    waUrl = route.request().url();
    return route.fulfill({
      contentType: "text/html",
      body: "<h1>WhatsApp</h1>",
    });
  });

  await addProduct(page);
  // Tampering with the cart price in storage changes nothing: it only holds ids and quantities.
  await page.evaluate(() => {
    const key = "vitrinia:cart:v1";
    const cart = JSON.parse(localStorage.getItem(key) ?? "[]");
    for (const line of cart) line.price = 1;
    localStorage.setItem(key, JSON.stringify(cart));
  });
  await page.reload();

  // No horizontal scroll at the tested width.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);

  await page.getByLabel("Nombre").fill("Comprador Centinela");
  await page.getByLabel("Teléfono (WhatsApp)").fill("+56900000000");
  await page
    .getByLabel("Correo (opcional)")
    .fill("comprador-centinela@ejemplo.cl");
  await page
    .getByLabel("Región", { exact: true })
    .selectOption({ label: "Región Metropolitana de Santiago" });
  await page.getByLabel("Comuna").fill("Ñuñoa");
  await page.getByLabel("Calle y número").fill("Calle Centinela 123");

  const request = page.waitForResponse((r) => r.url().endsWith("/api/orders"));
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  const response = await request;
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");

  await expect(
    page.getByRole("heading", { name: "Pedido listo" }),
  ).toBeVisible();
  await expect(page.getByTestId("order-code")).toHaveText(/^[A-Z2-9]{7}$/);
  await expect(page.getByText("Cómo pagar")).toBeVisible();

  // O16: the cart is emptied and no buyer data sits in browser storage.
  const storage = await page.evaluate(() =>
    JSON.stringify([{ ...localStorage }, { ...sessionStorage }]),
  );
  expect(
    JSON.parse(
      await page.evaluate(
        () => localStorage.getItem("vitrinia:cart:v1") ?? "[]",
      ),
    ),
  ).toEqual([]);
  for (const sentinel of SENTINELS) expect(storage).not.toContain(sentinel);

  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();
  await page.waitForURL("https://wa.me/**");
  const url = new URL(waUrl);
  expect(url.origin).toBe("https://wa.me");
  expect(url.pathname).toBe(`/${SELLER_DIGITS}`);
  const message = url.searchParams.get("text") ?? "";
  expect(message).toContain("Mezcla");
  expect(message).toContain("Verifica el pedido con este código.");
  expect(message).toContain("Nombre: Comprador Centinela");
});

test("a double tap on send creates one order", async ({ page }) => {
  const orders: string[] = [];
  page.on("response", async (r) => {
    if (r.url().endsWith("/api/orders") && r.status() === 200) {
      orders.push(((await r.json()) as { code: string }).code);
    }
  });
  await addProduct(page);
  await page.getByLabel("Nombre").fill("Ana Pérez");
  await page.getByLabel("Teléfono (WhatsApp)").fill("9 1234 5678");
  await page
    .getByLabel("Región", { exact: true })
    .selectOption({ label: "Región Metropolitana de Santiago" });
  await page.getByLabel("Comuna").fill("Ñuñoa");
  await page.getByLabel("Calle y número").fill("Irarrázaval 1234");
  const send = page.getByRole("button", { name: "Enviar pedido" });
  await send.dblclick();
  await expect(
    page.getByRole("heading", { name: "Pedido listo" }),
  ).toBeVisible();
  expect(new Set(orders).size).toBe(1);
});

test("a missing field shows an error and does not leave the cart", async ({
  page,
}) => {
  await addProduct(page);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeVisible();
});
