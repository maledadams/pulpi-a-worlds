import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveTheme } from "@/context/theme";
import { effectAllowed, type DeviceProfile, type HeroId } from "@/lib/hero-effect-budget";
import { particleLookFor } from "@/lib/theme-schema";

function deviceProfile(): DeviceProfile {
  const navigatorInfo = navigator as Navigator & { deviceMemory?: number };
  return {
    cores: navigatorInfo.hardwareConcurrency || 4,
    memoryGb: navigatorInfo.deviceMemory ?? 4,
    isPhone: window.matchMedia("(width < 60rem)").matches,
  };
}

/**
 * The active theme's animated layer for one hero (spec §5.4): above the hero's
 * background, below its logo and text. Renders nothing unless the theme has an effect
 * for this hero; the engine itself is downloaded only when the effect actually runs
 * (not with reduced motion, data saver, or on phones when turned off there).
 */
export function HeroEffect({ hero }: { hero: HeroId }) {
  const theme = useActiveTheme();
  const shared = theme?.heroEffect ?? null;
  // This hero's own particle look (Moon, Sunshine and Men can differ), over the shared one.
  const effect = useMemo(
    () => (shared ? { ...shared, ...particleLookFor(shared, hero) } : null),
    [shared, hero],
  );
  const particleUrl = effect?.particleAsset ? theme?.assets[effect.particleAsset]?.url : undefined;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    setRun(
      effectAllowed(effect, hero, {
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        saveData: Boolean(connection?.saveData),
        isPhone: window.matchMedia("(width < 60rem)").matches,
      }),
    );
  }, [effect, hero]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!run || !canvas || !effect) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    import("@/components/theme/hero-effect-engine")
      .then(({ startHeroEffect }) => {
        if (!cancelled)
          stop = startHeroEffect(canvas, { effect, particleUrl, device: deviceProfile() });
      })
      .catch((error: unknown) => console.error("[themes] hero effect failed to load", error));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [run, effect, particleUrl]);

  if (!effect?.heroes[hero]) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
