
# Pulpiña RD — Reestructuración visual y de arquitectura

## Objetivo
Transformar el sitio en una tienda multi-página, retro, divertida y con personalidad (energía tipo TofuCute/Blippo, sin copiarlas), donde la home es la "vista general" neutral de Pulpiña y el usuario puede entrar a 4 mundos visuales distintos.

## Dirección visual (aplica a todo el sitio)
- Estética: retro playful e-commerce, ligeramente "busy" pero organizada, tipo tienda coleccionable de nicho.
- Sin emojis decorativos sustituyendo gráficos: usar SVG, ilustraciones, stickers reales o badges con CSS.
- Sin estética minimalista, de lujo, corporativa ni de tema Shopify por defecto.
- Elementos requeridos:
  - Botones "chunky" (gruesos, con borde marcado, sombra dura/offset).
  - Tarjetas de producto expresivas (borde marcado, etiqueta tipo sticker, hover con leve rotación o lift).
  - Etiquetas tipo sticker para badges (Nuevo, Sale, Agotado, colección).
  - Bloques de sección con color sólido alternado.
  - Contenedores redondeados, bordes decorativos.
  - Detalles gráficos pequeños alrededor de secciones (estrellas, asteriscos, formas).
  - Hover effects divertidos pero sutiles.
  - Navegación legible y clara aunque playful.
  - Grids de producto vivos: alturas consistentes, badges visibles, precios bien jerarquizados.

## Estructura no negociable

### Home = Pulpiña General (neutral)
- NO debe verse como Men, Moon ni Sunshine.
- Paleta neutral del universo Pulpiña: balanceada, colorida pero no de un solo mundo, genderless, cartoon, alternativa.
- Secciones permitidas en la home, en este orden:
  1. Hero principal con identidad Pulpiña General.
  2. Intro corta de marca (1-2 párrafos máx).
  3. Sección "Elige tu vibra" con 4 cards (General, Men, Moon, Sunshine) que enlazan a sus páginas.
  4. Productos destacados (máx 4-8).
  5. Nuevos productos / highlights (máx 4).
  6. Sección de descuento de cumpleaños / newsletter.
  7. Footer.
- NO incluir en la home: catálogo completo, todos los grids de cada colección, filtros, mockup admin, textos largos de políticas, demasiados banners.

### Popup de selección de versión
- Aparece al entrar al sitio por primera vez (persistir el "ya visto" en localStorage).
- Muestra los 3 logos: Pulpiña Sunshine, Pulpiña Men, Pulpiña Moon.
- Cada logo es clickeable y lleva a la página de ese mundo.
- Debajo, un botón/enlace de texto: "No, quiero continuar con la vista general" que cierra el popup y deja al usuario en la home (Pulpiña General).
- El popup NO reemplaza la home. La home siempre existe como Pulpiña General.
- Botón cerrar (X) también disponible.

### Páginas (rutas separadas, nada single-page)
- `/` Home / Pulpiña General
- `/pulpina` Pulpiña General catálogo principal
- `/men` Pulpiña Men
- `/moon` Pulpiña Moon
- `/sunshine` Pulpiña Sunshine
- `/tienda` Shop / Search (todos los productos, filtrable por las 4 versiones)
- `/producto/:slug` Detalle de producto
- `/carrito` Cart
- `/checkout` Handoff de checkout (placeholder branded, sin recolectar datos de pago)
- `/contacto` Contacto
- `/nosotros` About
- `/politicas` Políticas (placeholders)
- `/admin` Mockup admin claramente separado, no parte del flujo cliente

## Sistema de temas (4 modos visuales)
Crear un theme config reutilizable. Cada tema controla: colores (primary, secondary, accent, bg, card, text, button, border), fondos de sección, estilo de botones, badges, bordes, decoraciones, estilo de product card.

- Pulpiña General: paleta neutral retro cartoon, balanceada, colorida pero no extrema.
- Pulpiña Men: punk retro, negro, rojo profundo, gris carbón, blanco; texturas distressed, parches, sensación grunge streetwear.
- Pulpiña Moon: gótico retro, negro, rojo oscuro, gris, blanco; detalles antique, encaje, velas, rosas, marcos ornamentales.
- Pulpiña Sunshine: kawaii Y2K, rosa bubblegum, amarillo, lima, blanco; brillos, perlas, leopardo rosa, glossy.

Las 4 versiones deben sentirse claramente distintas pero compartir: layout, estructura de navbar, footer, product card, flujo de compra, lenguaje de mascotas.

## Navegación consistente (siempre visible)
Inicio, Tienda, Pulpiña, Men, Moon, Sunshine, Buscar, Carrito, Contacto. En mobile: drawer con los mismos items.

## Componentes reutilizables (no monolítico)
Layout, Header/Navbar, Footer, Hero, CollectionSelector, VibeChooserModal, ProductCard, ProductGrid, FilterSidebar, CartDrawer, CartPage, ProductDetail, ThemeProvider/theme config, mock product data, cart context.

## Datos y carrito
- Mock data por ahora. Estructura preparada para cambiar a Shopify Storefront API después.
- Carrito en localStorage (cantidad, agregar, quitar, actualizar). Más adelante se guardará el `pulpina_cart_id` de Shopify.
- Sin login, sin base de datos custom, sin recolección de datos de pago.
- Checkout = página branded de handoff que en el futuro redirige a `cart.checkoutUrl` de Shopify.

## Reglas de UX
- Flujo claro: Home → elegir vibra o tienda → producto → carrito → checkout.
- Filtros solo en Shop y páginas de colección, nunca en home.
- Legibilidad garantizada incluso en temas oscuros (Men/Moon): contraste alto en nombres, precios, botones, disponibilidad.
- Mobile-first: nav mobile limpia, cart drawer, filtros en drawer, botones grandes.
- Accesibilidad: focus visible, alt text, contraste, áreas táctiles cómodas.

## Qué NO hacer
- No emojis como decoración principal.
- No home dark, ni 100% kawaii, ni gendered.
- No catálogo completo en home.
- No copiar TofuCute ni Blippo literalmente.
- No tema Shopify por defecto.
- No hacer la home solo un selector sin identidad.
- No mezclar el mockup admin con la experiencia del cliente.
- No animaciones que distraigan de comprar.

## Resultado esperado
Un sitio multi-página, retro, divertido, con identidad Pulpiña fuerte, 4 mundos visuales distintos pero coherentes, popup de bienvenida con los 3 logos + opción "continuar con la vista general", y un flujo de e-commerce limpio listo para conectar Shopify después.
