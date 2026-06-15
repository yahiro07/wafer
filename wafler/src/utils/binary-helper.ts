export const base64Helper = {
  encode(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  },
  decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  },
};

export function isUint8ArrayLike(value: unknown): value is Uint8Array {
  return (
    value instanceof Uint8Array ||
    (ArrayBuffer.isView(value) &&
      Object.prototype.toString.call(value) === "[object Uint8Array]")
  );
}

