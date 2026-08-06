import { defineConfig, presetUno } from "unocss";
export default defineConfig({
  presets: [presetUno()],
  shortcuts: {
    "flex-h": "flex",
    "flex-hs": "flex items-start",
    "flex-ha": "flex items-center",
    "flex-v": "flex flex-col",
    "flex-vl": "flex flex-col items-start",
    "flex-va": "flex flex-col items-center",
    "flex-c": "flex items-center justify-center",
    "flex-vc": "flex flex-col items-center justify-center",
    "absolute-full": "absolute inset-0",
  },
});
