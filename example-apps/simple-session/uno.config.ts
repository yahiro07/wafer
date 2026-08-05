import { defineConfig, presetUno } from "unocss";
export default defineConfig({
  presets: [presetUno()],
  shortcuts: [
    {
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
    // bd-[#888] → border border-solid border-[#888]
    // bd-red-500 → border border-solid border-red-500
    [/^bd-(.+)$/, ([, c]) => `border border-solid border-${c}`],
  ],
});
