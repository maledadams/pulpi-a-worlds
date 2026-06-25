import { useEffect, useRef } from "react";

type TurnstileWidgetApi = {
  remove: (widgetId: string) => void;
  render: (
    container: HTMLElement,
    options: {
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      sitekey: string;
      theme: "auto";
    },
  ) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidgetApi;
  }
}

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

async function loadTurnstileScript() {
  const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return existing;

  const script = document.createElement("script");
  script.id = TURNSTILE_SCRIPT_ID;
  script.async = true;
  script.defer = true;
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  document.head.appendChild(script);
  return script;
}

export function TurnstileWidget({
  onTokenChange,
}: {
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) {
      return;
    }

    let cancelled = false;
    let script: HTMLScriptElement | null = null;

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        callback: (token) => onTokenChange(token),
        "error-callback": () => onTokenChange(""),
        "expired-callback": () => onTokenChange(""),
        sitekey: TURNSTILE_SITE_KEY,
        theme: "auto",
      });
    };

    void loadTurnstileScript().then((loadedScript) => {
      if (cancelled) return;
      script = loadedScript;

      if (window.turnstile) {
        render();
        return;
      }

      script.addEventListener("load", render, { once: true });
    });

    return () => {
      cancelled = true;
      onTokenChange("");

      if (script) {
        script.removeEventListener("load", render);
      }

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onTokenChange]);

  if (!TURNSTILE_SITE_KEY) {
    return (
      <p className="text-xs text-muted-foreground">
        Turnstile no esta configurado. Define `VITE_TURNSTILE_SITE_KEY`.
      </p>
    );
  }

  return <div ref={containerRef} />;
}
