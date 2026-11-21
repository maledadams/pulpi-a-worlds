// Hero effect canvas engine (spec §5.4, §8). Loaded only when the active theme has an
// effect for a hero on screen, so pages without one never download it.
// One canvas and one animation loop per hero; every shape is drawn once into a small
// sprite and then only copied; the loop stops while the hero is off screen or the tab
// is hidden. Counts and sharpness come from hero-effect-budget.ts.

import { particleBudget, pixelRatioCap, type DeviceProfile } from "@/lib/hero-effect-budget";
import { effectColors } from "@/lib/hero-effect-colors";
import type { ThemeHeroEffect } from "@/lib/theme-schema";

type Sprite = HTMLCanvasElement | HTMLImageElement;
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  phase: number;
  sprite: Sprite;
  alpha: number;
  life: number;
  maxLife: number;
};

const SPEED = { slow: 0.55, medium: 1, fast: 1.7 } as const;
const SPRITE_SIZE = 48;

function sprite(
  draw: (context: CanvasRenderingContext2D, size: number) => void,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const context = canvas.getContext("2d")!;
  draw(context, SPRITE_SIZE);
  return canvas;
}

const circle = (color: string, soft = false) =>
  sprite((context, size) => {
    const radius = size / 2;
    if (soft) {
      const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
    } else {
      context.fillStyle = color;
    }
    context.beginPath();
    context.arc(radius, radius, soft ? radius : radius * 0.8, 0, Math.PI * 2);
    context.fill();
  });

/** A bright spark: solid center with a glow, so bursts read on dark and light heroes. */
const spark = (color: string) =>
  sprite((context, size) => {
    const radius = size / 2;
    const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.25, color);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(radius, radius, radius, 0, Math.PI * 2);
    context.fill();
  });

const heart = (color: string) =>
  sprite((context, size) => {
    const s = size / 32;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(16 * s, 28 * s);
    context.bezierCurveTo(2 * s, 18 * s, 2 * s, 6 * s, 10 * s, 6 * s);
    context.bezierCurveTo(14 * s, 6 * s, 16 * s, 10 * s, 16 * s, 10 * s);
    context.bezierCurveTo(16 * s, 10 * s, 18 * s, 6 * s, 22 * s, 6 * s);
    context.bezierCurveTo(30 * s, 6 * s, 30 * s, 18 * s, 16 * s, 28 * s);
    context.fill();
  });

const clover = (color: string) =>
  sprite((context, size) => {
    const c = size / 2;
    const r = size * 0.18;
    context.fillStyle = color;
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      context.beginPath();
      context.arc(c + dx! * r, c + dy! * r, r, 0, Math.PI * 2);
      context.fill();
    }
  });

const rect = (color: string) =>
  sprite((context, size) => {
    context.fillStyle = color;
    context.fillRect(size * 0.25, size * 0.38, size * 0.5, size * 0.24);
  });

const leaf = (color: string, width = 0.28) =>
  sprite((context, size) => {
    context.fillStyle = color;
    context.beginPath();
    context.ellipse(size / 2, size / 2, size * width, size * 0.44, 0, 0, Math.PI * 2);
    context.fill();
  });

const star = (color: string) =>
  sprite((context, size) => {
    const c = size / 2;
    context.fillStyle = color;
    context.beginPath();
    for (let index = 0; index < 8; index++) {
      const radius = index % 2 ? size * 0.12 : size * 0.48;
      const angle = (Math.PI / 4) * index - Math.PI / 2;
      context.lineTo(c + radius * Math.cos(angle), c + radius * Math.sin(angle));
    }
    context.closePath();
    context.fill();
  });

/** "#rrggbb" + alpha as rgba(), for the soft snowflakes. */
function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** The preset's sprites in its colors (the theme's changes over the defaults). */
function spritesFor(preset: ThemeHeroEffect["preset"], colors: string[]): Sprite[] {
  switch (preset) {
    case "snow":
      return [circle(withAlpha(colors[0]!, 0.95), true), circle(withAlpha(colors[1]!, 0.8), true)];
    case "hearts":
      return colors.map(heart);
    case "clovers":
      return colors.map(clover);
    case "confetti":
      return colors.map(rect);
    case "sparkles":
      return colors.map(star);
    case "leaves":
      return colors.map((color) => leaf(color));
    case "petals":
      return colors.map((color) => leaf(color, 0.22));
    case "fireworks":
      return colors.map(spark);
    default:
      return [];
  }
}

/**
 * The theme's particle color as a filter (Lucia, 2026-11-20): the color is painted over the
 * particle's own shape only (source-atop), at `strength` 0-1, so it recolors without making
 * anything see-through. Done once per sprite, never per frame. Images are drawn at most
 * 128 px, plenty for particles of ~20 px.
 */
export function tintSprite(source: Sprite, color: string | null, strength: number): Sprite {
  if (!color || strength <= 0) return source;
  const naturalWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const naturalHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const scale = Math.min(1, 128 / Math.max(naturalWidth, naturalHeight, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-atop";
  context.globalAlpha = Math.min(1, strength);
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export type HeroEffectOptions = {
  effect: ThemeHeroEffect;
  particleUrl?: string;
  device: DeviceProfile;
};

/** Starts the effect on the canvas; returns the function that stops it and frees everything. */
export function startHeroEffect(canvas: HTMLCanvasElement, options: HeroEffectOptions): () => void {
  const context = canvas.getContext("2d");
  if (!context) return () => undefined;
  const { effect, device } = options;
  const speed = SPEED[effect.speed];
  // Older themes have no color settings: their defaults are "own colors, solid".
  const tintColor = effect.color ?? null;
  const tintStrength = (effect.tint ?? 100) / 100;
  const opacity = (effect.opacity ?? 100) / 100;
  const colors = effectColors(effect.preset, effect.presetColors);
  let sprites = spritesFor(effect.preset, colors).map((each) =>
    tintSprite(each, tintColor, tintStrength),
  );
  let width = 0;
  let height = 0;
  let particles: Particle[] = [];
  let frame = 0;
  let last = 0;
  let visible = true;
  let stopped = false;
  let time = 0;

  const random = (min: number, max: number) => min + Math.random() * (max - min);
  const pick = () => sprites[Math.floor(Math.random() * sprites.length)]!;

  function spawn(initial: boolean): Particle {
    const size = random(10, 22) * (device.isPhone ? 0.8 : 1);
    const preset = effect.preset;
    const rising = preset === "hearts";
    const twinkle = preset === "sparkles";
    return {
      x: random(0, width),
      y: twinkle || initial ? random(0, height) : rising ? height + size : -size,
      vx: random(-8, 8),
      vy: twinkle ? 0 : (rising ? -1 : 1) * random(18, 42) * speed,
      size: preset === "confetti" ? size * 1.2 : size,
      rotation: random(0, Math.PI * 2),
      spin: preset === "snow" || twinkle ? 0 : random(-1.6, 1.6) * speed,
      phase: random(0, Math.PI * 2),
      sprite: pick(),
      alpha: twinkle ? 0 : 1,
      life: 0,
      maxLife: twinkle ? random(1.5, 3.5) / speed : Infinity,
    };
  }

  let nextBurst = 0;

  function burst(sparks: number) {
    // One rocket: sparks fly out from a random point and fall with gravity. Every rocket is
    // its own size, reach and spot (Lucia, 2026-11-19: more often, more random).
    const x = random(width * 0.08, width * 0.92);
    const y = random(height * 0.1, height * 0.65);
    const color = pick();
    const reach = random(0.6, 1.25);
    for (let index = 0; index < sparks; index++) {
      const angle = (Math.PI * 2 * index) / sparks + random(-0.15, 0.15);
      const velocity = random(110, 230) * reach * speed;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: random(8, 15),
        rotation: 0,
        spin: 0,
        phase: 0,
        sprite: color,
        alpha: 1,
        life: 0,
        maxLife: random(1.1, 2.1),
      });
    }
  }

  const budget = () =>
    particleBudget({ width, height, density: effect.density, preset: effect.preset, device });

  function resize() {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    const ratio = pixelRatioCap(window.devicePixelRatio || 1, device);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (effect.preset !== "fireworks" && effect.preset !== "pride") {
      const count = budget();
      particles = particles.slice(0, count);
      while (particles.length < count) particles.push(spawn(true));
    }
    // Resizing clears the canvas; the static Pride wash is drawn again right away.
    if (effect.preset === "pride") drawPride();
  }

  function drawPride() {
    const gradient = context!.createLinearGradient(0, 0, width, height);
    colors.forEach(
      (color, index, list) => gradient.addColorStop(index / (list.length - 1), color),
    );
    // Static (Lucia, 2026-11-20: she liked it still): drawn once, redrawn only on resize.
    context!.clearRect(0, 0, width, height);
    context!.globalAlpha = 0.22 * opacity;
    context!.fillStyle = gradient;
    context!.fillRect(0, 0, width, height);
    context!.globalAlpha = 1;
  }

  function step(now: number) {
    frame = 0;
    if (stopped || !visible || document.hidden) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    time += dt;
    context!.clearRect(0, 0, width, height);

    if (effect.preset === "pride") {
      // Nothing moves: no next frame.
      drawPride();
      return;
    } else if (effect.preset === "fireworks") {
      const maxSparks = budget() * 5;
      // First rocket right away, then at random gaps (0.12-0.7 s), sometimes two or three
      // at once, while the spark cap allows.
      nextBurst -= dt * speed;
      if (nextBurst <= 0 || particles.length === 0) {
        const salvo = Math.random() < 0.25 ? Math.floor(random(2, 4)) : 1;
        for (let rocket = 0; rocket < salvo; rocket++) {
          const sparks = Math.round(random(14, 30));
          if (particles.length + sparks <= maxSparks) burst(sparks);
        }
        nextBurst = random(0.12, 0.7);
      }
      particles = particles.filter((particle) => particle.life < particle.maxLife);
    }

    for (const particle of particles) {
      particle.life += dt;
      if (effect.preset === "fireworks") {
        particle.vy += 70 * dt;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        // Stays bright, then fades fast at the end, like a real spark.
        particle.alpha = Math.max(0, 1 - (particle.life / particle.maxLife) ** 3);
      } else if (effect.preset === "sparkles") {
        particle.alpha = Math.sin((particle.life / particle.maxLife) * Math.PI);
        if (particle.life >= particle.maxLife) Object.assign(particle, spawn(true), { alpha: 0 });
      } else {
        particle.x += Math.sin(time * 0.8 + particle.phase) * 14 * dt;
        const outside =
          particle.vy > 0 ? particle.y > height + particle.size : particle.y < -particle.size;
        if (outside) Object.assign(particle, spawn(false));
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rotation += particle.spin * dt;

      context!.globalAlpha = particle.alpha * opacity;
      context!.save();
      context!.translate(particle.x, particle.y);
      context!.rotate(particle.rotation);
      context!.drawImage(
        particle.sprite,
        -particle.size / 2,
        -particle.size / 2,
        particle.size,
        particle.size,
      );
      context!.restore();
    }
    context!.globalAlpha = 1;
    schedule();
  }

  function schedule() {
    if (!frame && !stopped && visible && !document.hidden) frame = requestAnimationFrame(step);
  }

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    last = 0;
    schedule();
  });
  visibilityObserver.observe(canvas);
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  const onVisibility = () => {
    last = 0;
    schedule();
  };
  document.addEventListener("visibilitychange", onVisibility);

  if (effect.preset === "custom" && options.particleUrl) {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const ready = tintSprite(image, tintColor, tintStrength);
      sprites = [ready];
      for (const particle of particles) particle.sprite = ready;
    };
    image.src = options.particleUrl;
    sprites = [circle("rgba(255,255,255,0)")]; // invisible until the image arrives
  }

  resize();
  schedule();

  return () => {
    stopped = true;
    if (frame) cancelAnimationFrame(frame);
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    particles = [];
  };
}
