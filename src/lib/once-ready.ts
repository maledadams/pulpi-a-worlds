// One-time storage setup (CREATE TABLE IF NOT EXISTS, migrations, seeds) that
// is safe on Cloudflare Workers.
//
// Workers will not let a request await a promise that a different request
// created: if that other request ended (visitor navigated away, a sibling
// loader failed, the connection dropped) before the promise settled, every
// later request that awaits it fails with "This promise was created by a
// request that has since ended" until the isolate restarts - which took the
// whole store and admin down. So nothing pending is ever shared: only the
// fact that setup FINISHED is (a plain boolean). Until then each caller runs
// setup itself, which is fine because every setup is idempotent; it costs a
// few extra queries once, when an isolate starts cold.
export function onceReady<A extends unknown[]>(setup: (...args: A) => Promise<void>) {
  let done = false;
  return async (...args: A): Promise<void> => {
    if (done) return;
    await setup(...args);
    done = true;
  };
}
