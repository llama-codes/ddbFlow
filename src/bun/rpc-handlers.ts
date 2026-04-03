import { Effect } from "effect";
import { DynamoClient, DynamoClientLive } from "./services/DynamoClient";
import * as TableService from "./services/TableService";
import * as QueryService from "./services/QueryService";
import type { ScanParams, QueryParams } from "shared/schemas";

type AnyDynamoEffect<A> = Effect.Effect<A, unknown, DynamoClient>;

function run<A>(effect: AnyDynamoEffect<A>): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(DynamoClientLive)));
}

export const rpcRequestHandlers = {
  ping: () => "pong",
  listTables: (_params: Record<string, never>) => run(TableService.listTables),
  describeTable: (params: { tableName: string }) =>
    run(TableService.describeTable(params.tableName)),
  scan: (params: ScanParams) => run(QueryService.scan(params)),
  query: (params: QueryParams) => run(QueryService.query(params)),
};
