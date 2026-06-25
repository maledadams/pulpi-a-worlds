import { createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/acceso-admin")({
  head: () => ({ meta: [{ title: "Acceso Admin - Pulpiña RD" }] }),
  component: AdminAccessPage,
});

function AdminAccessPage() {
  return (
    <div className="mx-auto flex min-h-[72vh] max-w-6xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border-2 border-[#231717] bg-[#231717] p-8 text-white sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em]">
            <ShieldCheck className="h-4 w-4" />
            Acceso interno
          </div>
          <h1 className="mt-5 max-w-xl text-4xl font-black sm:text-5xl">
            Entrada del panel administrativo
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            El panel no usa un login hecho dentro de la app. La autenticacion real la hace
            Cloudflare Access con Google antes de dejar pasar a <code>/admin</code>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/admin"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#231717]"
            >
              Continuar con Google
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-5 py-3 text-sm font-bold text-white/90"
            >
              Volver a la tienda
            </a>
          </div>
        </section>

        <aside className="rounded-[32px] border-2 border-[#231717] bg-white p-8 sm:p-10">
          <div className="flex items-center gap-3 text-[#231717]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7f2ec]">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7c665f]">
                Como entra el equipo
              </div>
              <div className="mt-1 text-lg font-black">Google + Cloudflare Access</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm leading-6 text-[#5f4941]">
            <div className="rounded-2xl border border-[#231717]/10 bg-[#faf6f0] p-4">
              1. La persona abre <code>/acceso-admin</code> o entra directo a <code>/admin</code>.
            </div>
            <div className="rounded-2xl border border-[#231717]/10 bg-[#faf6f0] p-4">
              2. Cloudflare Access verifica si ya tiene sesion. Si no, pide Google.
            </div>
            <div className="rounded-2xl border border-[#231717]/10 bg-[#faf6f0] p-4">
              3. Si el correo esta permitido por la policy, entra al panel.
            </div>
            <div className="rounded-2xl border border-dashed border-[#231717]/20 p-4 text-xs leading-5 text-[#6b5a55]">
              Si activas <strong>Apply instant authentication</strong> en Cloudflare Access, el boton
              de arriba manda directo al login de Google. Si no, primero aparece la pantalla de Access.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
