import { cacheGet, cacheSet } from "./cache";
import { CACHE_SAVED_QUERIES } from "./cache-keys";
import type { SortKeyOperator } from "./query-expression";
import type { TableInfo, KeySchemaElement } from "shared/schemas";

export interface SavedQuery {
  id: string;
  name: string;
  pkAttribute: string;
  pkValue?: string;
  skAttribute?: string;
  skOperator?: SortKeyOperator;
  skValue?: string;
  skValue2?: string; // for "between"
  scanIndexForward: boolean;
  createdAt: string;
}

export interface IndexMatch {
  indexValue: string; // "" for table primary, indexName for GSI/LSI
  keys: KeySchemaElement[];
}

export async function loadSavedQueries(): Promise<SavedQuery[]> {
  return (await cacheGet<SavedQuery[]>(CACHE_SAVED_QUERIES)) ?? [];
}

export async function persistSavedQueries(queries: SavedQuery[]): Promise<void> {
  await cacheSet(CACHE_SAVED_QUERIES, queries);
}

export function findCompatibleIndex(
  query: SavedQuery,
  tableInfo: TableInfo,
): IndexMatch | null {
  const candidates: { indexValue: string; keys: KeySchemaElement[] }[] = [
    { indexValue: "", keys: tableInfo.keys },
    ...tableInfo.gsis.map((g) => ({ indexValue: g.indexName, keys: g.keys })),
    ...tableInfo.lsis.map((l) => ({ indexValue: l.indexName, keys: l.keys })),
  ];

  for (const c of candidates) {
    const pk = c.keys.find((k) => k.keyType === "HASH");
    if (!pk || pk.attributeName !== query.pkAttribute) continue;

    if (query.skAttribute) {
      const sk = c.keys.find((k) => k.keyType === "RANGE");
      if (!sk || sk.attributeName !== query.skAttribute) continue;
    }

    return { indexValue: c.indexValue, keys: c.keys };
  }

  return null;
}

export function formatSavedQuerySummary(query: SavedQuery): string {
  let s = `${query.pkAttribute} = ${query.pkValue || "?"}`;
  if (query.skAttribute && query.skOperator && query.skValue) {
    if (query.skOperator === "begins_with") {
      s += `, ${query.skAttribute} begins_with ${query.skValue}`;
    } else if (query.skOperator === "between") {
      s += `, ${query.skAttribute} between ${query.skValue} and ${query.skValue2 || "?"}`;
    } else {
      s += `, ${query.skAttribute} ${query.skOperator} ${query.skValue}`;
    }
  }
  return s;
}

export interface CreateSavedQueryInput {
  name: string;
  pkAttribute: string;
  pkValue?: string;
  skAttribute?: string;
  skOperator?: SortKeyOperator;
  skValue?: string;
  skValue2?: string;
  scanIndexForward?: boolean;
}

export function createSavedQuery(input: CreateSavedQueryInput): SavedQuery {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: input.name,
    pkAttribute: input.pkAttribute,
    pkValue: input.pkValue || undefined,
    skAttribute: input.skAttribute,
    skOperator: input.skOperator,
    skValue: input.skValue || undefined,
    skValue2: input.skValue2 || undefined,
    scanIndexForward: input.scanIndexForward ?? true,
    createdAt: new Date().toISOString(),
  };
}
