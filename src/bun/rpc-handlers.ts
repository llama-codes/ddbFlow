import { Effect } from "effect";
import { DynamoClient, DynamoClientLive, makeDynamoClientLive } from "./services/DynamoClient";
import * as TableService from "./services/TableService";
import * as QueryService from "./services/QueryService";
import * as CacheService from "./services/CacheService";
import type { ScanParams, QueryParams } from "shared/schemas";

type AnyDynamoEffect<A> = Effect.Effect<A, unknown, DynamoClient>;

let currentClientLive = DynamoClientLive;

async function run<A>(effect: AnyDynamoEffect<A>): Promise<A> {
  try {
    return await Effect.runPromise(effect.pipe(Effect.provide(currentClientLive)));
  } catch (e: unknown) {
    const msg = extractRunError(e);
    throw new Error(msg);
  }
}

function extractRunError(e: unknown): string {
  if (e instanceof Error) {
    if (e.cause && typeof e.cause === "object") {
      const cause = e.cause as Record<string, unknown>;
      if (cause.cause instanceof Error) return cause.cause.message;
      if (typeof cause.cause === "object" && cause.cause !== null) {
        const inner = cause.cause as Record<string, unknown>;
        if (typeof inner.message === "string") return inner.message;
        if (typeof inner.name === "string") return inner.name;
      }
      if (typeof cause.message === "string") return cause.message;
      if (typeof cause._tag === "string") return cause._tag;
    }
    return e.message;
  }
  return String(e);
}

export const rpcRequestHandlers = {
  ping: () => "pong",
  listTables: (_params: Record<string, never>) => run(TableService.listTables),
  describeTable: (params: { tableName: string }) =>
    run(TableService.describeTable(params.tableName)),
  scan: (params: ScanParams) => run(QueryService.scan(params)),
  query: (params: QueryParams) => run(QueryService.query(params)),
  setRegion: (params: { region: string }) => {
    currentClientLive = makeDynamoClientLive({ region: params.region });
    console.log("[setRegion] switched to region:", params.region);
    return params.region;
  },
  readCache: (params: { key: string }) => CacheService.readCache(params.key),
  writeCache: (params: { key: string; value: string }) =>
    CacheService.writeCache(params.key, params.value).then(() => "ok"),
  deleteCache: (params: { key: string }) =>
    CacheService.deleteCache(params.key).then(() => "ok"),
  purgeCache: (_params: Record<string, never>) =>
    CacheService.purgeCache().then(() => "ok"),
  listCacheKeys: (params: { prefix: string }) =>
    CacheService.listCacheKeys(params.prefix),
};
