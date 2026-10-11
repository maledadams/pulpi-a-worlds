import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

type TurnstileWidgetApi = {
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
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

export type TurnstileHandle = {
  // Resolves with a token the server will still accept: tokens expire after
  // 300s and are single-use, so a stale or already-sent one is replaced first.
  // Resolves "" when no token can be had (widget blocked, errored or still
  // waiting on a click after the timeout) - callers must not hang on it.
  getToken: (options?: { forceNew?: boolean }) => Promise<string>;
};

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
// Turnstile tokens live 300s; refresh a bit early to cover clock skew and the
// request round trip. Phones freeze timers in background tabs, so the widget's
// own auto-refresh can't be trusted to have run.
const TOKEN_MAX_AGE_MS = 240_000;
const FRESH_TOKEN_TIMEOUT_MS = 12_000;

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
  ref,
}: {
  onTokenChange: (token: string) => void;
  ref?: Ref<TurnstileHandle>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef({ value: "", issuedAt: 0 });
  const waitersRef = useRef<Array<(token: string) => void>>([]);
  const onTokenChangeRef = useRef(onTokenChange);
  onTokenChangeRef.current = onTokenChange;

  const resolveWaiters = (value: string) => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    waiters.forEach((resolve) => resolve(value));
  };

  const setToken = (value: string) => {
    tokenRef.current = { value, issuedAt: value ? Date.now() : 0 };
    onTokenChangeRef.current(value);
    if (value) resolveWaiters(value);
  };

  useImperativeHandle(ref, () => ({
    getToken: ({ forceNew = false } = {}) => {
      if (!TURNSTILE_SITE_KEY) return Promise.resolve("");

      const { value, issuedAt } = tokenRef.current;
      if (!forceNew && value && Date.now() - issuedAt < TOKEN_MAX_AGE_MS) {
        // Single-use: hand it out once. No reset here - resetting right after
        // reading the token could void it before the server checked it, and
        // the form remounts the widget after every submit anyway.
        tokenRef.current = { value: "", issuedAt: 0 };
        return Promise.resolve(value);
      }

      return new Promise<string>((resolve) => {
        const timer = window.setTimeout(() => {
          waitersRef.current = waitersRef.current.filter((entry) => entry !== done);
          resolve("");
        }, FRESH_TOKEN_TIMEOUT_MS);
        const done = (token: string) => {
          window.clearTimeout(timer);
          // Consume it like above so a second submit can't reuse it.
          tokenRef.current = { value: "", issuedAt: 0 };
          resolve(token);
        };
        waitersRef.current.push(done);
        // Only restart the widget when the token we hold is stale or was
        // rejected. With no token yet it is mid-challenge (or waiting on a
        // click); a reset would just throw that progress away.
        const mustReset = forceNew || Boolean(value);
        tokenRef.current = { value: "", issuedAt: 0 };
        if (mustReset && widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      });
    },
  }));

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
        callback: (token) => setToken(token),
        "error-callback": () => {
          setToken("");
          // Don't keep a submit waiting on a widget that just failed.
          resolveWaiters("");
        },
        "expired-callback": () => setToken(""),
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

    // Coming back to the tab on a phone: if the token went stale while the
    // page was frozen, get a new one now instead of at submit time.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const { value, issuedAt } = tokenRef.current;
      if (value && Date.now() - issuedAt >= TOKEN_MAX_AGE_MS && widgetIdRef.current && window.turnstile) {
        setToken("");
        window.turnstile.reset(widgetIdRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      onTokenChangeRef.current("");

      if (script) {
        script.removeEventListener("load", render);
      }

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) {
    return (
      <p className="text-xs text-muted-foreground">
        Turnstile no esta configurado. Define `VITE_TURNSTILE_SITE_KEY`.
      </p>
    );
  }

  return <div ref={containerRef} />;
}
