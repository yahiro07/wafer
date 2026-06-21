async function loadUnitElementClass(tagName: string, moduleUrl: string) {
  const unitElement = (await import(moduleUrl).then(
    (module) => module.default,
  )) as any;
  customElements.define(tagName, unitElement);
}

const cachedPromises = new Map<string, Promise<void>>();

export async function loadUnitElementClassCached(
  tagName: string,
  moduleUrl: string,
) {
  let promise = cachedPromises.get(tagName);
  if (!promise) {
    promise = loadUnitElementClass(tagName, moduleUrl);
    cachedPromises.set(tagName, promise);
  }
  await promise;
}
