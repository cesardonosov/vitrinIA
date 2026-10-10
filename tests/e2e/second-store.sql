-- E2E fixtures (VIT-181): a second store with its own product, and an unverified host for the
-- Kanuwiñ store. Runs as app_user like the demo seed, idempotent, test database only.
\set ON_ERROR_STOP on

BEGIN;
SELECT set_config('app.store_id', '0199d0a0-0000-7000-8000-00000000e2e1', true) AS tenant \gset
INSERT INTO stores (id, slug, name)
VALUES ('0199d0a0-0000-7000-8000-00000000e2e1', 'otra', 'Otra tienda')
ON CONFLICT (id) DO NOTHING;
INSERT INTO domains (id, store_id, host, verified_at)
VALUES ('0199d0a0-0000-7000-8000-0000000e2e01', '0199d0a0-0000-7000-8000-00000000e2e1', 'otra.localhost', now())
ON CONFLICT (host) DO NOTHING;
INSERT INTO categories (id, store_id, name, position)
VALUES ('0199d0a0-0000-7000-8000-0000000e2c01', '0199d0a0-0000-7000-8000-00000000e2e1', 'Otra categoria', 0)
ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, store_id, category_id, slug, name, position, published, short_description)
VALUES ('0199d0a0-0000-7000-8000-0000000e2d01', '0199d0a0-0000-7000-8000-00000000e2e1', '0199d0a0-0000-7000-8000-0000000e2c01', 'solo-otra-tienda', 'Producto de otra tienda', 0, true, 'Solo existe en la otra tienda.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO store_configs (id, store_id, revision, schema_version, config)
VALUES ('0199d0a0-0000-7000-8000-0000000e2f01', '0199d0a0-0000-7000-8000-00000000e2e1', 1, 1, '{"schemaVersion":1,"identity":{"name":"Otra tienda","tagline":"Tagline propio de otra tienda"},"theme":{"colors":{"primary":"#2a6f4f","background":"#ffffff","text":"#111111","onPrimary":"#ffffff","accent":"#c0392b"},"font":"system-sans","radius":"md"},"contact":{"whatsapp":"+56911112222"},"pages":{"home":{"sections":[{"type":"hero","props":{"title":"Bienvenido a Otra tienda","subtitle":"Contenido propio de la segunda tienda"}},{"type":"product-grid","props":{"title":"Catalogo de Otra","source":"all","limit":8}}]}},"features":{"showPrices":true,"showStock":false,"whatsappCheckout":true,"paymentLinkCheckout":false,"search":true}}'::jsonb)
ON CONFLICT (store_id, revision) DO NOTHING;
-- The storefront only lists published products with at least one variant.
INSERT INTO product_variants (id, store_id, product_id, label, price_clp, position)
VALUES ('0199d0a0-0000-7000-8000-0000000e2a01', '0199d0a0-0000-7000-8000-00000000e2e1', '0199d0a0-0000-7000-8000-0000000e2d01', '1 kg', 5000, 0)
ON CONFLICT (id) DO NOTHING;
COMMIT;

BEGIN;
SELECT set_config('app.store_id', '0199d0a0-0000-7000-8000-00000000c0de', true) AS tenant \gset
-- Same store as Kanuwiñ, but never verified: it must not resolve.
INSERT INTO domains (id, store_id, host, verified_at)
VALUES ('0199d0a0-0000-7000-8000-0000000e2e02', '0199d0a0-0000-7000-8000-00000000c0de', 'sinverificar.localhost', NULL)
ON CONFLICT (host) DO NOTHING;
COMMIT;
