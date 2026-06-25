import { Suspense, lazy, useEffect, useState } from "react";

const Agentation = lazy(async () => {
  const module = await import("agentation");
  return { default: module.Agentation };
});

const DEFAULT_AGENTATION_ENDPOINT = "http://localhost:4747";
const AGENTATION_ENDPOINT =
  import.meta.env.VITE_AGENTATION_ENDPOINT?.trim() || DEFAULT_AGENTATION_ENDPOINT;

export function AgentationToolbar() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!import.meta.env.DEV || !isMounted) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Agentation
        endpoint={AGENTATION_ENDPOINT}
        copyToClipboard={false}
        onSessionCreated={(sessionId) => {
          console.info(`[agentation] session ready: ${sessionId}`);
        }}
      />
    </Suspense>
  );
}
