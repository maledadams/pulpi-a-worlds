type TurnstileVerificationResult = {
  "error-codes"?: string[];
  success: boolean;
};

function getTurnstileSecret() {
  return typeof process !== "undefined" ? process.env.TURNSTILE_SECRET_KEY?.trim() ?? "" : "";
}

export async function verifyTurnstileToken({
  remoteIp,
  token,
}: {
  remoteIp?: string | null;
  token: string;
}) {
  const secret = getTurnstileSecret();
  if (import.meta.env.DEV && !secret) {
    return { skipped: true, success: true } as const;
  }

  if (!secret || !token.trim()) {
    return { skipped: false, success: false, errors: ["missing-input"] } as const;
  }

  // A siteverify hiccup used to throw straight out of the order handler and
  // the customer got a bare 500. Report it as a failed check instead so the
  // caller decides what to do.
  let payload: TurnstileVerificationResult;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        remoteip: remoteIp ?? undefined,
        response: token,
        secret,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return { skipped: false, success: false, errors: ["verification-request-failed"] } as const;
    }

    payload = (await response.json()) as TurnstileVerificationResult;
  } catch {
    return { skipped: false, success: false, errors: ["verification-request-failed"] } as const;
  }
  return {
    skipped: false,
    success: payload.success === true,
    errors: payload["error-codes"] ?? [],
  } as const;
}
