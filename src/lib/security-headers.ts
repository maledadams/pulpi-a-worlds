const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: https: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://www.googletagmanager.com",
  // GA4 posts its measurement hits to bare analytics.google.com, which a
  // *.analytics.google.com wildcard does NOT match - CSP wildcards cover
  // subdomains only, never the apex - so both spellings have to be listed.
  // gtag also mirrors hits to google.com and stats.g.doubleclick.net for
  // Google Signals; without those the console fills with CSP violations.
  "connect-src 'self' https://challenges.cloudflare.com https://*.cloudflareaccess.com https://cloudflareinsights.com https://www.googletagmanager.com https://google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.g.doubleclick.net https://www.google.com",
  "frame-src https://challenges.cloudflare.com https://www.google.com",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

export function withSecurityHeaders(response: Response) {
  if (import.meta.env.DEV) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
