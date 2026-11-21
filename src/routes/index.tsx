import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeBanner, useHomeBanner } from "@/components/theme/HomeBanner";
import { HeroWaveTransition } from "@/components/collections/HeroWaveTransition";
import { useActiveTheme } from "@/context/theme";
import { HeroEffect } from "@/components/theme/HeroEffect";
import { ThemeImage, useThemeSlot } from "@/components/theme/ThemeImage";
import { slotClassName } from "@/lib/theme-slots";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { ProductCard } from "@/components/product/ProductCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useCatalogProducts } from "@/context/catalog";
import type { Product } from "@/data/products";
import { getStorefrontHomeCollections, getStorefrontSettings } from "@/lib/admin-content";
import { trackGenerateLead } from "@/lib/analytics";
import { checkBirthdaySubscriberExists, subscribeNewsletter } from "@/lib/public-forms";
import { buildFaqJsonLd, createSeoHead, SITE_DESCRIPTION } from "@/lib/seo";
import { STORE_FAQ } from "@/lib/store-faq";
import men1 from "@/assets/men 1.svg";
import men2 from "@/assets/men 2.svg";
import men3 from "@/assets/men 3.svg";
import moon1 from "@/assets/moon 1.svg";
import moon2 from "@/assets/moon 2.svg";
import moon3 from "@/assets/moon 3.svg";
import sunshine1 from "@/assets/sunshine 1.svg";
import sunshine2 from "@/assets/sunshine 2.svg";
import sunshine3 from "@/assets/sunshine 3.svg";
import partyHat from "@/assets/PARTYHAT.png";
import partyHatTwo from "@/assets/PARTYHAT2.png";
import cakeTwo from "@/assets/CAKE 2.png";
import cakeFour from "@/assets/CAKE 4.png";
import { collapseFamilies, familyMembers } from "@/lib/product-families";

export const Route = createFileRoute("/")({
  loader: async () => ({
    homeCollections: await getStorefrontHomeCollections(),
    settings: await getStorefrontSettings(),
  }),
  head: () => {
    const seo = createSeoHead({
      // Not "Inicio": the homepage title is the single strongest brand
      // signal on the site, and this is the page that should win brand
      // searches - spending it on the word "Home" wastes it.
      pageName: "Tienda de moda alternativa en República Dominicana",
      path: "/",
      description: SITE_DESCRIPTION,
    });
    return {
      ...seo,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildFaqJsonLd(STORE_FAQ)),
        },
      ],
    };
  },
  component: Home,
});


/** A store tile's stacked layers, or the one image a theme put in its place (slot home.storeTile.*). */
function StoreTileImages({ vibe }: { vibe: (typeof VIBES_EDITORIAL)[number] }) {
  const slot = `home.storeTile.${vibe.to.slice(1) as "moon" | "sunshine" | "men"}` as const;
  const render = useThemeSlot(slot, vibe.images[0]);
  if (render.kind === "hide") return null;
  if (render.kind === "replace") {
    return (
      <img
        src={render.src}
        alt={vibe.name}
        className={slotClassName(render, "absolute inset-[6%] h-[88%] w-[88%] object-contain")}
        style={render.style}
      />
    );
  }
  return (
    <>
      {vibe.images.map((image, index) => (
        <img
          key={image}
          src={image}
          alt={index === 2 ? vibe.name : ""}
          className="absolute inset-[6%] h-[88%] w-[88%] object-contain"
        />
      ))}
    </>
  );
}

const VIBES_EDITORIAL = [
  {
    to: "/moon" as const,
    name: "Moon",
    images: [moon1, moon2, moon3],
    // Each store's own colors for the phone buttons; a theme can change each one (Colores ›
    // Botones de tiendas).
    button:
      "bg-[color:var(--t-store-a-bg,#7b1832)] text-[color:var(--t-store-a-text,#fff5f8)] outline-[color:var(--t-store-a-outline,#ffffff)]",
  },
  {
    to: "/sunshine" as const,
    name: "Sunshine",
    images: [sunshine1, sunshine2, sunshine3],
    button:
      "bg-[color:var(--t-store-b-bg,#ff4ea3)] text-[color:var(--t-store-b-text,#ffffff)] outline-[color:var(--t-store-b-outline,#ffffff)]",
  },
  {
    to: "/men" as const,
    name: "Men",
    images: [men1, men2, men3],
    // Lucia (2026-11-20): Men's button is the gray of its logo's ring, not its red.
    button:
      "bg-[color:var(--t-store-c-bg,#615b5b)] text-[color:var(--t-store-c-text,#ffffff)] outline-[color:var(--t-store-c-outline,#ffffff)]",
  },
] as const;

function HomeRailSection({
  products,
  title,
}: {
  products: Product[];
  title: string;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!api) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }

    const sync = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    sync();
    api.on("select", sync);
    api.on("reInit", sync);

    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  if (products.length === 0) return null;

  return (
    <section className="pb-14">
      <div className="mb-6 px-4 xl:px-[5cm]">
        <h2 className="text-center text-3xl sm:text-left sm:text-2xl md:text-3xl" style={{ transform: "none" }}>
          {title}
        </h2>
      </div>

      <div className="px-4 xl:px-[5cm]">
        {/* relative wrapper sized to the carousel itself, not the outer
            padding - so "left-1/right-1" is always a small, consistent gap
            from the actual product row regardless of how wide the outer
            gutter is at any breakpoint, instead of drifting further from it
            as xl:px-[5cm] grows. */}
        <div className="relative">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              containScroll: "trimSnaps",
              slidesToScroll: 1,
            }}
          >
            {/* pt-1: room for the card's 3 px hover lift, so the row's clipping never cuts its
                top outline (Lucia, 2026-11-20). */}
            <CarouselContent className="pt-1">
              {products.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="basis-[60%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
                >
                  <ProductCard
                    product={product}
                    soldOutMode="standard"
                    showSubtitle={false}
                    tone="store"
                    boldOutline
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <button
            type="button"
            aria-label={`Anterior en ${title}`}
            disabled={!canScrollPrev}
            onClick={() => api?.scrollPrev()}
            className="ui-circle absolute -left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-background/90 disabled:hover:text-foreground sm:-left-4 md:-left-2 lg:-left-3 xl:-left-16"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={`Siguiente en ${title}`}
            disabled={!canScrollNext}
            onClick={() => api?.scrollNext()}
            className="ui-circle absolute -right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-background/90 disabled:hover:text-foreground sm:-right-4 md:-right-2 lg:-right-3 xl:-right-16"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Home() {
  const { homeCollections, settings } = Route.useLoaderData();
  const products = useCatalogProducts();
  const homeBanner = useHomeBanner();
  const activeTheme = useActiveTheme();
  const heroWave = activeTheme?.heroWave ?? null;
  const keepStorePicker = activeTheme?.keepStorePicker ?? false;
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [birthdayDate, setBirthdayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [birthdaySaved, setBirthdaySaved] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterTurnstileToken, setNewsletterTurnstileToken] = useState("");
  const [newsletterTurnstileVersion, setNewsletterTurnstileVersion] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pulpina_birthday_subscription");
      if (!raw) return;
      const saved = JSON.parse(raw) as { birthDate?: string; email?: string };
      if (saved.email) setNewsletterEmail(saved.email);
      if (saved.birthDate) setBirthdayDate(saved.birthDate);
      const hasLocalSave = Boolean(saved.email && saved.birthDate);
      setBirthdaySaved(hasLocalSave);

      if (hasLocalSave && saved.email) {
        void checkBirthdaySubscriberExists({ data: { email: saved.email } })
          .then((result) => {
            if (!result.exists) {
              localStorage.removeItem("pulpina_birthday_subscription");
              localStorage.removeItem("pulpina_birthday_token");
              setBirthdaySaved(false);
            }
          })
          .catch(() => {
            // If the check fails (offline, etc.) keep the local state as-is.
          });
      }
    } catch {
      // Invalid browser data is ignored and can be replaced by a new signup.
    }
  }, []);

  const homeSections = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return homeCollections
      .map((collection) => ({
        id: collection.id,
        title: collection.name,
        // One card per family: a listed mother lets her whole family compete
        // for the card; a listed sub-product shows that sub.
        products: collapseFamilies(
          collection.productIds
            .map((productId) => productMap.get(productId))
            .filter((product): product is Product => Boolean(product))
            .flatMap((product) => (product.motherId ? [product] : familyMembers(product, products))),
          products,
        ).slice(0, 12),
      }))
      .filter((section) => section.products.length > 0);
  }, [homeCollections, products]);
  const homeSelectionTitle = /^elige tu tienda$/i.test(settings.homeSelectionTitle.trim())
    ? "Elige tu Tienda"
    : settings.homeSelectionTitle;
  const birthdayTitle = /^descuento de cumpleanos$/i.test(settings.newsletterTitle.trim())
    ? "Descuento de Cumpleaños"
    : settings.newsletterTitle;

  return (
    <div>
      {/* The homepage had no h1 at all. It isn't visible because the hero's
          own heading is admin-editable copy ("Elige tu Tienda" today), and
          the site's primary heading shouldn't be something a settings edit
          can silently turn into anything - so the durable brand statement
          lives here and the hero keeps its editorial copy. */}
      <h1 className="sr-only">
        Pulpiña RD (Pulpina RD) - Tienda de moda alternativa en República Dominicana
      </h1>
      {homeBanner ? (
        // Banners (theme or promotion) replace the store picker (spec §5.3), unless the theme
        // keeps it: then they sit on top of it (Lucia, 2026-11-20).
        <HomeBanner banner={homeBanner} stacked={keepStorePicker} />
      ) : null}
      {!homeBanner || keepStorePicker ? (
      <section className="w-full px-4 pt-6 pb-10 md:pt-10 md:pb-14">
        {/* Shop by store (Lucia, 2026-11-20): a compact row like a clothing site's "shop by
            category", so products show sooner. Phone: a sideways swipe row (one store plus a
            peek of the next); desktop: the three side by side. Everything themes use stays the
            same: the card's color layers, the effect, the wave and the store-logo slots. */}
        <div
          className={`relative w-full overflow-hidden rounded-[2rem] px-5 py-8 sm:px-8 md:px-10 md:py-12 ${
            // A theme's wave covers the card's bottom edge: room so it never hides the link,
            // and no border, whose side lines used to show below the wave (Lucia, 2026-11-20).
            heroWave ? "pb-24 md:pb-28" : "border border-[#ebebeb]/10"
          }`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--t-hero-start)_0%,var(--t-hero-middle)_52%,var(--t-hero-end)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_50%,var(--t-hero-glow-left),transparent_24%),radial-gradient(circle_at_82%_50%,var(--t-hero-glow-right),transparent_24%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(var(--t-hero-edge-rgb,0,0,0),0.6)_0%,transparent_14%,transparent_86%,rgba(var(--t-hero-edge-rgb,0,0,0),0.62)_100%),linear-gradient(180deg,rgba(var(--t-hero-edge-rgb,0,0,0),0.42)_0%,transparent_18%,transparent_82%,rgba(var(--t-hero-edge-rgb,0,0,0),0.46)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--t-hero-edge-rgb,0,0,0),0.82),transparent_30%),radial-gradient(circle_at_top_right,rgba(var(--t-hero-edge-rgb,0,0,0),0.8),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(var(--t-hero-edge-rgb,0,0,0),0.76),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(var(--t-hero-edge-rgb,0,0,0),0.82),transparent_30%)]" />
          {/* Theme hero effect: above the backgrounds, below the title and tiles. */}
          <HeroEffect hero="home" />

          <div className="relative mb-6 text-center md:mb-10">
            <h2 className="text-3xl text-white md:text-5xl" style={{ transform: "none" }}>
              {homeSelectionTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/72">
              {settings.homeSelectionSubtitle}
            </p>
          </div>

          {/* Phones (Lucia, 2026-11-20): three big buttons, one per store, in its own color. */}
          <nav className="relative flex flex-col items-center gap-3 sm:hidden" aria-label="Tiendas">
            {VIBES_EDITORIAL.map((vibe) => (
              <Link
                key={vibe.to}
                to={vibe.to}
                // 2 px outline around the outside, white unless a theme changes it (Lucia,
                // 2026-11-21); outside, so the buttons keep their size.
                className={`flex w-full max-w-[19rem] items-center justify-center gap-2 py-4 text-lg font-black uppercase tracking-[0.22em] shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)] outline outline-2 outline-offset-0 transition-transform active:scale-[0.98] ${vibe.button}`}
              >
                {vibe.name}
                <ArrowRight className="h-5 w-5" />
              </Link>
            ))}
          </nav>
          <ul className="relative hidden sm:grid sm:grid-cols-3 sm:gap-8" aria-label="Tiendas">
            {VIBES_EDITORIAL.map((vibe) => (
              <li key={vibe.to}>
                <Link to={vibe.to} className="group block text-center" aria-label={vibe.name}>
                  <span className="relative mx-auto block aspect-square w-full max-w-[22rem] transition-transform duration-300 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]">
                    <StoreTileImages vibe={vibe} />
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 transition group-hover:text-white">
                    Ver {vibe.name}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="relative mt-6 flex justify-center md:mt-8">
            <Link
              to="/tienda"
              className="inline-flex items-center gap-2 text-sm font-normal text-white/54 transition hover:text-white/78"
            >
              <span>{settings.homeGeneralStoreCtaLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {heroWave ? (
            // The sub-stores' wave (Lucia, 2026-11-20): the card melts into the page below.
            <HeroWaveTransition
              lineColor={heroWave.line}
              fillColor={heroWave.fill}
              className="pointer-events-none absolute -bottom-px left-0 z-[5] h-[clamp(4.5rem,7vw,6.5rem)] w-full"
            />
          ) : null}
        </div>
      </section>
      ) : null}

      {homeSections.map((section) => (
        <HomeRailSection key={section.id} title={section.title} products={section.products} />
      ))}

      <section className="relative overflow-hidden border-y-2 border-foreground/15 bg-muted px-4 py-14 text-center">
        {/* No party hats on phones (Lucia, 2026-11-21): only the cakes there. */}
        <div className="relative z-10 flex items-center justify-center gap-3 lg:gap-6">
          <ThemeImage
            slot="home.birthday.cakeLeft"
            src={cakeTwo}
            alt=""
            aria-hidden="true"
            className="h-16 w-16 shrink-0 object-contain sm:hidden"
          />
          <ThemeImage
            slot="home.birthday.partyHatLeft"
            src={partyHat}
            alt=""
            aria-hidden="true"
            className="hidden h-20 w-20 shrink-0 -rotate-[16deg] object-contain sm:block lg:h-28 lg:w-28"
          />
          <h2 className="text-4xl md:text-6xl" style={{ transform: "none" }}>
            {birthdayTitle}
          </h2>
          <ThemeImage
            slot="home.birthday.partyHatRight"
            src={partyHatTwo}
            alt=""
            aria-hidden="true"
            className="hidden h-20 w-20 shrink-0 rotate-[16deg] object-contain sm:block lg:h-28 lg:w-28"
          />
          <ThemeImage
            slot="home.birthday.cakeRight"
            src={cakeFour}
            alt=""
            aria-hidden="true"
            className="h-16 w-16 shrink-0 object-contain sm:hidden"
          />
        </div>
        <p className="relative z-10 mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {settings.newsletterDescription}
        </p>
        <form
          className="relative z-10 mx-auto mt-5 grid max-w-2xl grid-cols-[0.85fr_1fr] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setNewsletterStatus("");
            setNewsletterSubmitting(true);

            void subscribeNewsletter({
              data: {
                birthDate: birthdayDate,
                email: newsletterEmail,
                turnstileToken: newsletterTurnstileToken,
              },
            })
              .then((result) => {
                setNewsletterStatus(result.message);
                if (result.ok) {
                  localStorage.setItem(
                    "pulpina_birthday_subscription",
                    JSON.stringify({ birthDate: birthdayDate, email: newsletterEmail.trim().toLowerCase() }),
                  );
                  if (result.token) {
                    localStorage.setItem(
                      "pulpina_birthday_token",
                      JSON.stringify({ email: newsletterEmail.trim().toLowerCase(), token: result.token }),
                    );
                  }
                  setBirthdaySaved(true);
                  setNewsletterTurnstileToken("");
                  trackGenerateLead("birthday_newsletter");
                }
              })
              .catch(() => {
                setNewsletterStatus("No se pudo validar la suscripcion ahora mismo.");
              })
              .finally(() => {
                setNewsletterSubmitting(false);
                setNewsletterTurnstileVersion((value) => value + 1);
              });
          }}
        >
          <input
            type="email"
            required
            value={newsletterEmail}
            placeholder="tu@correo.com"
            className="w-full min-w-0 rounded-full border-2 border-foreground/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground sm:px-4"
            onChange={(event) => {
              setNewsletterEmail(event.target.value);
              setBirthdaySaved(false);
            }}
          />
          <input
            type="date"
            required
            value={birthdayDate}
            aria-label="Fecha de cumpleaños"
            className="w-full min-w-0 rounded-full border-2 border-foreground/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground sm:px-4"
            onChange={(event) => {
              setBirthdayDate(event.target.value);
              setBirthdaySaved(false);
            }}
          />
          <button
            disabled={newsletterSubmitting || !newsletterTurnstileToken}
            className="col-span-2 rounded-full bg-[color:var(--t-btn-dark,var(--foreground))] px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-[color:var(--t-btn-dark-text,var(--background))] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1"
          >
            {newsletterSubmitting ? "Validando..." : "Suscribirme"}
          </button>
        </form>
        {birthdaySaved ? (
          <p className="relative z-10 mx-auto mt-3 max-w-md text-sm font-semibold text-emerald-700">
            Este navegador ya tiene tu cumpleaños guardado.
          </p>
        ) : null}
        <div className="relative z-10 mx-auto mt-3 max-w-sm">
          <TurnstileWidget
            key={newsletterTurnstileVersion}
            onTokenChange={setNewsletterTurnstileToken}
          />
        </div>
        {newsletterStatus ? (
          <p className="relative z-10 mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {newsletterStatus}
          </p>
        ) : null}
      </section>
    </div>
  );
}
