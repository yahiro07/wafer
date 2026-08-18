import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { unitLoaderPlugin } from "wafer-host/vite-plugin";
import { unitSourceUrls } from "./src/unit-source-urls.ts";
import UnoCSS from "unocss/vite";

export default defineConfig({
  plugins: [
    react(),
    UnoCSS(),
    unitLoaderPlugin({ unitSourceUrls, cacheFolderPath: "../.wafer-cache" }),
  ],
});
