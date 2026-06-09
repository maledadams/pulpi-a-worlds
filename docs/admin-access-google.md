# Admin Access con Google

Este admin debe vivir detras de `Cloudflare Access`. La app no trae login publico propio.

## Que protege ahora el repo

- En `pnpm dev`, el admin sigue abierto para desarrollo local.
- Fuera de local, `/admin` solo entra si:
  - el host esta en `ADMIN_ALLOWED_HOSTS`
  - Cloudflare Access reenvia identidad al request
  - si defines `ADMIN_ALLOWED_EMAILS` o `ADMIN_ALLOWED_EMAIL_DOMAINS`, el email tambien cae en ese allowlist

La app espera el header de Access `cf-access-authenticated-user-email` y una solicitud ya autenticada por Cloudflare Access.

## Setup recomendado

1. En Cloudflare Zero Trust, crea una aplicacion `Self-hosted`.
2. Protege la ruta `/admin*` del dominio real.
3. Usa `Google` como identity provider.
4. Crea una policy `Allow` con los correos o el dominio del equipo.
5. En el servidor define:
   - `ADMIN_ALLOWED_HOSTS=pulpina.do,www.pulpina.do`
   - `ADMIN_ALLOWED_EMAILS=owner@pulpina.do,ops@pulpina.do`
   - o `ADMIN_ALLOWED_EMAIL_DOMAINS=@pulpina.do`

## Importante

- `ADMIN_ALLOWED_EMAILS` y `ADMIN_ALLOWED_EMAIL_DOMAINS` viven en env del servidor, no en `VITE_*`.
- La pantalla de configuracion del admin ya no es fuente de verdad para acceso.
- Si algun dia agregas mutaciones reales con `createServerFn`, valida auth dentro de cada handler tambien. El guard de ruta no protege RPC por si solo.
