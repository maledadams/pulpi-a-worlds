import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Boxes, CreditCard, FolderKanban, Image,
  LayoutGrid, Package2, PackageSearch, Percent,
  Settings2, ShoppingBag, Store,
} from "lucide-react";
import { enforceAdminAccess } from "@/lib/admin-access";
import { formatPrice, getCategoryLabel } from "@/data/products";
import type { Vibe } from "@/data/products";
import {
  ADMIN_CATEGORIES, ADMIN_COLLECTIONS, ADMIN_DISCOUNTS, ADMIN_MEDIA,
  ADMIN_ORDERS, ADMIN_PRODUCTS, ADMIN_SETTINGS,
  formatAdminOrderStatus, formatAdminPaymentMethod,
  getAdminCategoryProducts, getAdminCollectionProducts,
  getAdminDashboardSnapshot, getInventoryStatus, getInventoryStatusTone,
  getOrderRevenueLabel, getVibeLabel,
} from "@/lib/admin-service";
import type {
  AdminCategoryRecord, AdminCollectionRecord, AdminDiscountRecord,
  AdminMediaRecord, AdminOrderRecord, AdminOrderStatus,
  AdminPaymentMethod, AdminProductRecord, AdminSection,
} from "@/lib/admin-types";

/* ─────────────────────────────────────────────────────
   Route
───────────────────────────────────────────────────── */
export const Route = createFileRoute("/admin")({
  beforeLoad: () => enforceAdminAccess(),
  head: () => ({ meta: [{ title: "Admin — Pulpiña RD" }] }),
  component: AdminSPA,
});

/* ─────────────────────────────────────────────────────
   Shared primitives  (uses site design system vars)
───────────────────────────────────────────────────── */
function Btn({
  children, onClick, tone = "secondary", disabled, className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const t = {
    primary:   "border-foreground bg-foreground text-background hover:opacity-90",
    secondary: "border-foreground/25 bg-card text-foreground hover:bg-muted",
    ghost:     "border-foreground/15 bg-muted text-muted-foreground hover:border-foreground/30 hover:text-foreground",
    danger:    "border-red-700 bg-red-700 text-white hover:bg-red-800",
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 ${t} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-foreground";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

function Tag({ children, tone = "soft" }: { children: React.ReactNode; tone?: "soft" | "dark" | "warn" }) {
  const t = {
    soft: "bg-muted text-muted-foreground",
    dark: "bg-foreground text-background",
    warn: "bg-amber-100 text-amber-800",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${t}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, help, icon: Icon }: { label: string; value: string; help: string; icon: typeof BarChart3 }) {
  return (
    <div className="rounded-xl border border-foreground/15 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-black text-foreground">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{help}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground/60">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, eyebrow, children, actions, className = "" }: {
  title: string; eyebrow?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-foreground/15 bg-card shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-foreground/8 px-4 py-3.5">
        <div>
          {eyebrow && <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{eyebrow}</div>}
          <h2 className="mt-0.5 text-base font-bold text-foreground">{title}</h2>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-foreground/20 bg-muted/30 px-5 py-10 text-center">
      <div className="text-sm font-bold text-foreground">{title}</div>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

function Checkbox({ label, checked, onCheckedChange, hint }: {
  label: string; checked: boolean; onCheckedChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-foreground/10 bg-muted/30 px-3 py-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-foreground" />
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-foreground/8 pt-3">
      <div className="text-xs text-muted-foreground">Página {page + 1} de {pages}</div>
      <div className="flex gap-2">
        <Btn tone="ghost" onClick={() => onChange(Math.max(0, page - 1))} disabled={page === 0}>Anterior</Btn>
        <Btn tone="ghost" onClick={() => onChange(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1}>Siguiente</Btn>
      </div>
    </div>
  );
}

function SaveMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">{msg}</div>;
}

/* ─────────────────────────────────────────────────────
   RESUMEN panel
───────────────────────────────────────────────────── */
function ResumenPanel({ onNav }: { onNav: (s: AdminSection) => void }) {
  const snapshot = useMemo(() => getAdminDashboardSnapshot(), []);
  const revenueLabel = useMemo(() => getOrderRevenueLabel(), []);
  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-4">
        <StatCard label="Productos" value={String(snapshot.productCount)} help="Catálogo visible actualmente" icon={PackageSearch} />
        <StatCard label="Pedidos" value={String(snapshot.orderCount)} help="Pedidos en el sistema" icon={ShoppingBag} />
        <StatCard label="Pendiente pago" value={String(snapshot.pendingPaymentCount)} help="Órdenes que esperan validación" icon={CreditCard} />
        <StatCard label="Inventario bruto" value={revenueLabel} help="Valor aproximado del stock" icon={BarChart3} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Poco stock" eyebrow="Acción rápida">
          {snapshot.lowStockProducts.length === 0
            ? <p className="text-sm text-muted-foreground">No hay productos por debajo del umbral.</p>
            : snapshot.lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-3 py-3 mb-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="mt-1 flex gap-2">
                    <Tag>{getVibeLabel(p.vibe)}</Tag>
                    <Tag tone="warn">{p.stock ?? 0} unidades</Tag>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getInventoryStatusTone(p)}`}>
                  {getInventoryStatus(p)}
                </span>
              </div>
            ))}
        </Panel>
        <Panel title="Mix por subtienda" eyebrow="Distribución">
          {snapshot.productsByVibe.map((e) => (
            <div key={e.vibe} className="rounded-lg border border-foreground/10 p-3 mb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{getVibeLabel(e.vibe)}</div>
                <div className="text-lg font-bold">{e.count}</div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-foreground"
                  style={{ width: `${Math.max((e.count / snapshot.productCount) * 100, 8)}%` }} />
              </div>
            </div>
          ))}
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Pedidos recientes" eyebrow="Seguimiento">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr><th className="pb-3 pr-3">Pedido</th><th className="pb-3 pr-3">Cliente</th><th className="pb-3 pr-3">Estado</th><th className="pb-3 pr-3">Total</th></tr>
            </thead>
            <tbody>
              {snapshot.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-[#231717]/10">
                  <td className="py-2.5 pr-3 font-bold">{o.orderNumber}</td>
                  <td className="py-2.5 pr-3">
                    <div>{o.customerName}</div>
                    <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Tag tone={o.status === "pending_payment" ? "warn" : "soft"}>{formatAdminOrderStatus(o.status)}</Tag>
                  </td>
                  <td className="py-2.5 pr-3 font-bold">{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Métodos activos" eyebrow="Cobro actual">
          {[
            ["AZUL","Tarjeta crédito/débito vía AZUL RD."],
            ["Transferencia","Manual con validación y comprobante."],
            ["WhatsApp","Canal directo para coordinar pago."],
          ].map(([l,d]) => (
            <div key={l} className="rounded-2xl border border-foreground/10 p-3 mb-2">
              <div className="text-sm font-bold">{l}</div>
              <div className="mt-1 text-xs leading-5 text-[#6b5a55]">{d}</div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   PRODUCTOS panel
───────────────────────────────────────────────────── */
const PAGE = 8;
function cloneP(p: AdminProductRecord): AdminProductRecord {
  return { ...p, categories:[...p.categories], images:[...p.images], variants:[...p.variants], tags:[...p.tags] };
}
function blankP(): AdminProductRecord {
  return { id:`draft-${Date.now()}`, slug:"", name:"", vibe:"moon", categories:["tops"], primaryCategory:"tops",
    description:"", price:0, compareAtPrice:null, available:true, stock:0, featured:false, newArrival:false,
    isNsfw:false, images:[], featuredImage:null, variants:[], tags:[], createdAt:new Date().toISOString() };
}

function ProductosPanel() {
  const [rows, setRows] = useState(() => ADMIN_PRODUCTS.map(cloneP));
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all"|"moon"|"sunshine"|"men">("all");
  const [page, setPage] = useState(0);
  const [selId, setSelId] = useState(ADMIN_PRODUCTS[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminProductRecord | null>(ADMIN_PRODUCTS[0] ? cloneP(ADMIN_PRODUCTS[0]) : null);
  const [msg, setMsg] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((p) => {
      if (scope !== "all" && p.vibe !== scope) return false;
      return `${p.name} ${p.slug} ${p.categories.join(" ")} ${p.tags.join(" ")}`.toLowerCase().includes(q);
    });
  }, [rows, query, scope]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safe = Math.min(page, pages - 1);
  const paged = filtered.slice(safe * PAGE, safe * PAGE + PAGE);
  const selected = rows.find((p) => p.id === selId) ?? null;

  useEffect(() => { setPage(0); }, [query, scope]);
  useEffect(() => {
    if (!filtered.length) { setSelId(""); setDraft(null); return; }
    if (!filtered.some((p) => p.id === selId)) setSelId(filtered[0]!.id);
  }, [filtered, selId]);
  useEffect(() => { setDraft(selected ? cloneP(selected) : null); }, [selId, selected]);

  const upd = <K extends keyof AdminProductRecord>(k: K, v: AdminProductRecord[K]) =>
    setDraft((d) => d ? { ...d, [k]: v } : d);

  const toggleCat = (id: string) => setDraft((d) => {
    if (!d) return d;
    const has = d.categories.includes(id);
    const cats = has ? d.categories.filter((c) => c !== id) : [...d.categories, id];
    const next = cats.length ? cats : [id];
    return { ...d, categories: next, primaryCategory: next.includes(d.primaryCategory) ? d.primaryCategory : next[0]!,
      isNsfw: next.some((c) => ["lingerie","kinkwear","sex-toys"].includes(c)) };
  });

  const save = () => {
    if (!draft) return;
    const n = { ...draft, slug: draft.slug.trim().toLowerCase().replace(/\s+/g,"-"),
      name: draft.name.trim(), stock: Math.max(0,Number(draft.stock??0)),
      price: Math.max(0,Number(draft.price)),
      compareAtPrice: draft.compareAtPrice && Number(draft.compareAtPrice)>0 ? Number(draft.compareAtPrice) : null };
    setRows((r) => r.map((p) => p.id === n.id ? n : p));
    setMsg("Cambios guardados en la interfaz.");
  };

  const create = () => { const b=blankP(); setRows((r)=>[b,...r]); setSelId(b.id); setDraft(cloneP(b)); setMsg("Nuevo producto creado."); };
  const dup = () => { if(!draft) return; const d={...cloneP(draft),id:`draft-${Date.now()}`,slug:`${draft.slug||"p"}-copy`,name:`${draft.name} Copy`,createdAt:new Date().toISOString()}; setRows((r)=>[d,...r]); setSelId(d.id); setDraft(d); setMsg("Producto duplicado."); };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_400px]">
      <Panel title="Catálogo" eyebrow="Productos" actions={
        <div className="flex gap-2 flex-wrap">
          {(["all","moon","sunshine","men"] as const).map((s)=>(
            <Btn key={s} tone={scope===s?"primary":"ghost"} onClick={()=>setScope(s)}>
              {s==="all"?"Todos":getVibeLabel(s)}
            </Btn>
          ))}
        </div>
      }>
        <div className="mb-4 flex gap-3">
          <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar nombre, slug, categoría o tag" />
          <div className="shrink-0 rounded-xl border border-foreground/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">{filtered.length}</div>
        </div>
        {!paged.length ? <Empty title="Sin productos" body="Prueba otro filtro." action={<Btn tone="primary" onClick={create}>Crear</Btn>} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <tr><th className="pb-3 pr-3">Producto</th><th className="pb-3 pr-3">Subtienda</th><th className="pb-3 pr-3">Categorías</th><th className="pb-3 pr-3">Precio</th><th className="pb-3 pr-3">Stock</th></tr>
                </thead>
                <tbody>
                  {paged.map((p)=>(
                    <tr key={p.id} onClick={()=>setSelId(p.id)} className={`cursor-pointer border-t border-foreground/8 transition-colors ${selId===p.id?"bg-muted/60":"hover:bg-muted/30"}`}>
                      <td className="py-3 pr-3"><div className="font-bold">{p.name||"Sin nombre"}</div><div className="text-xs text-muted-foreground">{p.slug||"sin-slug"}</div></td>
                      <td className="py-3 pr-3"><Tag>{getVibeLabel(p.vibe)}</Tag></td>
                      <td className="py-3 pr-3"><div className="flex flex-wrap gap-1">{p.categories.map((c)=><Tag key={c} tone={p.isNsfw&&["lingerie","kinkwear","sex-toys"].includes(c)?"warn":"soft"}>{getCategoryLabel(c)}</Tag>)}</div></td>
                      <td className="py-3 pr-3 font-bold">{formatPrice(p.price)}</td>
                      <td className="py-3 pr-3"><span className={`rounded-xl px-2.5 py-1 text-[11px] font-black uppercase ${getInventoryStatusTone(p)}`}>{getInventoryStatus(p)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3"><Pagination page={safe} pages={pages} onChange={setPage} /></div>
          </>
        )}
      </Panel>

      <Panel title={draft?.name||"Editor"} eyebrow="Detalle" actions={
        <div className="flex gap-2"><Btn tone="secondary" onClick={dup} disabled={!draft}>Duplicar</Btn><Btn tone="primary" onClick={save} disabled={!draft}>Guardar</Btn><Btn tone="primary" onClick={create}>Nuevo</Btn></div>
      }>
        {draft ? (
          <div className="grid gap-4">
            <SaveMsg msg={msg} />
            <div className="aspect-[1.2] rounded-3xl border border-foreground/10" style={{background:`linear-gradient(135deg,${draft.vibe==="moon"?"#45121e":draft.vibe==="men"?"#241d1d":"#ffd1e5"},${draft.vibe==="sunshine"?"#fff4a3":"#f7efe7"})`}}>
              {draft.featuredImage?.url ? <img src={draft.featuredImage.url} alt={draft.name} className="h-full w-full rounded-3xl object-cover" /> : (
                <div className="flex h-full items-center justify-center text-4xl font-black text-white/80">{(draft.name||"NP").slice(0,2).toUpperCase()}</div>
              )}
            </div>
            <Field label="Nombre"><Input value={draft.name} onChange={(e)=>upd("name",e.target.value)} /></Field>
            <Field label="Slug"><Input value={draft.slug} onChange={(e)=>upd("slug",e.target.value)} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Subtienda">
                <Select value={draft.vibe} onChange={(e)=>upd("vibe",e.target.value as AdminProductRecord["vibe"])}>
                  <option value="moon">Moon</option><option value="sunshine">Sunshine</option><option value="men">Men</option>
                </Select>
              </Field>
              <Field label="Categoría principal">
                <Select value={draft.primaryCategory} onChange={(e)=>upd("primaryCategory",e.target.value)}>
                  {ADMIN_CATEGORIES.map((c)=><option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Precio"><Input type="number" value={draft.price} onChange={(e)=>upd("price",Number(e.target.value))} /></Field>
              <Field label="Precio oferta"><Input type="number" value={draft.compareAtPrice??""} onChange={(e)=>upd("compareAtPrice",e.target.value?Number(e.target.value):null)} /></Field>
            </div>
            <Field label="Stock"><Input type="number" value={draft.stock??0} onChange={(e)=>upd("stock",Number(e.target.value))} /></Field>
            <Field label="Descripción"><Textarea rows={4} value={draft.description} onChange={(e)=>upd("description",e.target.value)} /></Field>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Categorías</div>
              <div className="flex flex-wrap gap-2">
                {ADMIN_CATEGORIES.map((c)=>{const a=draft.categories.includes(c.id);return(
                  <button key={c.id} type="button" onClick={()=>toggleCat(c.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${a?"border-foreground bg-foreground text-background":"border-foreground/20 bg-muted/30 text-muted-foreground"}`}>
                    {c.label}
                  </button>
                );})}
              </div>
            </div>
            <div className="grid gap-3">
              <Checkbox label="Disponible" checked={draft.available} onCheckedChange={(v)=>upd("available",v)} />
              <Checkbox label="Destacado" checked={draft.featured} onCheckedChange={(v)=>upd("featured",v)} />
              <Checkbox label="Nuevo" checked={draft.newArrival} onCheckedChange={(v)=>upd("newArrival",v)} />
              <Checkbox label="NSFW" checked={draft.isNsfw} onCheckedChange={(v)=>upd("isNsfw",v)} hint="Oculto en tienda general hasta activar el gate." />
            </div>
          </div>
        ) : <Empty title="Sin selección" body="Selecciona un producto o crea uno nuevo." action={<Btn tone="primary" onClick={create}>Crear producto</Btn>} />}
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   CATEGORÍAS panel
───────────────────────────────────────────────────── */
function cloneC(c: AdminCategoryRecord): AdminCategoryRecord { return {...c,vibes:[...c.vibes]}; }
function blankC(): AdminCategoryRecord { return {id:`draft-cat-${Date.now()}`,label:"",isNsfw:false,vibes:["moon"],productCount:0}; }

function CategoriasPanel() {
  const [rows,setRows]=useState(()=>ADMIN_CATEGORIES.map(cloneC));
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(0);
  const [selId,setSelId]=useState(ADMIN_CATEGORIES[0]?.id??"");
  const [draft,setDraft]=useState<AdminCategoryRecord|null>(ADMIN_CATEGORIES[0]?cloneC(ADMIN_CATEGORIES[0]):null);
  const [msg,setMsg]=useState("");

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter((c)=>`${c.label} ${c.id} ${c.vibes.join(" ")}`.toLowerCase().includes(q));},[rows,query]);
  const pages=Math.max(1,Math.ceil(filtered.length/9));
  const safe=Math.min(page,pages-1);
  const paged=filtered.slice(safe*9,safe*9+9);
  const selected=rows.find((c)=>c.id===selId)??null;
  const related=draft?getAdminCategoryProducts(draft.id):[];

  useEffect(()=>{setPage(0);},[query]);
  useEffect(()=>{if(!filtered.length){setSelId("");setDraft(null);return;}if(!filtered.some((c)=>c.id===selId))setSelId(filtered[0]!.id);},[filtered,selId]);
  useEffect(()=>{setDraft(selected?cloneC(selected):null);},[selected]);

  const toggleVibe=(v:Vibe)=>setDraft((d)=>{if(!d)return d;const has=d.vibes.includes(v);const next=has?d.vibes.filter((x)=>x!==v):[...d.vibes,v];return{...d,vibes:next.length?next:[v]};});

  const save=()=>{if(!draft)return;const n={...draft,label:draft.label.trim(),id:draft.id.startsWith("draft-cat-")?draft.label.trim().toLowerCase().replace(/\s+/g,"-")||draft.id:draft.id};setRows((r)=>{const exists=r.some((c)=>c.id===draft.id);return exists?r.map((c)=>c.id===draft.id?n:c):[n,...r];});if(selId===draft.id)setSelId(n.id);setMsg("Categoría guardada.");};
  const create=()=>{const b=blankC();setRows((r)=>[b,...r]);setSelId(b.id);setDraft(b);setMsg("Nueva categoría creada.");};

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_390px]">
      <Panel title="Mapa de categorías" eyebrow="Catálogo" actions={<Btn tone="primary" onClick={create}>Nueva categoría</Btn>}>
        <div className="mb-4 flex gap-3">
          <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por nombre o id" />
          <div className="shrink-0 rounded-xl border border-foreground/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">{filtered.length}</div>
        </div>
        {!paged.length?<Empty title="Sin categorías" body="Prueba otra búsqueda." action={<Btn tone="primary" onClick={create}>Crear</Btn>} />:(
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <tr><th className="pb-3 pr-3">Categoría</th><th className="pb-3 pr-3">Subtiendas</th><th className="pb-3 pr-3">NSFW</th><th className="pb-3 pr-3">Productos</th></tr>
                </thead>
                <tbody>
                  {paged.map((c)=>(
                    <tr key={c.id} onClick={()=>setSelId(c.id)} className={`cursor-pointer border-t border-[#231717]/10 transition-colors ${selId===c.id?"bg-[#f7f2ec]":"hover:bg-[#faf6f0]"}`}>
                      <td className="py-3 pr-3"><div className="font-bold">{c.label||"Sin nombre"}</div><div className="text-xs text-muted-foreground">{c.id}</div></td>
                      <td className="py-3 pr-3"><div className="flex gap-1">{c.vibes.map((v)=><Tag key={v}>{getVibeLabel(v)}</Tag>)}</div></td>
                      <td className="py-3 pr-3">{c.isNsfw?<Tag tone="warn">NSFW</Tag>:<Tag>SFW</Tag>}</td>
                      <td className="py-3 pr-3 font-bold">{c.productCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3"><Pagination page={safe} pages={pages} onChange={setPage} /></div>
          </>
        )}
      </Panel>
      <Panel title={draft?.label||"Editor"} eyebrow="Detalle" actions={<Btn tone="primary" onClick={save} disabled={!draft}>Guardar</Btn>}>
        {draft?(
          <div className="grid gap-4">
            <SaveMsg msg={msg} />
            <Field label="Nombre visible"><Input value={draft.label} onChange={(e)=>setDraft((d)=>d?{...d,label:e.target.value}:d)} /></Field>
            <Field label="Slug interno" hint="Al guardar se normaliza desde el nombre si es nuevo."><Input value={draft.id} onChange={(e)=>setDraft((d)=>d?{...d,id:e.target.value}:d)} /></Field>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Subtiendas activas</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["moon","sunshine","men"] as const).map((v)=>{const a=draft.vibes.includes(v);return(
                  <button key={v} type="button" onClick={()=>toggleVibe(v)} className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${a?"border-foreground bg-foreground text-background":"border-foreground/20 bg-muted/30 text-muted-foreground"}`}>{getVibeLabel(v)}</button>
                );})}
              </div>
            </div>
            <Checkbox label="Categoría NSFW" checked={draft.isNsfw} onCheckedChange={(v)=>setDraft((d)=>d?{...d,isNsfw:v}:d)} hint="Oculta en tienda general hasta activar gate." />
            <div className="rounded-2xl border border-foreground/10 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Uso actual</div>
              <div className="mt-2 text-2xl font-black">{related.length}</div>
              <div className="mt-1 text-sm text-muted-foreground">productos con esta categoría</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Productos relacionados</div>
              {related.length?related.slice(0,6).map((p)=>(
                <div key={p.id} className="rounded-2xl border border-foreground/10 px-3 py-2 mb-2"><div className="text-sm font-bold">{p.name}</div><div className="text-xs text-muted-foreground">{getVibeLabel(p.vibe)}</div></div>
              )):<div className="rounded-2xl border border-dashed border-foreground/20 px-3 py-4 text-sm text-muted-foreground">Ningún producto usa esta categoría.</div>}
            </div>
          </div>
        ):<Empty title="Sin selección" body="Selecciona una categoría o crea una nueva." action={<Btn tone="primary" onClick={create}>Crear categoría</Btn>} />}
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   COLECCIONES panel
───────────────────────────────────────────────────── */
function cloneColl(c:AdminCollectionRecord):AdminCollectionRecord{return{...c,categoryIds:[...c.categoryIds],productIds:[...c.productIds]};}
function blankColl():AdminCollectionRecord{return{id:`draft-coll-${Date.now()}`,slug:"",name:"",description:"",vibe:"store",featured:false,categoryIds:[],productIds:[]};}

function ColeccionesPanel() {
  const [rows,setRows]=useState(()=>ADMIN_COLLECTIONS.map(cloneColl));
  const [query,setQuery]=useState("");
  const [scope,setScope]=useState<"all"|"store"|"moon"|"sunshine"|"men">("all");
  const [page,setPage]=useState(0);
  const [selId,setSelId]=useState(ADMIN_COLLECTIONS[0]?.id??"");
  const [draft,setDraft]=useState<AdminCollectionRecord|null>(ADMIN_COLLECTIONS[0]?cloneColl(ADMIN_COLLECTIONS[0]):null);
  const [msg,setMsg]=useState("");

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter((c)=>{if(scope!=="all"&&c.vibe!==scope)return false;return`${c.name} ${c.slug} ${c.description}`.toLowerCase().includes(q);});},[rows,query,scope]);
  const pages=Math.max(1,Math.ceil(filtered.length/6));
  const safe=Math.min(page,pages-1);
  const paged=filtered.slice(safe*6,safe*6+6);
  const selected=rows.find((c)=>c.id===selId)??null;
  const assignable=useMemo(()=>draft?ADMIN_PRODUCTS.filter((p)=>draft.vibe==="store"||p.vibe===draft.vibe):[],[draft]);

  useEffect(()=>{setPage(0);},[query,scope]);
  useEffect(()=>{if(!filtered.length){setSelId("");setDraft(null);return;}if(!filtered.some((c)=>c.id===selId))setSelId(filtered[0]!.id);},[filtered,selId]);
  useEffect(()=>{setDraft(selected?cloneColl(selected):null);},[selected]);

  const save=()=>{if(!draft)return;const n={...draft,slug:draft.slug.trim().toLowerCase().replace(/\s+/g,"-"),name:draft.name.trim(),description:draft.description.trim()};setRows((r)=>r.map((c)=>c.id===draft.id?n:c));setMsg("Colección guardada.");};
  const create=()=>{const b=blankColl();setRows((r)=>[b,...r]);setSelId(b.id);setDraft(b);setMsg("Nueva colección creada.");};
  const togCat=(id:string)=>setDraft((d)=>{if(!d)return d;const a=d.categoryIds.includes(id);return{...d,categoryIds:a?d.categoryIds.filter((c)=>c!==id):[...d.categoryIds,id]};});
  const togProd=(id:string)=>setDraft((d)=>{if(!d)return d;const a=d.productIds.includes(id);return{...d,productIds:a?d.productIds.filter((p)=>p!==id):[...d.productIds,id]};});

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
      <Panel title="Colecciones" eyebrow="Merchandising" actions={
        <div className="flex flex-wrap gap-2">
          {(["all","store","moon","sunshine","men"] as const).map((s)=>(
            <Btn key={s} tone={scope===s?"primary":"ghost"} onClick={()=>setScope(s)}>{s==="all"?"Todas":getVibeLabel(s)}</Btn>
          ))}
        </div>
      }>
        <div className="mb-4 flex gap-3"><Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por nombre, slug o descripción" /><div className="shrink-0 rounded-xl border border-foreground/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">{filtered.length}</div></div>
        {!paged.length?<Empty title="Sin colecciones" body="Prueba otro filtro." action={<Btn tone="primary" onClick={create}>Crear</Btn>} />:(
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {paged.map((c)=>(
                <button key={c.id} type="button" onClick={()=>setSelId(c.id)} className={`rounded-3xl border p-4 text-left transition-colors ${selId===c.id?"border-foreground bg-muted/60":"border-foreground/10 bg-muted/20 hover:bg-muted/50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-sm font-black">{c.name||"Sin nombre"}</div><div className="mt-1 text-xs text-muted-foreground">{c.slug||"sin-slug"}</div></div>
                    {c.featured&&<Tag tone="dark">Destacada</Tag>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1"><Tag>{getVibeLabel(c.vibe)}</Tag><Tag>{c.productIds.length} productos</Tag></div>
                </button>
              ))}
            </div>
            <div className="mt-3"><Pagination page={safe} pages={pages} onChange={setPage} /></div>
          </>
        )}
      </Panel>
      <Panel title={draft?.name||"Editor"} eyebrow="Detalle" actions={<div className="flex gap-2"><Btn tone="primary" onClick={save} disabled={!draft}>Guardar</Btn><Btn tone="primary" onClick={create}>Nueva</Btn></div>}>
        {draft?(
          <div className="grid gap-4">
            <SaveMsg msg={msg} />
            <Field label="Nombre"><Input value={draft.name} onChange={(e)=>setDraft((d)=>d?{...d,name:e.target.value}:d)} /></Field>
            <Field label="Slug"><Input value={draft.slug} onChange={(e)=>setDraft((d)=>d?{...d,slug:e.target.value}:d)} /></Field>
            <Field label="Subtienda">
              <Select value={draft.vibe} onChange={(e)=>setDraft((d)=>d?{...d,vibe:e.target.value as AdminCollectionRecord["vibe"],productIds:[]}:d)}>
                <option value="store">General</option><option value="moon">Moon</option><option value="sunshine">Sunshine</option><option value="men">Men</option>
              </Select>
            </Field>
            <Field label="Descripción"><Textarea rows={3} value={draft.description} onChange={(e)=>setDraft((d)=>d?{...d,description:e.target.value}:d)} /></Field>
            <Checkbox label="Colección destacada" checked={draft.featured} onCheckedChange={(v)=>setDraft((d)=>d?{...d,featured:v}:d)} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Categorías destacadas</div>
              <div className="flex flex-wrap gap-2">
                {ADMIN_CATEGORIES.map((c)=>{const a=draft.categoryIds.includes(c.id);return(<button key={c.id} type="button" onClick={()=>togCat(c.id)} className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${a?"border-foreground bg-foreground text-background":"border-foreground/20 bg-muted/30 text-muted-foreground"}`}>{c.label}</button>);})}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3 mb-2"><div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Productos incluidos</div><div className="text-xs font-semibold text-[#6b5a55]">{draft.productIds.length} seleccionados</div></div>
              <div className="max-h-[280px] overflow-y-auto grid gap-2 pr-1">
                {assignable.map((p)=>{const a=draft.productIds.includes(p.id);return(
                  <label key={p.id} className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${a?"border-foreground bg-muted/60":"border-[#231717]/10 bg-[#faf6f0]"}`}>
                    <input type="checkbox" checked={a} onChange={()=>togProd(p.id)} className="mt-1 h-4 w-4 rounded border-[#231717] accent-[#231717]" />
                    <span className="min-w-0"><span className="block font-bold">{p.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{getVibeLabel(p.vibe)} · {getCategoryLabel(p.primaryCategory)}</span></span>
                  </label>
                );})}
              </div>
            </div>
          </div>
        ):<Empty title="Sin selección" body="Selecciona una colección o crea una nueva." action={<Btn tone="primary" onClick={create}>Crear colección</Btn>} />}
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   PEDIDOS panel
───────────────────────────────────────────────────── */
function cloneO(o:AdminOrderRecord):AdminOrderRecord{return{...o,shippingAddress:{...o.shippingAddress},lines:o.lines.map((l)=>({...l}))};}

function PedidosPanel() {
  const [rows,setRows]=useState(()=>ADMIN_ORDERS.map(cloneO));
  const [query,setQuery]=useState("");
  const [statusFilter,setStatusFilter]=useState<"all"|AdminOrderStatus>("all");
  const [page,setPage]=useState(0);
  const [selId,setSelId]=useState(ADMIN_ORDERS[0]?.id??"");
  const [draft,setDraft]=useState<AdminOrderRecord|null>(ADMIN_ORDERS[0]?cloneO(ADMIN_ORDERS[0]):null);
  const [msg,setMsg]=useState("");

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter((o)=>{if(statusFilter!=="all"&&o.status!==statusFilter)return false;return`${o.orderNumber} ${o.customerName} ${o.customerEmail} ${o.customerPhone}`.toLowerCase().includes(q);});},[rows,query,statusFilter]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE));
  const safe=Math.min(page,pages-1);
  const paged=filtered.slice(safe*PAGE,safe*PAGE+PAGE);
  const selected=rows.find((o)=>o.id===selId)??null;

  useEffect(()=>{setPage(0);},[query,statusFilter]);
  useEffect(()=>{if(!filtered.length){setSelId("");setDraft(null);return;}if(!filtered.some((o)=>o.id===selId))setSelId(filtered[0]!.id);},[filtered,selId]);
  useEffect(()=>{setDraft(selected?cloneO(selected):null);},[selected]);

  const save=()=>{if(!draft)return;setRows((r)=>r.map((o)=>o.id===draft.id?draft:o));setMsg("Pedido actualizado.");};
  const quickStatus=(s:AdminOrderStatus)=>setDraft((d)=>d?{...d,status:s}:d);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_400px]">
      <Panel title="Bandeja" eyebrow="Pedidos" actions={
        <div className="flex flex-wrap gap-2">
          {(["all","pending_payment","paid","processing","shipped","cancelled"] as const).map((s)=>(
            <Btn key={s} tone={statusFilter===s?"primary":"ghost"} onClick={()=>setStatusFilter(s)}>{s==="all"?"Todos":formatAdminOrderStatus(s)}</Btn>
          ))}
        </div>
      }>
        <div className="mb-4 flex gap-3"><Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por pedido, cliente, email o teléfono" /><div className="shrink-0 rounded-xl border border-foreground/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">{filtered.length}</div></div>
        {!paged.length?<Empty title="Sin pedidos" body="Prueba otro estado o búsqueda." />:(
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <tr><th className="pb-3 pr-3">Pedido</th><th className="pb-3 pr-3">Cliente</th><th className="pb-3 pr-3">Método</th><th className="pb-3 pr-3">Estado</th><th className="pb-3 pr-3">Total</th></tr>
                </thead>
                <tbody>
                  {paged.map((o)=>(
                    <tr key={o.id} onClick={()=>setSelId(o.id)} className={`cursor-pointer border-t border-foreground/8 transition-colors ${selId===o.id?"bg-muted/60":"hover:bg-muted/30"}`}>
                      <td className="py-3 pr-3"><div className="font-bold">{o.orderNumber}</div><div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("es-DO")}</div></td>
                      <td className="py-3 pr-3"><div>{o.customerName}</div><div className="text-xs text-muted-foreground">{o.customerPhone}</div></td>
                      <td className="py-3 pr-3">{formatAdminPaymentMethod(o.paymentMethod)}</td>
                      <td className="py-3 pr-3"><Tag tone={o.status==="pending_payment"?"warn":o.status==="paid"?"dark":"soft"}>{formatAdminOrderStatus(o.status)}</Tag></td>
                      <td className="py-3 pr-3 font-bold">{formatPrice(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3"><Pagination page={safe} pages={pages} onChange={setPage} /></div>
          </>
        )}
      </Panel>
      <Panel title={draft?draft.orderNumber:"Detalle"} eyebrow="Gestión" actions={<Btn tone="primary" onClick={save} disabled={!draft}>Guardar</Btn>}>
        {draft?(
          <div className="grid gap-4">
            <SaveMsg msg={msg} />
            <div className="rounded-lg bg-muted/40 px-3 py-3 text-sm"><div className="font-bold">{draft.customerName}</div><div className="mt-1 text-[#6b5a55]">{draft.customerEmail}</div><div className="text-[#6b5a55]">{draft.customerPhone}</div></div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Estado">
                <Select value={draft.status} onChange={(e)=>setDraft((d)=>d?{...d,status:e.target.value as AdminOrderStatus}:d)}>
                  <option value="pending_payment">Pendiente pago</option><option value="paid">Pagado</option><option value="processing">Preparando</option><option value="shipped">Enviado</option><option value="cancelled">Cancelado</option>
                </Select>
              </Field>
              <Field label="Método de pago">
                <Select value={draft.paymentMethod} onChange={(e)=>setDraft((d)=>d?{...d,paymentMethod:e.target.value as AdminPaymentMethod}:d)}>
                  <option value="azul">AZUL (tarjeta)</option><option value="transferencia">Transferencia</option><option value="paypal">PayPal</option><option value="whatsapp">WhatsApp</option>
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn tone="secondary" onClick={()=>quickStatus("paid")}>Marcar pagado</Btn>
              <Btn tone="secondary" onClick={()=>quickStatus("processing")}>Preparar</Btn>
              <Btn tone="secondary" onClick={()=>quickStatus("shipped")}>Marcar enviado</Btn>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Dirección"><Input value={draft.shippingAddress.line1} onChange={(e)=>setDraft((d)=>d?{...d,shippingAddress:{...d.shippingAddress,line1:e.target.value}}:d)} /></Field>
              <Field label="Ciudad, Provincia"><Input value={`${draft.shippingAddress.city}, ${draft.shippingAddress.province}`} onChange={(e)=>{const[city="",province=""]=e.target.value.split(",").map((s)=>s.trim());setDraft((d)=>d?{...d,shippingAddress:{...d.shippingAddress,city,province}}:d);}}/></Field>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Líneas del pedido</div>
              {draft.lines.map((l,i)=>(
                <div key={`${l.productId}-${i}`} className="rounded-2xl border border-foreground/10 px-3 py-2 mb-2">
                  <div className="text-sm font-bold">{l.productName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{l.variantLabel} · {l.quantity} × {formatPrice(l.unitPrice)}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-foreground/10 p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(draft.subtotal)}</span></div>
              <div className="mt-1 flex justify-between"><span>Envío</span><span>{formatPrice(draft.shipping)}</span></div>
              <div className="mt-3 flex justify-between text-base font-black"><span>Total</span><span>{formatPrice(draft.total)}</span></div>
            </div>
            <Field label="Notas internas"><Textarea rows={4} value={draft.notes} onChange={(e)=>setDraft((d)=>d?{...d,notes:e.target.value}:d)} /></Field>
          </div>
        ):<Empty title="Sin pedido seleccionado" body="Selecciona un pedido de la bandeja." />}
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   DESCUENTOS panel
───────────────────────────────────────────────────── */
function cloneD(d:AdminDiscountRecord):AdminDiscountRecord{return{...d};}
function blankD():AdminDiscountRecord{return{id:`draft-disc-${Date.now()}`,code:"",label:"",type:"percentage",value:10,active:false,scope:"store"};}

function DescuentosPanel() {
  const [rows,setRows]=useState(()=>ADMIN_DISCOUNTS.map(cloneD));
  const [query,setQuery]=useState("");
  const [selId,setSelId]=useState(ADMIN_DISCOUNTS[0]?.id??"");
  const [draft,setDraft]=useState<AdminDiscountRecord|null>(ADMIN_DISCOUNTS[0]?cloneD(ADMIN_DISCOUNTS[0]):null);
  const [msg,setMsg]=useState("");

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter((d)=>`${d.code} ${d.label}`.toLowerCase().includes(q));},[rows,query]);
  const selected=rows.find((d)=>d.id===selId)??null;

  useEffect(()=>{if(!filtered.length){setSelId("");setDraft(null);return;}if(!filtered.some((d)=>d.id===selId))setSelId(filtered[0]!.id);},[filtered,selId]);
  useEffect(()=>{setDraft(selected?cloneD(selected):null);},[selected]);

  const save=()=>{if(!draft)return;const n={...draft,code:draft.code.trim().toUpperCase(),label:draft.label.trim()};setRows((r)=>r.map((d)=>d.id===draft.id?n:d));setMsg("Descuento guardado.");};
  const create=()=>{const b=blankD();setRows((r)=>[b,...r]);setSelId(b.id);setDraft(b);setMsg("Nuevo descuento creado.");};

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <Panel title="Campañas" eyebrow="Promociones" actions={<Btn tone="primary" onClick={create}>Nuevo descuento</Btn>}>
        <div className="mb-4 flex gap-3"><Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por código o nombre" /><div className="shrink-0 rounded-xl border border-foreground/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">{filtered.length}</div></div>
        {!filtered.length?<Empty title="Sin descuentos" body="Crea tu primera promoción." action={<Btn tone="primary" onClick={create}>Crear</Btn>} />:(
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d)=>(
              <button key={d.id} type="button" onClick={()=>setSelId(d.id)} className={`rounded-3xl border p-4 text-left transition-colors ${selId===d.id?"border-foreground bg-muted/60":"border-foreground/10 bg-muted/20 hover:bg-muted/50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-sm font-black">{d.code||"Sin código"}</div><div className="mt-1 text-xs text-muted-foreground">{d.label||"Sin nombre"}</div></div>
                  <Tag tone={d.active?"dark":"soft"}>{d.active?"Activo":"Pausado"}</Tag>
                </div>
                <div className="mt-4 text-2xl font-black">{d.type==="percentage"?`${d.value}%`:`RD$${d.value}`}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.16em] text-[#7c665f]">{getVibeLabel(d.scope)}</div>
              </button>
            ))}
          </div>
        )}
      </Panel>
      <Panel title={draft?.code||"Editor"} eyebrow="Detalle" actions={<Btn tone="primary" onClick={save} disabled={!draft}>Guardar</Btn>}>
        {draft?(
          <div className="grid gap-4">
            <SaveMsg msg={msg} />
            <Field label="Código"><Input value={draft.code} onChange={(e)=>setDraft((d)=>d?{...d,code:e.target.value}:d)} /></Field>
            <Field label="Nombre interno"><Input value={draft.label} onChange={(e)=>setDraft((d)=>d?{...d,label:e.target.value}:d)} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tipo">
                <Select value={draft.type} onChange={(e)=>setDraft((d)=>d?{...d,type:e.target.value as AdminDiscountRecord["type"]}:d)}>
                  <option value="percentage">Porcentaje</option><option value="fixed">Monto fijo</option>
                </Select>
              </Field>
              <Field label="Valor"><Input type="number" value={draft.value} onChange={(e)=>setDraft((d)=>d?{...d,value:Number(e.target.value)}:d)} /></Field>
            </div>
            <Field label="Aplica a">
              <Select value={draft.scope} onChange={(e)=>setDraft((d)=>d?{...d,scope:e.target.value as AdminDiscountRecord["scope"]}:d)}>
                <option value="store">General</option><option value="moon">Moon</option><option value="sunshine">Sunshine</option><option value="men">Men</option>
              </Select>
            </Field>
            <Checkbox label="Descuento activo" checked={draft.active} onCheckedChange={(v)=>setDraft((d)=>d?{...d,active:v}:d)} />
          </div>
        ):<Empty title="Sin selección" body="Selecciona una promoción o crea una nueva." action={<Btn tone="primary" onClick={create}>Crear descuento</Btn>} />}
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MEDIA panel
───────────────────────────────────────────────────── */
function cloneM(m:AdminMediaRecord):AdminMediaRecord{return{...m,fallback:[...m.fallback] as [string,string]};}

function MediaPanel() {
  const [rows,setRows]=useState(()=>ADMIN_MEDIA.map(cloneM));
  const [scope,setScope]=useState<"all"|Vibe>("all");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(0);
  const [selId,setSelId]=useState(ADMIN_MEDIA[0]?.id??"");
  const [draft,setDraft]=useState<AdminMediaRecord|null>(ADMIN_MEDIA[0]?cloneM(ADMIN_MEDIA[0]):null);
  const [msg,setMsg]=useState("");

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter((m)=>{if(scope!=="all"&&m.vibe!==scope)return false;return`${m.productName} ${m.label}`.toLowerCase().includes(q);});},[rows,scope,query]);
  const pages=Math.max(1,Math.ceil(filtered.length/10));
  const safe=Math.min(page,pages-1);
  const paged=filtered.slice(safe*10,safe*10+10);
  const selected=rows.find((m)=>m.id===selId)??null;

  useEffect(()=>{setPage(0);},[scope,query]);
  useEffect(()=>{if(!filtered.length){setSelId("");setDraft(null);return;}if(!filtered.some((m)=>m.id===selId))setSelId(filtered[0]!.id);},[filtered,selId]);
  useEffect(()=>{setDraft(selected?cloneM(selected):null);},[selected]);

  const save=()=>{if(!draft)return;setRows((r)=>r.map((m)=>m.id===draft.id?draft:m));setMsg("Media actualizada.");};

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_390px]">
      <Panel title="Biblioteca" eyebrow="Assets" actions={
        <div className="flex flex-wrap gap-2">
          {(["all","moon","sunshine","men"] as const).map((s)=>(
            <Btn key={s} tone={scope===s?"primary":"ghost"} onClick={()=>setScope(s)}>{s==="all"?"Todos":getVibeLabel(s)}</Btn>
          ))}
        </div>
      }>
        <div className="mb-4 flex gap-3"><Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por producto o label" /><div className="shrink-0 rounded-xl border border-foreground/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">{filtered.length} assets</div></div>
        {!paged.length?<Empty title="Sin assets" body="Prueba otro filtro." />:(
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {paged.map((m)=>(
                <button key={m.id} type="button" onClick={()=>setSelId(m.id)} className={`rounded-3xl border p-3 text-left transition-colors ${selId===m.id?"border-foreground bg-muted/60":"border-foreground/10 bg-muted/20 hover:bg-muted/50"}`}>
                  <div className="aspect-square rounded-2xl" style={{background:`linear-gradient(135deg,${m.fallback[0]},${m.fallback[1]})`}}>
                    {m.url?<img src={m.url} alt={m.productName} className="h-full w-full rounded-2xl object-cover" />:<div className="flex h-full items-center justify-center text-2xl font-black text-white/80">{m.productName.slice(0,2).toUpperCase()}</div>}
                  </div>
                  <div className="mt-3 text-sm font-bold">{m.productName}</div>
                  <div className="mt-2 flex items-center justify-between gap-2"><Tag>{getVibeLabel(m.vibe)}</Tag><span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7c665f]">{m.label}</span></div>
                </button>
              ))}
            </div>
            <div className="mt-3"><Pagination page={safe} pages={pages} onChange={setPage} /></div>
          </>
        )}
      </Panel>
      <Panel title={draft?.productName||"Inspector"} eyebrow="Detalle" actions={<Btn tone="primary" onClick={save} disabled={!draft}>Guardar</Btn>}>
        {draft?(
          <div className="grid gap-4">
            <SaveMsg msg={msg} />
            <div className="aspect-square rounded-3xl" style={{background:`linear-gradient(135deg,${draft.fallback[0]},${draft.fallback[1]})`}}>
              {draft.url?<img src={draft.url} alt={draft.productName} className="h-full w-full rounded-3xl object-cover" />:<div className="flex h-full items-center justify-center text-4xl font-black text-white/80">{draft.productName.slice(0,2).toUpperCase()}</div>}
            </div>
            <Field label="Producto"><Input value={draft.productName} onChange={(e)=>setDraft((d)=>d?{...d,productName:e.target.value}:d)} /></Field>
            <Field label="Label interno"><Input value={draft.label} onChange={(e)=>setDraft((d)=>d?{...d,label:e.target.value}:d)} /></Field>
            <Field label="URL"><Input value={draft.url??""} onChange={(e)=>setDraft((d)=>d?{...d,url:e.target.value||null}:d)} placeholder="https://..." /></Field>
            <div className="rounded-2xl border border-dashed border-foreground/20 px-3 py-4 text-sm text-muted-foreground">El upload real se conectará a R2 cuando esté disponible.</div>
          </div>
        ):<Empty title="Sin asset seleccionado" body="Selecciona un asset de la biblioteca." />}
      </Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   CONFIGURACIÓN panel
───────────────────────────────────────────────────── */
function ConfigPanel() {
  const [form,setForm]=useState(ADMIN_SETTINGS);
  const [msg,setMsg]=useState("");

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_390px]">
      <div className="grid gap-4">
        <Panel title="Pago con AZUL" eyebrow="Tarjeta de crédito">
          <SaveMsg msg={msg} />
          <div className="mb-3 rounded-2xl border border-foreground/10 bg-[#f7f2ec] px-3 py-2 text-xs leading-5 text-[#5f4941]">
            AZUL es la pasarela dominicana. Configura tus credenciales de merchant para habilitar pagos con tarjeta.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Merchant ID"><Input value={form.azulMerchantId} placeholder="39038540035" onChange={(e)=>setForm({...form,azulMerchantId:e.target.value})} /></Field>
            <Field label="Merchant Name"><Input value={form.azulMerchantName} placeholder="PULPINA RD" onChange={(e)=>setForm({...form,azulMerchantName:e.target.value})} /></Field>
            <Field label="Merchant Type"><Input value={form.azulMerchantType} onChange={(e)=>setForm({...form,azulMerchantType:e.target.value})} /></Field>
            <Field label="Nombre del negocio"><Input value={form.businessName} onChange={(e)=>setForm({...form,businessName:e.target.value})} /></Field>
          </div>
        </Panel>
        <Panel title="Cobro manual" eyebrow="Transferencia / PayPal">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Banco"><Input value={form.bankName} onChange={(e)=>setForm({...form,bankName:e.target.value})} /></Field>
            <Field label="Tipo de cuenta"><Input value={form.bankAccountType} onChange={(e)=>setForm({...form,bankAccountType:e.target.value})} /></Field>
            <Field label="Número de cuenta"><Input value={form.bankAccountNumber} onChange={(e)=>setForm({...form,bankAccountNumber:e.target.value})} /></Field>
            <Field label="Titular"><Input value={form.bankAccountOwner} onChange={(e)=>setForm({...form,bankAccountOwner:e.target.value})} /></Field>
            <Field label="Correo PayPal"><Input value={form.paypalEmail} onChange={(e)=>setForm({...form,paypalEmail:e.target.value})} /></Field>
          </div>
        </Panel>
        <Panel title="Soporte y contacto" eyebrow="Atención">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Email soporte"><Input value={form.supportEmail} onChange={(e)=>setForm({...form,supportEmail:e.target.value})} /></Field>
            <Field label="WhatsApp label"><Input value={form.whatsappLabel} onChange={(e)=>setForm({...form,whatsappLabel:e.target.value})} /></Field>
            <Field label="WhatsApp número" full><Input value={form.whatsappNumber} onChange={(e)=>setForm({...form,whatsappNumber:e.target.value})} /></Field>
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 content-start">
        <Panel title="Acceso del equipo" eyebrow="Cloudflare Access">
          <div className="rounded-lg bg-muted/40 p-3 text-sm leading-6 text-[#5f4941]">
            En local el admin queda abierto mientras uses <code>pnpm dev</code>. Fuera de local, la ruta exige Cloudflare Access y una identidad reenviada por Cloudflare.
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-foreground/10 bg-white px-3 py-3 text-sm leading-6 text-[#5f4941]">
              <p><code>ADMIN_ALLOWED_HOSTS</code> limita en qué host corre el admin.</p>
              <p><code>ADMIN_ALLOWED_EMAILS</code> y <code>ADMIN_ALLOWED_EMAIL_DOMAINS</code> limitan quién entra si Cloudflare ya autenticó la solicitud.</p>
              <p>La policy principal sigue viviendo en Cloudflare Zero Trust sobre <code>/admin*</code>.</p>
            </div>
            <div className="rounded-2xl border border-dashed border-foreground/15 bg-white/70 px-3 py-3 text-xs leading-5 text-[#6b5a55]">
              Esta pantalla ya no edita correos autorizados. Cambia la policy de Cloudflare o los env del servidor para modificar acceso real.
            </div>
          </div>
        </Panel>
        <Panel title="Notas técnicas" eyebrow="Infra">
          <div className="grid gap-2 text-sm leading-6 text-[#5f4941]">
            <p>D1 guardará catálogo, pedidos y settings reales.</p>
            <p>R2 será la capa de imágenes cuando conectemos upload real.</p>
            <p>El checkout soporta AZUL, transferencia, PayPal y WhatsApp.</p>
          </div>
        </Panel>
        <div className="flex justify-end"><Btn tone="primary" onClick={()=>setMsg("Configuración guardada en la interfaz. El acceso admin se controla por Cloudflare Access y env del servidor.")}>Guardar cambios</Btn></div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Main SPA shell
───────────────────────────────────────────────────── */
const NAV_ITEMS: Array<{ section: AdminSection; label: string; icon: typeof LayoutGrid }> = [
  { section:"resumen",       label:"Resumen",       icon:LayoutGrid },
  { section:"productos",     label:"Productos",     icon:Package2 },
  { section:"categorias",    label:"Categorías",    icon:Boxes },
  { section:"colecciones",   label:"Colecciones",   icon:FolderKanban },
  { section:"pedidos",       label:"Pedidos",       icon:ShoppingBag },
  { section:"descuentos",    label:"Descuentos",    icon:Percent },
  { section:"media",         label:"Media",         icon:Image },
  { section:"configuracion", label:"Configuración", icon:Settings2 },
];

const SECTION_META: Record<AdminSection, { title: string; subtitle: string }> = {
  resumen:       { title:"Resumen operativo",  subtitle:"Vista compacta para revisar stock, pedidos y salud general de la tienda." },
  productos:     { title:"Productos",          subtitle:"Catálogo con búsqueda, paginación y editor lateral." },
  categorias:    { title:"Categorías",         subtitle:"Taxonomía con editor lateral. Controla qué categorías existen y cuáles son NSFW." },
  colecciones:   { title:"Colecciones",        subtitle:"Drops, edits y sets de merchandising para cada subtienda." },
  pedidos:       { title:"Pedidos",            subtitle:"Valida pagos, corrige datos y actualiza estados sin perder contexto." },
  descuentos:    { title:"Descuentos",         subtitle:"Promociones y códigos de descuento para toda la tienda." },
  media:         { title:"Media",              subtitle:"Biblioteca de assets por producto y subtienda." },
  configuracion: { title:"Configuración",      subtitle:"Datos de pago, contacto y acceso del equipo." },
};

function AdminSPA() {
  const [section, setSection] = useState<AdminSection>("resumen");
  const meta = SECTION_META[section];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-[1540px] gap-4 px-4 py-4 xl:grid-cols-[220px_minmax(0,1fr)]">

        {/* ── Sidebar ── */}
        <aside className="rounded-xl border border-foreground/15 bg-card shadow-sm xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:overflow-hidden">
          {/* Brand */}
          <div className="flex items-center gap-3 border-b border-foreground/8 px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</div>
              <div className="truncate text-sm font-bold">Pulpiña Store</div>
            </div>
          </div>
          {/* Nav */}
          <nav className="p-2 grid gap-0.5">
            {NAV_ITEMS.map(({ section: s, label, icon: Icon }) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors text-left ${
                  section === s
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0">
          {/* Section header */}
          <header className="mb-4 rounded-xl border border-foreground/15 bg-card px-5 py-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Panel interno
            </div>
            <h1 className="mt-1 text-xl font-bold md:text-2xl">{meta.title}</h1>
            <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">{meta.subtitle}</p>
          </header>

          <main>
            {section === "resumen"       && <ResumenPanel       onNav={setSection} />}
            {section === "productos"     && <ProductosPanel />}
            {section === "categorias"    && <CategoriasPanel />}
            {section === "colecciones"   && <ColeccionesPanel />}
            {section === "pedidos"       && <PedidosPanel />}
            {section === "descuentos"    && <DescuentosPanel />}
            {section === "media"         && <MediaPanel />}
            {section === "configuracion" && <ConfigPanel />}
          </main>
        </div>
      </div>
    </div>
  );
}
