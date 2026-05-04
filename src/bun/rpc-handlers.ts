import { Effect } from "effect";
import { DynamoClient, DynamoClientLive, makeDynamoClientLive } from "./services/DynamoClient";
import {
  CloudWatchLogsClient,
  CloudWatchLogsClientLive,
  LambdaClient,
  LambdaClientLive,
  makeCloudWatchLogsClientLive,
  makeLambdaClientLive,
} from "./services/AwsServiceClients";
import * as TableService from "./services/TableService";
import * as QueryService from "./services/QueryService";
import * as LambdaService from "./services/LambdaService";
import * as LogsService from "./services/LogsService";
import * as CacheService from "./services/CacheService";
import type { LogFetchParams, ScanParams, QueryParams } from "shared/schemas";

type AnyDynamoEffect<A> = Effect.Effect<A, unknown, DynamoClient>;
type AnyLambdaEffect<A> = Effect.Effect<A, unknown, LambdaClient>;
type AnyLogsEffect<A> = Effect.Effect<A, unknown, CloudWatchLogsClient>;

let currentClientLive = DynamoClientLive;
let currentLambdaLive = LambdaClientLive;
let currentLogsLive = CloudWatchLogsClientLive;

async function run<A>(effect: AnyDynamoEffect<A>): Promise<A> {
  try {
    return await Effect.runPromise(effect.pipe(Effect.provide(currentClientLive)));
  } catch (e: unknown) {
    const msg = extractRunError(e);
    throw new Error(msg);
  }
}

async function runLambda<A>(effect: AnyLambdaEffect<A>): Promise<A> {
  try {
    return await Effect.runPromise(effect.pipe(Effect.provide(currentLambdaLive)));
  } catch (e: unknown) {
    const msg = extractRunError(e);
    throw new Error(msg);
  }
}

async function runLogs<A>(effect: AnyLogsEffect<A>): Promise<A> {
  try {
    return await Effect.runPromise(effect.pipe(Effect.provide(currentLogsLive)));
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
  listFunctions: (_params: Record<string, never>) =>
    runLambda(LambdaService.listFunctions),
  describeFunction: (params: { functionName: string }) =>
    runLambda(LambdaService.describeFunction(params.functionName)),
  fetchLogEvents: (params: LogFetchParams) =>
    runLogs(LogsService.fetchLogEvents(params)),
  setRegion: (params: { region: string }) => {
    currentClientLive = makeDynamoClientLive({ region: params.region });
    currentLambdaLive = makeLambdaClientLive({ region: params.region });
    currentLogsLive = makeCloudWatchLogsClientLive({ region: params.region });
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
