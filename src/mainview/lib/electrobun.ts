import { Electroview } from "electrobun/view";
import type { AppRPC } from "shared/rpc-types";

const rpc = Electroview.defineRPC<AppRPC>({
  handlers: {
    requests: {},
    messages: {},
  },
});

export const electroview = new Electroview({ rpc });
export { rpc };
