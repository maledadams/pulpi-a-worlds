# Pulpiña RD — Arquitectura actual

## Objetivo

Mantener una tienda multi-página con identidad fuerte y cuatro mundos visuales, usando Shopify como fuente de verdad para catálogo, variantes, inventario, carrito y checkout.

## Principio clave

- No existe admin custom.
- Shopify Admin es el único panel de administración.
- El sitio custom solo resuelve la experiencia storefront.

## Rutas

- `/` Home / Pulpiña General
- `/pulpina` Pulpiña General catálogo principal
- `/men` Pulpiña Men
- `/moon` Pulpiña Moon
- `/sunshine` Pulpiña Sunshine
- `/tienda` Shop / Search
- `/producto/:slug` Detalle de producto
- `/carrito` Cart
- `/checkout` Handoff al checkout de Shopify
- `/contacto` Contacto
- `/nosotros` About
- `/politicas` Políticas

## Datos y checkout

- Shopify Storefront API alimenta productos, precios, fotos, variantes e inventario.
- El carrito vive en Shopify y el sitio persiste solo `pulpina_cart_id` en localStorage.
- Checkout redirige a `cart.checkoutUrl`.
- Sin login, sin base de datos custom, sin checkout fake.

## UX

- Home → elegir vibra o tienda → producto → carrito → checkout.
- Filtros solo en Shop y páginas de colección.
- El diseño sigue siendo retro, vivo y legible en desktop y mobile.

## Qué no hacer

- No construir un dashboard admin custom.
- No duplicar catálogo, inventario ni órdenes fuera de Shopify.
- No mezclar una experiencia de administración con el flujo del cliente.
