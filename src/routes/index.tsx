import { createFileRoute, Link } from "@tanstack/react-router";
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
import { subscribeNewsletter } from "@/lib/public-forms";
import men1 from "@/assets/men 1.svg";
import men2 from "@/assets/men 2.svg";
import men3 from "@/assets/men 3.svg";
import moon1 from "@/assets/moon 1.svg";
import moon2 from "@/assets/moon 2.svg";
import moon3 from "@/assets/moon 3.svg";
import sunshine1 from "@/assets/sunshine 1.svg";
import sunshine2 from "@/assets/sunshine 2.svg";
import sunshine3 from "@/assets/sunshine 3.svg";

export const Route = createFileRoute("/")({
  ssr: false,
  loader: async () => ({
    homeCollections: await getStorefrontHomeCollections(),
    settings: await getStorefrontSettings(),
  }),
  head: () => ({
    meta: [
      { title: "Pulpiña RD - Prendas de otro mundo" },
      {
        name: "description",
        content: "Tienda dominicana de moda alternativa. Vibes Moon, Sunshine y Men.",
      },
    ],
  }),
  component: Home,
});

const VIBES_EDITORIAL = [
  {
    to: "/moon" as const,
    name: "Moon",
    images: [moon1, moon2, moon3],
  },
  {
    to: "/sunshine" as const,
    name: "Sunshine",
    images: [sunshine1, sunshine2, sunshine3],
  },
  {
    to: "/men" as const,
    name: "Men",
    images: [men1, men2, men3],
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
    <section className="mx-auto max-w-7xl px-4 pb-14">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Anterior en ${title}`}
            disabled={!canScrollPrev}
            onClick={() => api?.scrollPrev()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/20 bg-background text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Siguiente en ${title}`}
            disabled={!canScrollNext}
            onClick={() => api?.scrollNext()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/20 bg-background text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          containScroll: "trimSnaps",
          dragFree: true,
        }}
      >
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-[74%] sm:basis-[42%] md:basis-[31%] lg:basis-[24%] xl:basis-[20%]"
            >
              <ProductCard
                product={product}
                soldOutMode="standard"
                showSubtitle={false}
                tone="store"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

function Home() {
  const { homeCollections, settings } = Route.useLoaderData();
  const products = useCatalogProducts();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterTurnstileToken, setNewsletterTurnstileToken] = useState("");
  const [newsletterTurnstileVersion, setNewsletterTurnstileVersion] = useState(0);

  const homeSections = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return homeCollections
      .map((collection) => ({
        id: collection.id,
        title: collection.name,
        products: collection.productIds
          .map((productId) => productMap.get(productId))
          .filter((product): product is Product => Boolean(product))
          .slice(0, 12),
      }))
      .filter((section) => section.products.length > 0);
  }, [homeCollections, products]);

  return (
    <div>
      <section className="flex min-h-[calc(100vh-4.75rem)] w-full items-start px-4 pt-10 pb-16 md:pb-20">
        <div
          className="relative w-full overflow-hidden rounded-[2rem] border border-[#f4e9df]/10 px-5 py-12 sm:px-8 md:px-10 md:py-14"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,7,8,0.99)_0%,rgba(14,14,15,0.98)_52%,rgba(22,22,24,0.98)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_50%,rgba(116,36,62,0.26),transparent_24%),radial-gradient(circle_at_82%_50%,rgba(146,146,152,0.2),transparent_24%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.6)_0%,transparent_14%,transparent_86%,rgba(0,0,0,0.62)_100%),linear-gradient(180deg,rgba(0,0,0,0.42)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.46)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.82),transparent_30%),radial-gradient(circle_at_top_right,rgba(0,0,0,0.8),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.76),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.82),transparent_30%)]" />

          <div className="relative mb-10 text-center md:mb-12">
            <h2 className="text-2xl text-white md:text-3xl">{settings.homeSelectionTitle}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/72">
              {settings.homeSelectionSubtitle}
            </p>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-3">
            {VIBES_EDITORIAL.map((vibe) => (
              <div key={vibe.to} className="text-center">
                <Link
                  to={vibe.to}
                  className="group relative mx-auto block aspect-square w-full max-w-[27.75rem] transition-transform duration-300 ease-out hover:scale-[1.04] focus-visible:scale-[1.04] md:max-w-[28.5rem]"
                  aria-label={vibe.name}
                >
                  {vibe.images.map((image, index) => (
                    <img
                      key={image}
                      src={image}
                      alt={index === 2 ? vibe.name : ""}
                      className="absolute inset-[6%] h-[88%] w-[88%] object-contain"
                    />
                  ))}
                </Link>
              </div>
            ))}
          </div>

          <div className="relative mt-8 flex justify-center md:mt-10">
            <Link
              to="/tienda"
              className="inline-flex items-center gap-2 text-sm font-normal text-white/54 transition hover:text-white/78"
            >
              <span>{settings.homeGeneralStoreCtaLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {homeSections.map((section) => (
        <HomeRailSection key={section.id} title={section.title} products={section.products} />
      ))}

      <section className="border-t border-[#c5f56a]/45 bg-muted/40 px-4 py-14 text-center">
        <h2 className="text-2xl md:text-3xl">{settings.newsletterTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {settings.newsletterDescription}
        </p>
        <form
          className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setNewsletterStatus("");
            setNewsletterSubmitting(true);

            void subscribeNewsletter({
              data: {
                email: newsletterEmail,
                turnstileToken: newsletterTurnstileToken,
              },
            })
              .then((result) => {
                setNewsletterStatus(result.message);
                if (result.ok) {
                  setNewsletterEmail("");
                  setNewsletterTurnstileToken("");
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
            className="flex-1 rounded-full border border-foreground/20 bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground"
            onChange={(event) => setNewsletterEmail(event.target.value)}
          />
          <button
            disabled={newsletterSubmitting || !newsletterTurnstileToken}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {newsletterSubmitting ? "Validando..." : "Suscribirme"}
          </button>
        </form>
        <div className="mx-auto mt-3 max-w-sm">
          <TurnstileWidget
            key={newsletterTurnstileVersion}
            onTokenChange={setNewsletterTurnstileToken}
          />
        </div>
        {newsletterStatus ? (
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {newsletterStatus}
          </p>
        ) : null}
      </section>
    </div>
  );
}
