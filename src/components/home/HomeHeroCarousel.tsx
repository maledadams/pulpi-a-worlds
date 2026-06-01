import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import logoMoon from "@/assets/logo-moon.png";
import logoSun from "@/assets/logo-sunshine.png";
import logoMen from "@/assets/logo-men.png";

const SLIDES = [
  {
    key: "moon",
    logo: logoMoon,
    bg: "linear-gradient(135deg, #0a0408 0%, #2a0a14 50%, #5a1420 100%)",
  },
  {
    key: "sunshine",
    logo: logoSun,
    bg: "linear-gradient(135deg, #ff8fc9 0%, #ffe66a 55%, #c5f56a 100%)",
  },
  {
    key: "men",
    logo: logoMen,
    bg: "linear-gradient(135deg, #0a0a0a 0%, #1c1010 55%, #3a0808 100%)",
  },
] as const;

const INTERVAL = 5000;

export function HomeHeroCarousel() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((c) => (c + 1) % SLIDES.length);
    }, INTERVAL);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const goTo = (index: number) => {
    setActive(index);
    startTimer();
  };

  const prev = () => goTo((active - 1 + SLIDES.length) % SLIDES.length);
  const next = () => goTo((active + 1) % SLIDES.length);

  const arrowCls =
    "absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40 active:scale-95";

  return (
    <section className="relative w-full overflow-hidden border-b border-foreground/10">
      {/* Slides strip */}
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {SLIDES.map((slide) => (
          <div
            key={slide.key}
            className="relative min-w-full"
            style={{ background: slide.bg }}
          >
            <div className="relative flex h-[320px] w-full items-center justify-center sm:h-[400px] lg:h-[480px]">
              <img
                src={slide.logo}
                alt={slide.key}
                className="relative z-10 max-h-[200px] w-auto max-w-[55%] object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.35)] sm:max-h-[260px] lg:max-h-[310px]"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ← Arrow */}
      <button onClick={prev} className={`${arrowCls} left-3 sm:left-5`} aria-label="Anterior">
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* → Arrow */}
      <button onClick={next} className={`${arrowCls} right-3 sm:right-5`} aria-label="Siguiente">
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active === i ? "w-7 bg-white" : "w-1.5 bg-white/40 hover:bg-white/65"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
