#!/usr/bin/env node
/**
 * Post-deploy smoke check: proves the live site is actually serving the build
 * that was just made, and that analytics can actually report.
 *
 * This exists because production silently served an Aug 1 build for six weeks.
 * `wrangler deploy` (no --env) targets the route-less `tanstack-start-app`
 * worker while pulpinastore.com is served by `tanstack-start-app-production`,
 * so every deploy "succeeded" and changed nothing. Nothing failed, nothing
 * logged, and the only symptom was GA4 quietly going empty. A deploy that
 * doesn't reach the domain has to be loud, so this runs as part of
 * `pnpm deploy:production` and exits non-zero the moment the live site stops
 * matching the local build.
 *
 *   node scripts/verify-deploy.mjs
 *   node scripts/verify-deploy.mjs --url https://pulpinastore.com
 */

import { readdirSync } from "node:fs";

const urlFlag = process.argv.indexOf("--url");
const ORIGIN = urlFlag !== -1 ? process.argv[urlFlag + 1] : "https://pulpinastore.com";
const GA_MEASUREMENT_ID = "G-N6LGC4Z2PN";
const LOCAL_ASSET_DIR = "dist/client/assets";

// Cloudflare sends Cache-Control: public, max-age=60 on storefront HTML, so a
// deploy checked immediately can still be served the previous response from an
// edge or proxy cache. Retry past that window rather than fail spuriously.
const attemptsFlag = process.argv.indexOf("--attempts");
const ATTEMPTS = attemptsFlag !== -1 ? Number(process.argv[attemptsFlag + 1]) : 6;
const RETRY_DELAY_MS = 15000;

const failures = [];
const check = (ok, label, detail) => {
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures.push(`${label}${detail ? ` - ${detail}` : ""}`);
  }
};

async function fetchLive() {
  // Cache-bust so we grade the worker's current output, not an edge copy.
  const response = await fetch(`${ORIGIN}/?deploy-check=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!response.ok) {
    throw new Error(`${ORIGIN} returned ${response.status} ${response.statusText}`);
  }
  return { html: await response.text(), csp: response.headers.get("content-security-policy") ?? "" };
}

function localBundles() {
  try {
    return new Set(readdirSync(LOCAL_ASSET_DIR).filter((name) => name.endsWith(".js")));
  } catch {
    return null;
  }
}

async function runChecks() {
  const { html, csp } = await fetchLive();
  const connectSrc = /connect-src([^;]*)/.exec(csp)?.[1] ?? "";
  const scriptSrc = /script-src([^;]*)/.exec(csp)?.[1] ?? "";

  // 1. Staleness. The SSR'd HTML references hashed client bundles; if the live
  // page names a bundle this build didn't produce, the domain is being served
  // by some other (older) worker - the exact failure this script exists for.
  const built = localBundles();
  const liveBundles = [...html.matchAll(/assets\/([A-Za-z0-9_.-]+\.js)/g)].map((m) => m[1]);
  if (!built) {
    check(false, "local build present", `${LOCAL_ASSET_DIR} missing - run the build first`);
  } else if (liveBundles.length === 0) {
    check(false, "live page references client bundles", "no assets/*.js found in HTML");
  } else {
    const strays = [...new Set(liveBundles)].filter((name) => !built.has(name));
    check(
      strays.length === 0,
      "live site serves THIS build",
      strays.length ? `live references bundles not in ${LOCAL_ASSET_DIR}: ${strays.join(", ")}` : "",
    );
  }

  // 2. The Google tag has to actually be in the page.
  check(html.includes(GA_MEASUREMENT_ID), "GA4 tag present in HTML", `${GA_MEASUREMENT_ID} not found`);
  check(html.includes("googletagmanager.com/gtag/js"), "gtag.js loader present in HTML");

  // 3. CSP has to let the tag load and let its hits leave the browser. The
  // apex analytics.google.com is listed separately on purpose: a CSP wildcard
  // covers subdomains only, so *.analytics.google.com does NOT match it, and
  // that single omission silently dropped every hit GA4 routed there.
  check(scriptSrc.includes("https://www.googletagmanager.com"), "CSP script-src allows gtag.js");
  check(connectSrc.includes("https://analytics.google.com"), "CSP connect-src allows analytics.google.com (apex)");
  check(connectSrc.includes("https://*.google-analytics.com"), "CSP connect-src allows *.google-analytics.com");

  return failures.length === 0;
}

for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  failures.length = 0;
  console.log(`\nVerifying ${ORIGIN} (attempt ${attempt}/${ATTEMPTS})`);

  let passed = false;
  try {
    passed = await runChecks();
  } catch (error) {
    console.log(`  FAIL  request failed - ${error.message}`);
    failures.push(error.message);
  }

  if (passed) {
    console.log("\nDeploy verified: live site is serving this build with analytics reporting.\n");
    process.exit(0);
  }

  if (attempt < ATTEMPTS) {
    console.log(`  ...retrying in ${RETRY_DELAY_MS / 1000}s (edge cache is max-age=60)`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
}

console.error("\nDEPLOY VERIFICATION FAILED\n");
for (const failure of failures) console.error(`  - ${failure}`);
console.error(
  "\nThe live site is NOT serving this build. Most likely the deploy went to the" +
    "\nwrong worker: pulpinastore.com is served by the `production` env, so the" +
    "\ndeploy must run as `wrangler deploy --env production`. Confirm with:" +
    "\n  npx wrangler deployments status --env production\n",
);
process.exit(1);
