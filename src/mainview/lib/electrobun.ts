import { Electroview } from "electrobun/view";
import type { AppRPC } from "shared/rpc-types";

const rpc = Electroview.defineRPC<AppRPC>({
  maxRequestTime: 30_000,
  handlers: {
    requests: {},
    messages: {},
  },
});

export const electroview = new Electroview({ rpc });
export { rpc };
