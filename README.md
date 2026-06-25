# Pulpina RD

Sitio React/TanStack Start sobre Cloudflare Workers. Hoy funciona como catalogo y canal de contacto; el siguiente paso sano es mover solicitudes, formularios y media a D1/R2 con Cloudflare Access y Turnstile ya puestos como perimetro.

## Estado actual

- `src/lib/admin-access.ts` valida `Cf-Access-Jwt-Assertion` y aplica allowlists de host/email para la ruta protegida `/admin`.
- `src/server.ts` anade headers base de seguridad en produccion.
- `src/lib/public-forms.ts` protege contacto y newsletter con validacion server-side de Turnstile.
- `src/context/cart.tsx` usa carrito local del navegador para armar solicitudes.
- `src/routes/solicitud.tsx` crea pedidos manuales con numero `PUL-000000` y luego envia al cliente a WhatsApp para cerrar la compra.
- `src/lib/manual-orders.ts` conecta checkout manual, admin y correo opcional desde el mismo flujo server-side.

## Variables de entorno

Copia `.env.example` y `.dev.vars.example` y define:

```env
ADMIN_ALLOWED_HOSTS=localhost,pulpinastore.com,www.pulpinastore.com
ADMIN_ALLOWED_EMAILS=owner@tudominio.com,ops@tudominio.com
ADMIN_ALLOWED_EMAIL_DOMAINS=
CF_ACCESS_TEAM_DOMAIN=https://tu-equipo.cloudflareaccess.com
CF_ACCESS_AUD=tu_aud_de_access
TURNSTILE_SECRET_KEY=tu_secret_turnstile
VITE_TURNSTILE_SITE_KEY=tu_site_key_turnstile
ORDER_NOTIFICATION_EMAIL=pedidos@tudominio.com
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Pulpina RD <pedidos@tudominio.com>
```

## Desarrollo

```bash
pnpm install
pnpm dev
pnpm build
```

## Deploy

Despliega este proyecto como Worker SSR de Cloudflare, no como sitio estatico subiendo solo `dist/client`, porque eso deja 404 en rutas como `/tienda`, `/moon` o `/contacto`.

```bash
pnpm deploy:dry-run
pnpm deploy:production
```

## Cloudflare

- `wrangler.jsonc` ya tiene `nodejs_compat`, `observability` y custom domains de produccion para `pulpinastore.com` y `www.pulpinastore.com`.
- Ahi mismo hay plantillas comentadas para `vars`, `d1_databases`, `r2_buckets`, `staging` y `production`.
- Los secretos van por `wrangler secret put`, no en el repo.

## Lo que falta antes de lanzar

- Persistir solicitudes, contacto y newsletter en D1.
- Verificar el dominio remitente de `RESEND_FROM_EMAIL` para activar correos reales.
- Mover media publica/privada a R2.
- Anadir rate limiting/WAF y reglas de headers en Cloudflare.
- Completar en la pagina legal la razon social, RNC y domicilio legal reales antes de produccion.
- Proteger `https://pulpinastore.com/admin/*` con Cloudflare Access.
