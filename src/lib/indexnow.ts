import { SITE_URL } from "@/lib/seo";

/**
 * Daily IndexNow ping, run by cron at midnight Dominican time.
 *
 * IndexNow is how Bing - and through Bing, DuckDuckGo, Edge and Brave -
 * learns that URLs changed without waiting to re-crawl on its own schedule.
 * Google does not participate; its discovery still comes from the sitemap.
 *
 * This runs on a schedule rather than on every admin save on purpose: a
 * store that pings an external service on each edit is noisier for no gain,
 * and these engines don't reindex any faster for being told ten times a day.
 * One nightly submission of the whole catalog is what they actually want.
 */

const KEY = "670df4539793ad4825a8519210df0144";
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const BATCH_SIZE = 10000;

export async function submitSitemapToIndexNow() {
  const host = new URL(SITE_URL).hostname;

  const sitemapResponse = await fetch(`${SITE_URL}/sitemap.xml`);
  if (!sitemapResponse.ok) {
    console.error("[indexnow] sitemap fetch failed", sitemapResponse.status);
    return;
  }

  const xml = await sitemapResponse.text();
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  if (urlList.length === 0) {
    console.error("[indexnow] sitemap had no <loc> entries");
    return;
  }

  for (let index = 0; index < urlList.length; index += BATCH_SIZE) {
    const batch = urlList.slice(index, index + BATCH_SIZE);
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: KEY,
        keyLocation: `${SITE_URL}/${KEY}.txt`,
        urlList: batch,
      }),
    });

    console.log(`[indexnow] submitted ${batch.length} URLs -> ${response.status}`);
  }
}
