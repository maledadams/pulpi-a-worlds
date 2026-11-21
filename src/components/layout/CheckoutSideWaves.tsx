import { useEffect, useRef } from "react";
import { cssColorToRgbTriplet } from "@/lib/theme-css";

type WaveConfig = {
  amplitude: number;
  frequency: number;
  length: number;
  lineWidth: number;
  opacity: number;
  /** Starting point of the wave's motion. Fixed per line, so adding or
   *  removing another line never changes how this one moves. */
  phase: number;
  progress: number;
  side: "left" | "right";
};

// Default line color; a theme can change it on general pages (--t-checkout-lines).
const WAVE_COLOR = "100, 74, 74";

const BASE_WAVES: WaveConfig[] = [
  {
    side: "left",
    progress: 0.05,
    phase: 0,
    amplitude: 8,
    frequency: 0.013,
    length: 0.024,
    lineWidth: 1.25,
    opacity: 0.12,
  },
  {
    side: "left",
    progress: 0.1,
    phase: 0.8,
    amplitude: 12,
    frequency: 0.009,
    length: 0.02,
    lineWidth: 1.75,
    opacity: 0.12,
  },
  {
    side: "right",
    progress: 0.1,
    phase: 3.2,
    amplitude: 12,
    frequency: 0.009,
    length: 0.02,
    lineWidth: 1.75,
    opacity: 0.12,
  },
  // The line that sat closest to the checkout boxes, moved out to the edge.
  {
    side: "right",
    progress: 0.05,
    phase: 4,
    amplitude: 10,
    frequency: 0.011,
    length: 0.017,
    lineWidth: 1.1,
    opacity: 0.12,
  },
];

export function CheckoutSideWaves() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let observer: ResizeObserver | null = null;
    let width = 0;
    let height = 0;

    const increments = BASE_WAVES.map((wave) => wave.phase);
    let waveColor = WAVE_COLOR;
    const readWaveColor = () => {
      waveColor =
        cssColorToRgbTriplet(getComputedStyle(canvas).getPropertyValue("--t-checkout-lines")) ?? WAVE_COLOR;
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(bounds.width));
      height = Math.max(1, Math.floor(bounds.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      readWaveColor();
    };

    const drawWave = (wave: WaveConfig, phase: number) => {
      const x =
        wave.side === "left" ? width * wave.progress : width - width * wave.progress;

      context.beginPath();
      context.moveTo(x, 0);

      for (let y = 0; y <= height; y += 1) {
        const offset = Math.sin(y * wave.length + phase) * wave.amplitude;
        const waveX = wave.side === "left" ? x + offset : x - offset;
        context.lineTo(waveX, y);
      }

      context.lineWidth = wave.lineWidth;
      context.strokeStyle = `rgba(${waveColor}, ${wave.opacity})`;
      context.stroke();
    };

    let framesSinceColorRead = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      // About once a second, so a theme preview's color change shows without a resize.
      if (++framesSinceColorRead >= 60) {
        framesSinceColorRead = 0;
        readWaveColor();
      }
      context.clearRect(0, 0, width, height);

      BASE_WAVES.forEach((wave, index) => {
        drawWave(wave, increments[index]);
        increments[index] += wave.frequency;
      });
    };

    resize();
    animate();

    observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      observer?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
    />
  );
}
