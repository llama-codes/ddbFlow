import {
  BrowserWindow,
  BrowserView,
  ApplicationMenu,
} from "electrobun/bun";
import type { AppRPC } from "shared/rpc-types";
import { rpcRequestHandlers } from "./rpc-handlers";

async function getMainViewUrl(): Promise<string> {
  try {
    const res = await fetch("http://localhost:5173");
    if (res.ok) {
      console.log("[main] Vite HMR server detected, using dev URL");
      return "http://localhost:5173";
    }
  } catch {
    // Vite not running, use bundled files
  }
  return "views://mainview/index.html";
}

ApplicationMenu.setApplicationMenu([
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  },
]);

const rpc = BrowserView.defineRPC<AppRPC>({
  maxRequestTime: 30_000,
  handlers: {
    requests: rpcRequestHandlers,
    messages: {
      log: ({ msg }) => {
        console.log("[webview]:", msg);
      },
    },
  },
});

const url = await getMainViewUrl();

const _window = new BrowserWindow({
  title: "ddbFlow",
  frame: { x: 100, y: 100, width: 1200, height: 800 },
  url,
  rpc,
});

console.log(`[main] Window created, loading: ${url}`);
