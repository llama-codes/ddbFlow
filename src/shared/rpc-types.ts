import type { RPCSchema } from "electrobun/view";

export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      ping: { params: Record<string, never>; response: string };
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
