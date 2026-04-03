import type { ElectrobunConfig } from "electrobun/bun";

export default {
  app: {
    name: "ddbFlow",
    identifier: "dev.ddbflow.app",
    version: "0.0.1",
  },
  build: {
    useAsar: true,
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    views: {},
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets/": "views/mainview/assets/",
    },
    watchIgnore: ["dist/**"],
    win: {
      bundleCEF: false,
    },
    mac: {
      bundleCEF: false,
      codesign: false,
      notarize: false,
    },
    linux: {
      bundleCEF: false,
    },
  },
  release: {
    baseUrl: "",
  },
} satisfies ElectrobunConfig;
