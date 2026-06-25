# Admin Access con Google

Este admin debe vivir detras de `Cloudflare Access`. La app ahora tiene una pagina publica de entrada en `/acceso-admin`, pero la autenticacion real sigue pasando en Cloudflare Access.

## Que protege ahora el repo

- En `pnpm dev`, el admin sigue abierto para desarrollo local.
- Fuera de local, el admin en `/admin` solo entra si:
  - el host esta en `ADMIN_ALLOWED_HOSTS`
  - existe `cf-access-authenticated-user-email`
  - existe `cf-access-jwt-assertion`
  - el JWT pasa validacion criptografica contra los certs de Access
  - si defines `ADMIN_ALLOWED_EMAILS` o `ADMIN_ALLOWED_EMAIL_DOMAINS`, el email tambien cae en ese allowlist

## Variables necesarias

- `ADMIN_ALLOWED_HOSTS`
- `ADMIN_ALLOWED_EMAILS`
- `ADMIN_ALLOWED_EMAIL_DOMAINS`
- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`

## Setup recomendado

1. En Cloudflare Zero Trust, crea una aplicacion `Self-hosted`.
2. Protege `https://pulpinastore.com/admin/*`.
3. Usa `Google` como identity provider.
4. Si solo vas a usar Google, activa `Apply instant authentication` para que al entrar a `/admin` o `/acceso-admin` el usuario vaya directo a Google sin ver una pantalla intermedia de Access.
5. Crea una policy `Allow` con los correos o el dominio del equipo.
6. Copia el `Application Audience (AUD)` de esa app.
7. En el servidor define:
   - `ADMIN_ALLOWED_HOSTS=pulpinastore.com,www.pulpinastore.com`
   - `ADMIN_ALLOWED_EMAILS=owner@pulpina.do,ops@pulpina.do`
   - o `ADMIN_ALLOWED_EMAIL_DOMAINS=@pulpina.do`
   - `CF_ACCESS_TEAM_DOMAIN=https://tu-equipo.cloudflareaccess.com`
   - `CF_ACCESS_AUD=el-aud-de-la-app`

## Importante

- `ADMIN_ALLOWED_EMAILS` y `ADMIN_ALLOWED_EMAIL_DOMAINS` viven en env del servidor, no en `VITE_*`.
- La pantalla de configuracion del admin no es fuente de verdad para acceso.
- Si agregas mutaciones reales con `createServerFn`, valida auth dentro de cada handler tambien. El guard de ruta no protege RPC por si solo.
