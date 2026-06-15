import { CSSProperties } from "react";

export type FrameSize = { width: number; height: number };

export function mergeStyleWithFrameSize(
  style?: CSSProperties,
  size?: FrameSize,
): CSSProperties | undefined {
  if (!style && !size) return undefined;
  if (!size) return style;
  return {
    ...style,
    width: `${size.width}px`,
    height: `${size.height}px`,
  };
}
