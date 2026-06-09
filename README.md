# Pulpiña RD — Tienda Alternativa Multivibe

¡Bienvenido al repositorio de **Pulpiña RD**! Una plataforma de comercio electrónico de moda alternativa diseñada y desarrollada en la República Dominicana. Este proyecto está estructurado bajo un concepto de "multivibe" que segmenta la experiencia de compra en tres marcas o estilos diferenciados: **Moon** (romance gótico), **Sunshine** (kawaii/Y2K/glossy) y **Men** (punk/underground), además de un catálogo general integrado.

## 🚀 Tecnologías Principales

El proyecto utiliza un stack moderno y de alto rendimiento:

- **Framework**: [TanStack Start](https://tanstack.com/router/latest/docs/start/overview) (framework full-stack SSR construido sobre TanStack Router).
- **Frontend**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/).
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) (usando el nuevo compilador nativo `@tailwindcss/vite`).
- **Gestión de Estado y Consultas**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query).
- **Plataforma Serverless / SSR**: [Cloudflare Workers / Pages](https://pages.cloudflare.com/) (con integración a través de Wrangler).
- **E-Commerce Backend**: Integración híbrida con [Shopify Storefront API](https://shopify.dev/docs/api/storefront).

---

## 🛠️ Requisitos Previos

Asegúrate de tener instalados los siguientes componentes antes de comenzar:

- **Node.js**: v18.0.0 o superior (se recomienda v20+).
- **Gestor de paquetes**: [Bun](https://bun.sh/) (recomendado por la velocidad y el soporte nativo de `bun.lock`) o `npm`.
- **Wrangler CLI**: Instalar globalmente o ejecutar vía `npx` para emular el entorno de Cloudflare.

---

## ⚙️ Configuración del Proyecto

Sigue estos pasos para levantar el entorno de desarrollo local:

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/maledadams/pulpi-a-worlds.git
   cd pulpi-a-worlds
   ```

2. **Instalar dependencias**:
   Si usas **Bun** (recomendado):
   ```bash
   bun install
   ```
   Si usas **npm**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Copia el archivo de ejemplo para crear tu archivo `.env` o `.dev.vars` local:
   ```bash
   cp .env.example .env
   cp .dev.vars.example .dev.vars
   ```
   Edita los archivos con las credenciales de tu tienda Shopify:
   ```env
   SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=tu_token_de_acceso_storefront
   SHOPIFY_API_VERSION=2026-04
   ADMIN_ALLOWED_HOSTS=localhost,admin.tudominio.com
   ADMIN_ALLOWED_EMAILS=owner@tudominio.com,ops@tudominio.com
   ADMIN_ALLOWED_EMAIL_DOMAINS=
   ```
   El acceso real a `/admin` debe venir de Cloudflare Access; estos env son defensa adicional del lado servidor.

4. **Iniciar el servidor de desarrollo**:
   ```bash
   bun dev
   # o bien: npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

5. **Lanzar pruebas de compilación local con Cloudflare Wrangler (opcional)**:
   ```bash
   npx wrangler dev
   ```

---

## 📁 Estructura del Proyecto

A continuación, se detalla la organización de los directorios clave en `src/`:

```text
src/
├── assets/          # Recursos estáticos (Logotipos de vibes, mood boards, etc.)
├── components/      # Componentes modulares y reutilizables de UI
│   ├── admin/       # Vistas y paneles del panel operativo interno
│   ├── cart/        # Carrito lateral (drawer) e interacciones de compra
│   ├── catalog/     # Filtros, ordenamiento y grids de productos
│   ├── home/        # Hero carousel y modales de bienvenida
│   ├── layout/      # Componentes globales de estructura (Header, Footer)
│   ├── product/     # Tarjetas de productos y detalles visuales
│   └── ui/          # Primitives base de Shadcn UI (botones, inputs, diálogos, etc.)
├── context/         # Proveedores de estado global (e.g. carrito de compra local)
├── data/            # Datos locales de mock para fallback (e.g. catálogos locales)
├── hooks/           # Custom React hooks de comportamiento (e.g. useVibe)
├── lib/             # Servicios del servidor y utilidades
│   ├── shopify.ts   # Funciones servidor (createServerFn) para consultar Shopify API
│   ├── admin-service.ts  # Control de datos locales del dashboard de administración
│   ├── admin-access.ts   # Lógica de seguridad y control de acceso al admin panel
│   └── store-filters.ts  # Control y validación del estado de filtros y búsquedas
├── routes/          # Rutas basadas en archivos de TanStack Start
│   ├── __root.tsx   # Shell principal, metatags globales y providers
│   ├── index.tsx    # Landing page principal
│   ├── tienda.tsx   # Buscador general del catálogo
│   ├── producto.$slug.tsx # Detalle dinámico del producto
│   ├── admin.tsx    # Ruta padre del panel de control
│   └── [vibes].tsx  # Rutas específicas para cada subtienda (moon, sunshine, men)
├── server.ts        # Punto de entrada para SSR y Cloudflare Workers
├── start.ts         # Punto de entrada para el cliente en el navegador
└── styles.css       # Estilos globales y temas OKLCH por cada sub-marca (vibe)
```

---

## 🛠️ Comandos Disponibles

- `bun dev` / `npm run dev`: Levanta el entorno de desarrollo local con Vite.
- `bun build` / `npm run build`: Compila la aplicación optimizada para producción.
- `bun lint` / `npm run lint`: Ejecuta ESLint sobre el proyecto.
- `bun format` / `npm run format`: Formatea el código fuente utilizando Prettier.
