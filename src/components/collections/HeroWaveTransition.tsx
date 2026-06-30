import { useEffect, useRef } from "react";

type HeroWaveTransitionProps = {
  lineColor: string;
};

let sharedWavePhase = 0;

export function HeroWaveTransition({ lineColor }: HeroWaveTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let observer: ResizeObserver | null = null;
    let width = 0;
    let height = 0;
    let phase = sharedWavePhase;

    const isTransparent = (color: string) =>
      color === "transparent" ||
      color === "rgba(0, 0, 0, 0)" ||
      color === "rgba(0, 0, 0, 0.0)";

    const visibleCatalogBackground = () => {
      const heroSection = canvas.closest("section");
      let candidate = heroSection?.nextElementSibling;

      while (candidate instanceof Element) {
        const color = getComputedStyle(candidate).backgroundColor;
        if (!isTransparent(color)) return color;
        candidate = candidate.parentElement;
      }

      const bodyColor = getComputedStyle(document.body).backgroundColor;
      if (!isTransparent(bodyColor)) return bodyColor;

      const documentColor = getComputedStyle(document.documentElement).backgroundColor;
      if (!isTransparent(documentColor)) return documentColor;

      return "transparent";
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(bounds.width));
      height = Math.max(1, Math.floor(bounds.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const waveY = (x: number) => {
      const base = height * 0.38;
      const horizontalProgress = x / Math.max(width, 1);
      const waveCount = Math.max(1.15, width / 360);
      const mainAngle = horizontalProgress * Math.PI * 2 * waveCount + phase;
      const secondaryAngle =
        horizontalProgress * Math.PI * 2 * waveCount * 0.86 - phase * 0.72 + 1.1;
      const mainWave = Math.sin(mainAngle) * Math.min(15, height * 0.16);
      const waterVariation = Math.sin(secondaryAngle) * Math.min(3, height * 0.035);
      return base + mainWave + waterVariation;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      context.beginPath();
      context.moveTo(0, waveY(0));
      for (let x = 2; x <= width; x += 2) context.lineTo(x, waveY(x));
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.closePath();
      context.fillStyle = visibleCatalogBackground();
      context.fill();

      context.beginPath();
      context.moveTo(0, waveY(0));
      for (let x = 2; x <= width; x += 2) context.lineTo(x, waveY(x));
      context.lineWidth = 2;
      context.strokeStyle = lineColor;
      context.stroke();

      if (!reducedMotion.matches) {
        phase += 0.007;
        sharedWavePhase = phase;
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      draw();
    };

    resize();
    draw();
    observer = new ResizeObserver(() => {
      resize();
      restart();
    });
    observer.observe(canvas);
    reducedMotion.addEventListener("change", restart);
    window.addEventListener("resize", restart);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      reducedMotion.removeEventListener("change", restart);
      window.removeEventListener("resize", restart);
      observer?.disconnect();
    };
  }, [lineColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-[clamp(1.75rem,2.5vw,2.5rem)] left-0 z-20 h-[clamp(4.5rem,7vw,6.5rem)] w-full"
    />
  );
}
