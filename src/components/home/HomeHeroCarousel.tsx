import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import logoMoon from "@/assets/logo-moon.png";
import logoSun from "@/assets/logo-sunshine.png";
import logoMen from "@/assets/logo-men.png";
import moodMoon from "@/assets/mood-moon.jpg";
import moodSun from "@/assets/mood-sunshine.jpg";
import moodMen from "@/assets/mood-men.jpg";

const SLIDES = [
  {
    to: "/moon",
    cta: "Shop Moon",
    image: moodMoon,
    logo: logoMoon,
    overlay: "linear-gradient(90deg, rgba(9,3,5,0.78) 0%, rgba(9,3,5,0.28) 45%, rgba(9,3,5,0.1) 100%)",
  },
  {
    to: "/sunshine",
    cta: "Shop Sunshine",
    image: moodSun,
    logo: logoSun,
    overlay: "linear-gradient(90deg, rgba(58,20,28,0.34) 0%, rgba(58,20,28,0.08) 46%, rgba(58,20,28,0.04) 100%)",
  },
  {
    to: "/men",
    cta: "Shop Men",
    image: moodMen,
    logo: logoMen,
    overlay: "linear-gradient(90deg, rgba(10,10,10,0.74) 0%, rgba(10,10,10,0.28) 45%, rgba(10,10,10,0.08) 100%)",
  },
] as const;

export function HomeHeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, 5000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative w-full overflow-hidden border-b-2 border-foreground">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {SLIDES.map((slide) => (
          <div key={slide.to} className="relative min-w-full">
            <div className="relative h-[360px] w-full sm:h-[440px] lg:h-[540px]">
              <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: slide.overlay }} />
              <div className="relative mx-auto flex h-full max-w-7xl items-end justify-between px-4 py-8 sm:py-10">
                <Link
                  to={slide.to}
                  className="rounded-full border-2 border-foreground bg-background px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-foreground shadow-[0_10px_24px_-16px_rgba(0,0,0,0.45)]"
                >
                  {slide.cta}
                </Link>
                <img
                  src={slide.logo}
                  alt=""
                  className="max-h-[170px] w-auto max-w-[52%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.28)] sm:max-h-[220px] lg:max-h-[270px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.to}
            onClick={() => setActive(index)}
            className={`h-2.5 rounded-full border border-foreground/40 transition ${
              active === index ? "w-8 bg-background" : "w-2.5 bg-background/55"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
