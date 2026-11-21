declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}

interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1Result<T>>>;
  exec(query: string): Promise<unknown>;
}

interface R2PutOptions {
  httpMetadata?: {
    contentType?: string;
  };
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody {
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  put(key: string, value: ArrayBuffer | ArrayBufferView | string | Blob, options?: R2PutOptions): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(keys: string | string[]): Promise<void>;
}

interface CacheStorage {
  readonly default: Cache;
}

// Workers' streaming HTML rewriter (only the parts this app uses).
interface HTMLRewriterElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): HTMLRewriterElement;
}

declare class HTMLRewriter {
  on(selector: string, handlers: { element?(element: HTMLRewriterElement): void }): HTMLRewriter;
  transform(response: Response): Response;
}
