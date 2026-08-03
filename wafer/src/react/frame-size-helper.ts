export function extendFrameSizeToFillAspectRatio(
  frameSize: [number, number],
  aspectRatio: number,
): [number, number] {
  const [w, h] = frameSize;
  const originalAsr = w / h;
  if (aspectRatio > originalAsr) {
    return [h * aspectRatio, h];
  } else {
    return [w, w / aspectRatio];
  }
}
