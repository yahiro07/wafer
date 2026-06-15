export type FrameSize = { width: number; height: number };
export type FrameSizeInput = FrameSize | [number, number] | string;

export function normalizeFrameSize(
  size: FrameSizeInput | undefined,
): FrameSize | undefined {
  if (Array.isArray(size)) {
    return { width: size[0], height: size[1] };
  } else if (typeof size === "string") {
    if (size.includes(",")) {
      const [width, height] = size.split(",").map((s) => Number(s.trim()));
      return { width, height };
    } else if (size.includes("x")) {
      const [width, height] = size.split("x").map((s) => Number(s.trim()));
      return { width, height };
    }
  } else if (typeof size === "object") {
    return size;
  }
  return undefined;
}
