# Admin Access con Google

Este admin esta pensado para protegerse con `Cloudflare Access`, no con login publico dentro de la app.

## Objetivo

- Login facil para el equipo
- Sin contrasenas propias en la app al inicio
- Solo correos aprobados pueden entrar a `/admin`

## Setup recomendado

1. En Cloudflare Zero Trust, crea una aplicacion `Self-hosted`.
2. Usa la ruta `/admin*` del dominio del proyecto.
3. Anade `Google` como identity provider.
4. Crea una policy `Allow` con los correos del equipo.
5. Opcional: deja `One-Time PIN` como fallback para invitadas externas.

## Importante para este repo

- En `npm run dev`, el admin entra libre.
- Fuera de local, el admin queda bloqueado por codigo si el host no esta en `ADMIN_ALLOWED_HOSTS` o `VITE_ADMIN_ALLOWED_HOSTS`.
- En produccion real, define por ejemplo:
  - `ADMIN_ALLOWED_HOSTS=pulpina.do,www.pulpina.do`

## Correos iniciales sugeridos

- `owner@pulpina.do`
- `ops@pulpina.do`

## Nota

Esta configuracion ocurre en Cloudflare, no dentro del repo. El frontend solo asume que `/admin` ya esta protegido a nivel de acceso.
