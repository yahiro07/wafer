import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { unitLoaderPlugin } from "wafer-host/vite-plugin";
import { unitSourceUrls } from "./src/unit-source-urls.ts";

export default defineConfig({
  plugins: [
    react(),
    unitLoaderPlugin({ unitSourceUrls, cacheFolderPath: "../.wafer-cache" }),
  ],
});
