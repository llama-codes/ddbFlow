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
      // Pre-bundled by Bun 1.3.11 (workaround: Electrobun 1.16.0 ships Bun 1.3.9
      // which has a bundler bug with effect / @aws-sdk packages).
      // Run `bun run bundle:bun` before `electrobun dev/build`.
      entrypoint: "prebuild/index.js",
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
