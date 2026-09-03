/**
 * Pushes the site's URLs to IndexNow, which Bing, DuckDuckGo (Bing-backed),
 * Yandex, Seznam and Naver all consume. Google does NOT participate - Google
 * discovery still comes from the sitemap and normal crawling.
 *
 * This exists because the store was effectively invisible outside Google:
 * those engines had no fast path to learn a URL changed. Run it after adding
 * or renaming products.
 *
 * Deliberately a manual script, not a hook inside the admin save path: a
 * failing third-party POST should never be able to make saving a product
 * slower or flakier.
 *
 *   node scripts/submit-indexnow.mjs
 *   node scripts/submit-indexnow.mjs --dry-run
 */

const HOST = "pulpinastore.com";
const KEY = "670df4539793ad4825a8519210df0144";
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const BATCH_SIZE = 10000; // IndexNow's documented per-request ceiling.

const dryRun = process.argv.includes("--dry-run");

async function readSitemapUrls() {
  const response = await fetch(SITEMAP_URL);
  if (!response.ok) {
    throw new Error(`sitemap fetch failed: ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  if (urls.length === 0) {
    throw new Error("sitemap parsed but contained no <loc> entries");
  }
  return urls;
}

async function submit(urlList) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList,
    }),
  });

  // IndexNow answers 200/202 on success. 422 usually means the key file
  // isn't reachable yet - it has to be deployed before this will work.
  const body = await response.text();
  return { body: body.trim(), status: response.status };
}

const urls = await readSitemapUrls();
console.log(`sitemap: ${urls.length} URLs`);

if (dryRun) {
  console.log("dry run - nothing submitted");
  console.log(urls.slice(0, 10).join("\n"));
  process.exit(0);
}

for (let index = 0; index < urls.length; index += BATCH_SIZE) {
  const batch = urls.slice(index, index + BATCH_SIZE);
  const { body, status } = await submit(batch);
  console.log(`submitted ${batch.length} URLs -> HTTP ${status}${body ? ` ${body}` : ""}`);
  if (status >= 400) {
    console.error("IndexNow rejected the batch. Is the key file deployed and reachable?");
    console.error(`Expected at: https://${HOST}/${KEY}.txt`);
    process.exit(1);
  }
}

console.log("done");
