export const CACHE_REGION = "ddbflow:region";
export const CACHE_TABLES = "ddbflow:tables-cache";
export const CACHE_SCHEMA = (t: string) => `ddbflow:schema:${t}`;
export const CACHE_SCAN_PREFIX = (t: string) => `ddbflow:scan:${t}`;
export const CACHE_SCAN_SESSION = (t: string, ts: string) => `ddbflow:scan:${t}:${ts}`;
export const CACHE_QUERY_PREFIX = (t: string) => `ddbflow:query:${t}`;
export const CACHE_QUERY_SESSION = (t: string, ts: string) => `ddbflow:query:${t}:${ts}`;
export const CACHE_SCAN_LIMIT = "ddbflow:scan-limit";
export const CACHE_SAVED_QUERIES = "ddbflow:saved-queries";
export const CACHE_FAVORITE_TABLES = "ddbflow:favorite-tables";
export const DEFAULT_SCAN_LIMIT = 100;

export function sessionTimestamp(): string {
  return new Date().toISOString().replace(/:/g, "-");
}

export interface ScanSession {
  cacheKey: string;
  fetchedAt: string;
  itemCount: number;
}

export interface QuerySessionMeta {
  indexName?: string;
  pkAttribute: string;
  pkValue: string;
  skAttribute?: string;
  skOperator?: string;
  skValue?: string;
  skValue2?: string;
  direction: "asc" | "desc";
  filters?: import("./query-expression").FilterCondition[];
}

export interface QuerySession extends ScanSession {
  queryParams: QuerySessionMeta;
}
