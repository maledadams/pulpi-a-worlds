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
  });

  if (!response.ok) {
    return { skipped: false, success: false, errors: ["verification-request-failed"] } as const;
  }

  const payload = (await response.json()) as TurnstileVerificationResult;
  return {
    skipped: false,
    success: payload.success,
    errors: payload["error-codes"] ?? [],
  } as const;
}
