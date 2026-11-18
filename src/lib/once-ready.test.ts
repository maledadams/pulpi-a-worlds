import { describe, expect, it } from "vitest";
import { onceReady } from "./once-ready";

describe("onceReady", () => {
  it("runs setup until it succeeds once, then never again", async () => {
    let calls = 0;
    const ensure = onceReady(async () => {
      calls += 1;
      if (calls === 1) throw new Error("D1 hiccup");
    });

    await expect(ensure()).rejects.toThrow("D1 hiccup");
    await ensure();
    await ensure();
    expect(calls).toBe(2);
  });

  it("never hands a caller a promise left over from another call", async () => {
    // A setup that never settles (its request was cut off) must not block the
    // next caller forever: nothing pending is ever shared.
    let calls = 0;
    const ensure = onceReady(async () => {
      calls += 1;
      if (calls === 1) await new Promise(() => {});
    });

    void ensure();
    await ensure();
    expect(calls).toBe(2);
  });
});
