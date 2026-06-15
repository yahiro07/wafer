import { defineConfig } from "tsdown";
export default defineConfig({
  format: ["esm"],
  dts: true,
  clean: true,
  outDir: "dist",
  entry: {
    "core/index": "src/core/index.ts",
    "react/index": "src/react/index.ts",
    "unit-types/index": "src/unit-types/index.ts",
    "unit-helper/index": "src/unit-helper/index.ts",
    "vite-plugin/index": "src/vite-plugin/index.ts",
  },
  deps: {
    neverBundle: ["vite", "postcss", "lightningcss"],
  },
});
