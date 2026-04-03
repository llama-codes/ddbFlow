import type { RPCSchema } from "electrobun/view";
import type { TableInfo, ScanParams, QueryParams, QueryResult } from "./schemas";

export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      ping: { params: Record<string, never>; response: string };
      listTables: { params: Record<string, never>; response: string[] };
      setRegion: { params: { region: string }; response: string };
      describeTable: { params: { tableName: string }; response: TableInfo };
      scan: { params: ScanParams; response: QueryResult };
      query: { params: QueryParams; response: QueryResult };
      readCache: { params: { key: string }; response: string | null };
      writeCache: { params: { key: string; value: string }; response: string };
      deleteCache: { params: { key: string }; response: string };
      purgeCache: { params: Record<string, never>; response: string };
    };
    messages: {
      log: { msg: string };
    };
  }>;
  webview: RPCSchema<{
    requests: Record<string, never>;
    messages: Record<string, never>;
  }>;
};
