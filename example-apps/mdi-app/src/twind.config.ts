import { defineConfig } from "@twind/core";
import presetTailwind from "@twind/preset-tailwind";

export default defineConfig({
  presets: [presetTailwind()],
  rules: [
    ["flex-h", "~(flex)"],
    ["flex-hs", "flex items-start"],
    ["flex-ha", "flex items-center"],
    ["flex-v", "flex flex-col"],
    ["flex-vl", "flex flex-col items-start"],
    ["flex-va", "flex flex-col items-center"],
    ["flex-c", "flex items-center justify-center"],
    ["flex-vc", "flex flex-col items-center justify-center"],
    ["absolute-full", "absolute inset-0"],
    //bd-[#888] / bd-red-500
    ["bd-", ({ $$ }) => `border border-solid border-${$$}`],
  ],
});
