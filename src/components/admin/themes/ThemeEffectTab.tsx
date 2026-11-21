import { useState } from "react";
import {
  AdminButton,
  AdminCheckbox,
  AdminField,
  AdminSelect,
} from "@/components/admin/AdminControls";
import { AdminPanel } from "@/components/admin/AdminShell";
import type { DocUpdate } from "@/components/admin/themes/ThemeEditor";
import { AssetPicker, type LibraryAsset } from "@/components/admin/themes/ThemeEditorParts";
import { PRESET_COLORS, effectColors } from "@/lib/hero-effect-colors";
import {
  HERO_IDS,
  particleLookFor,
  type ParticleLook,
  type ThemeDocument,
  type ThemeHeroEffect,
  type ThemeHeroWave,
} from "@/lib/theme-schema";

const PRESETS: Array<{ id: ThemeHeroEffect["preset"]; label: string }> = [
  { id: "snow", label: "Nieve" },
  { id: "hearts", label: "Corazones" },
  { id: "clovers", label: "Tréboles" },
  { id: "fireworks", label: "Fuegos artificiales" },
  { id: "pride", label: "Pride (arcoíris suave)" },
  { id: "confetti", label: "Confeti" },
  { id: "sparkles", label: "Destellos" },
  { id: "leaves", label: "Hojas" },
  { id: "petals", label: "Pétalos" },
  { id: "custom", label: "Mi propia imagen" },
];

const HEROES: Array<{ id: keyof ThemeHeroEffect["heroes"]; label: string }> = [
  { id: "home", label: "Inicio (Elige tu Tienda o el banner)" },
  { id: "moon", label: "Moon" },
  { id: "sunshine", label: "Sunshine" },
  { id: "men", label: "Men" },
];

type LookTarget = "all" | (typeof HERO_IDS)[number];
const LOOK_TARGETS: Array<{ id: LookTarget; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "home", label: "Inicio" },
  { id: "moon", label: "Moon" },
  { id: "sunshine", label: "Sunshine" },
  { id: "men", label: "Men" },
];

const STARTER: ThemeHeroEffect = {
  preset: "snow",
  particleAsset: null,
  density: "medium",
  speed: "slow",
  color: null,
  presetColors: null,
  tint: 100,
  opacity: 100,
  perHero: {},
  phone: true,
  heroes: { home: true, moon: false, sunshine: false, men: false },
};

/** A labelled 0-100 slider with its value, for the particle color and opacity. */
function PercentSlider({
  label,
  hint,
  value,
  min,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="flex items-center justify-between text-sm font-medium">
        {label}
        <span className="text-xs tabular-nums text-[var(--admin-muted)]">{value}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={100}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--admin-select)]"
      />
      <span className="text-xs text-[var(--admin-faint)]">{hint}</span>
    </label>
  );
}

function HeroEffectPanel({
  doc,
  update,
  assets,
  onUploaded,
  onError,
}: {
  doc: ThemeDocument;
  update: DocUpdate;
  assets: LibraryAsset[];
  onUploaded: (asset: LibraryAsset) => void;
  onError: (message: string) => void;
}) {
  const effect = doc.heroEffect;
  const set = (change: Partial<ThemeHeroEffect>) =>
    update((current) => ({
      ...current,
      heroEffect: { ...(current.heroEffect ?? STARTER), ...change },
    }));

  const [target, setTarget] = useState<LookTarget>("all");
  if (!effect) {
    return (
      <AdminPanel title="Efecto del hero">
        <div className="grid gap-3">
          <p className="text-sm text-[var(--admin-muted)]">
            Una capa animada sobre el fondo del hero (nieve, corazones, confeti…), detrás del logo y
            del texto. Se apaga sola en teléfonos con "reducir movimiento" o ahorro de datos.
          </p>
          <AdminButton tone="add" onClick={() => set({})}>
            Agregar efecto
          </AdminButton>
        </div>
      </AdminPanel>
    );
  }

  // The look being edited: the shared one, or one hero's own (Lucia, 2026-11-20).
  const look: ParticleLook =
    target === "all"
      ? {
          color: effect.color,
          tint: effect.tint,
          presetColors: effect.presetColors,
          opacity: effect.opacity,
        }
      : particleLookFor(effect, target);
  const setLook = (change: Partial<ParticleLook>) =>
    target === "all"
      ? set({ ...change, perHero: {} })
      : set({ perHero: { ...effect.perHero, [target]: { ...look, ...change } } });

  return (
    <AdminPanel
      title="Efecto del hero"
      actions={
        <AdminButton
          tone="danger"
          onClick={() => update((current) => ({ ...current, heroEffect: null }))}
        >
          Quitar efecto
        </AdminButton>
      }
    >
      <div className="grid gap-3">
        <AdminField label="Efecto">
          <AdminSelect
            value={effect.preset}
            // Another effect has other colors: start from its own.
            onChange={(event) =>
              set({
                preset: event.target.value as ThemeHeroEffect["preset"],
                presetColors: null,
                perHero: Object.fromEntries(
                  Object.entries(effect.perHero ?? {}).map(([hero, own]) => [
                    hero,
                    { ...own, presetColors: null },
                  ]),
                ),
              })
            }
          >
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        {effect.preset === "custom" ? (
          <AssetPicker
            label="Partícula (imagen pequeña con fondo transparente: un lazo, una corona, una calabaza…)"
            assets={assets}
            value={effect.particleAsset}
            onChange={(particleAsset) => set({ particleAsset })}
            onUploaded={onUploaded}
            onError={onError}
          />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <AdminField label="Cantidad">
            <AdminSelect
              value={effect.density}
              onChange={(event) =>
                set({ density: event.target.value as ThemeHeroEffect["density"] })
              }
            >
              <option value="low">Poca</option>
              <option value="medium">Media</option>
              <option value="high">Mucha</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Velocidad">
            <AdminSelect
              value={effect.speed}
              onChange={(event) => set({ speed: event.target.value as ThemeHeroEffect["speed"] })}
            >
              <option value="slow">Lenta</option>
              <option value="medium">Media</option>
              <option value="fast">Rápida</option>
            </AdminSelect>
          </AdminField>
        </div>
        <div className="grid gap-1.5">
          <div className="text-xs font-semibold text-[var(--admin-faint)]">Colores para</div>
          <div className="flex flex-wrap gap-1">
            {LOOK_TARGETS.filter((entry) => entry.id === "all" || effect.heroes[entry.id]).map(
              (entry) => (
                <AdminButton
                  key={entry.id}
                  tone={target === entry.id ? "active" : "ghost"}
                  onClick={() => setTarget(entry.id)}
                >
                  {entry.label}
                  {entry.id !== "all" && effect.perHero?.[entry.id] ? " •" : ""}
                </AdminButton>
              ),
            )}
          </div>
          <span className="text-xs text-[var(--admin-faint)]">
            {target === "all"
              ? "Lo que cambies aquí vale para todos los heroes y borra los colores propios de cada uno."
              : "Solo para este hero. Los marcados con • tienen sus propios colores."}
          </span>
        </div>
        {PRESET_COLORS[effect.preset] ? (
          <div className="grid gap-2 rounded-xl border border-[var(--admin-edge)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {effect.preset === "pride" ? "Colores del arcoíris" : "Colores del efecto"}
              </span>
              <AdminButton
                tone="ghost"
                disabled={!look.presetColors}
                onClick={() => setLook({ presetColors: null })}
              >
                Restaurar
              </AdminButton>
            </div>
            <div className="flex flex-wrap gap-2">
              {effectColors(effect.preset, look.presetColors).map((color, index) => (
                <input
                  key={index}
                  type="color"
                  aria-label={`Color ${index + 1} del efecto`}
                  value={color}
                  onChange={(event) => {
                    const next = [...(look.presetColors ?? [])];
                    while (next.length <= index) next.push(null);
                    next[index] = event.target.value;
                    setLook({ presetColors: next });
                  }}
                  className="h-9 w-11 cursor-pointer border border-[var(--admin-line-strong)] bg-transparent p-0.5"
                />
              ))}
            </div>
            <span className="text-xs text-[var(--admin-faint)]">
              Cada color del efecto, uno por uno. El filtro de abajo los tiñe todos a la vez.
            </span>
          </div>
        ) : null}
        {effect.preset === "pride" ? null : (
          <div className="grid gap-2 rounded-xl border border-[var(--admin-edge)] p-3">
            <div className="text-sm font-medium">Filtro de color</div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminButton
                tone={look.color ? "ghost" : "active"}
                onClick={() => setLook({ color: null })}
              >
                {effect.preset === "custom" ? "Los de la imagen" : "Sus colores"}
              </AdminButton>
              <AdminButton
                tone={look.color ? "active" : "ghost"}
                onClick={() => setLook({ color: look.color ?? "#ff4e8a" })}
              >
                Un color
              </AdminButton>
              {look.color ? (
                <input
                  type="color"
                  aria-label="Color de las partículas"
                  value={look.color}
                  onChange={(event) => setLook({ color: event.target.value })}
                  className="h-9 w-12 cursor-pointer border border-[var(--admin-line-strong)] bg-transparent p-0.5"
                />
              ) : null}
            </div>
            {look.color ? (
              <PercentSlider
                label="Fuerza del color"
                hint="Como un filtro: tiñe las partículas sin volverlas transparentes. 100% = todas de ese color."
                value={look.tint}
                min={0}
                onChange={(tint) => setLook({ tint })}
              />
            ) : null}
          </div>
        )}
        <PercentSlider
          label={effect.preset === "pride" ? "Opacidad del arcoíris" : "Opacidad de las partículas"}
          hint="Qué tan transparentes se ven. 100% = sólidas."
          value={look.opacity}
          min={5}
          onChange={(opacity) => setLook({ opacity })}
        />
        <AdminCheckbox
          label="Mostrar también en teléfonos"
          checked={effect.phone}
          onCheckedChange={(phone) => set({ phone })}
        />
        <div className="grid gap-1.5">
          <div className="text-xs font-semibold text-[var(--admin-faint)]">Heroes</div>
          {HEROES.map((hero) => (
            <AdminCheckbox
              key={hero.id}
              label={hero.label}
              checked={effect.heroes[hero.id]}
              onCheckedChange={(checked) =>
                set({ heroes: { ...effect.heroes, [hero.id]: checked } })
              }
            />
          ))}
        </div>
      </div>
    </AdminPanel>
  );
}

/** The sub-stores' wave under the Inicio hero: on/off, the color under it and its outline. */
function HeroWavePanel({ doc, update }: { doc: ThemeDocument; update: DocUpdate }) {
  const wave = doc.heroWave;
  const set = (change: Partial<ThemeHeroWave> | null) =>
    update((current) => ({
      ...current,
      heroWave: change === null ? null : { line: "#ff4ea3", fill: null, ...current.heroWave, ...change },
    }));
  return (
    <AdminPanel
      title="Ola bajo el hero de Inicio"
      actions={
        wave ? (
          <AdminButton tone="danger" onClick={() => set(null)}>
            Quitar ola
          </AdminButton>
        ) : (
          <AdminButton tone="add" onClick={() => set({})}>
            Agregar ola
          </AdminButton>
        )
      }
    >
      {wave ? (
        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Color debajo de la ola</div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminButton tone={wave.fill ? "ghost" : "active"} onClick={() => set({ fill: null })}>
                El fondo de la página
              </AdminButton>
              <AdminButton
                tone={wave.fill ? "active" : "ghost"}
                onClick={() => set({ fill: wave.fill ?? "#ffffff" })}
              >
                Otro color
              </AdminButton>
              {wave.fill ? (
                <input
                  type="color"
                  aria-label="Color debajo de la ola"
                  value={wave.fill}
                  onChange={(event) => set({ fill: event.target.value })}
                  className="h-9 w-12 cursor-pointer border border-[var(--admin-line-strong)] bg-transparent p-0.5"
                />
              ) : null}
            </div>
            <span className="text-xs text-[var(--admin-faint)]">
              Con "El fondo de la página" sigue solo al color de Fondo general del tema.
            </span>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="color"
              aria-label="Color de la línea de la ola"
              value={wave.line}
              onChange={(event) => set({ line: event.target.value })}
              className="h-9 w-12 cursor-pointer border border-[var(--admin-line-strong)] bg-transparent p-0.5"
            />
            Línea de la ola
          </label>
        </div>
      ) : (
        <p className="text-sm text-[var(--admin-muted)]">
          La ola animada de Moon, Sunshine y Men, en el borde de abajo de "Elige tu Tienda": el
          hero se funde con la página. Ideal para Verano.
        </p>
      )}
    </AdminPanel>
  );
}

export function ThemeEffectTab(props: {
  doc: ThemeDocument;
  update: DocUpdate;
  assets: LibraryAsset[];
  onUploaded: (asset: LibraryAsset) => void;
  onError: (message: string) => void;
}) {
  return (
    <>
      <HeroEffectPanel {...props} />
      <HeroWavePanel doc={props.doc} update={props.update} />
    </>
  );
}
